import "server-only";

import crypto from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { verifyFirebaseIdToken } from "@/lib/auth/firebase-token";
import { getAdminDb } from "@/lib/firebase/admin";
import { firestorePaths } from "@/lib/firebase/paths";
import { ownerClaimService, type OwnerClaimLookup } from "@/lib/claims/owner-claim-service";
import { revalidatePublicListing } from "@/lib/public/public-listing-cache";
import type { OwnerClaimToken } from "@/types/domain";
import type { WhatsAppProvider } from "@/lib/whatsapp/whatsapp-provider";

export type BrokerVerificationStartResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export type BrokerVerificationCompleteResult =
  | { ok: true; redirectTo: string }
  | { ok: false; message: string };

export class BrokerVerificationService {
  constructor(
    private readonly deps: {
      sendOtp?: (phone: string, otp: string) => Promise<void>;
    } = {},
  ) {}

  async start(token: string, formData: FormData): Promise<BrokerVerificationStartResult> {
    const lookup = await ownerClaimService.lookup(token);
    if (lookup.status !== "ready") return { ok: false, message: statusMessage(lookup.status) };

    const name = String(formData.get("name") ?? "").trim();
    const occupation = String(formData.get("occupation") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const confirmedOwnership = formData.get("confirmedOwnership") === "on";
    const whatsappTransactionalConsent = formData.get("whatsappTransactionalConsent") === "on";
    const termsAccepted = formData.get("termsAccepted") === "on";

    if (name.length < 2) return { ok: false, message: "Please enter your name." };
    if (occupation.length < 2) return { ok: false, message: "Please enter your occupation." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: "Please enter a valid email." };
    if (password.length < 8) return { ok: false, message: "Password must be at least 8 characters." };
    if (!confirmedOwnership) return { ok: false, message: "Please confirm that you are authorised to list this property." };
    if (!whatsappTransactionalConsent) return { ok: false, message: "Please allow WhatsApp OTP and listing updates." };
    if (!termsAccepted) return { ok: false, message: "Please accept the Terms, Privacy Policy, and DPDP notice." };

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const now = new Date().toISOString();
    await getAdminDb().doc(firestorePaths.ownerClaimToken(token)).set(
      {
        otpHash: hashOtp(otp),
        otpExpiresAt: expiresAt,
        pendingBroker: {
          name,
          occupation,
          email,
          consent: {
            brokerVerification: true,
            whatsappTransactional: true,
            termsAccepted: true,
            version: "broker-verification-v1",
            acceptedAt: now,
          },
        },
        updatedAt: now,
      },
      { merge: true },
    );

    await this.sendOtp(lookup.token.phone, otp);
    return { ok: true, message: "OTP sent on WhatsApp." };
  }

  async complete(token: string, otp: string, idToken: string): Promise<BrokerVerificationCompleteResult> {
    const lookup = await ownerClaimService.lookup(token);
    if (lookup.status !== "ready") return { ok: false, message: statusMessage(lookup.status) };

    const tokenDoc = await getAdminDb().doc(firestorePaths.ownerClaimToken(token)).get();
    const tokenData = tokenDoc.data() as
      | (OwnerClaimToken & {
          otpHash?: string;
          otpExpiresAt?: string;
          pendingBroker?: {
            name?: string;
            occupation?: string;
            email?: string;
            consent?: {
              brokerVerification: boolean;
              whatsappTransactional: boolean;
              termsAccepted: boolean;
              version: string;
              acceptedAt: string;
            };
          };
        })
      | undefined;

    if (!tokenData?.otpHash || !tokenData.otpExpiresAt || !tokenData.pendingBroker) {
      return { ok: false, message: "Please request an OTP first." };
    }
    if (new Date(tokenData.otpExpiresAt).getTime() < Date.now()) {
      return { ok: false, message: "OTP expired. Please request a new one." };
    }
    if (hashOtp(otp) !== tokenData.otpHash) {
      return { ok: false, message: "Invalid OTP." };
    }

    const broker = tokenData.pendingBroker;
    if (!broker.email || !broker.name || !broker.occupation) {
      return { ok: false, message: "Verification details are incomplete. Please start again." };
    }

    const verifiedToken = await verifyFirebaseIdToken(idToken);
    if (!verifiedToken) return { ok: false, message: "Unable to verify your sign-in. Please try again." };
    if (verifiedToken.email.toLowerCase() !== broker.email.toLowerCase()) {
      return { ok: false, message: "Please sign in with the same email used for verification." };
    }

    await this.upsertBrokerUserRecord({
      uid: verifiedToken.uid,
      workspaceId: lookup.token.workspaceId,
      email: verifiedToken.email,
      name: broker.name,
    });
    await this.upsertBrokerWorkspaceDetails({
      workspaceId: lookup.token.workspaceId,
      name: broker.name,
      email: broker.email,
      phone: lookup.token.phone,
    });
    await ownerClaimService.claim(token, claimFormData({
      name: broker.name,
      occupation: broker.occupation,
      email: broker.email,
      consent: broker.consent,
    }));
    await getAdminDb().doc(firestorePaths.ownerClaimToken(token)).set(
      {
        otpHash: FieldValue.delete(),
        otpExpiresAt: FieldValue.delete(),
        pendingBroker: FieldValue.delete(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
    revalidatePublicListing(lookup.listing);

    return {
      ok: true,
      redirectTo: `/l/${lookup.listing.slug}?verified=1`,
    };
  }

  private async upsertBrokerUserRecord({
    uid,
    workspaceId,
    email,
    name,
  }: {
    uid: string;
    workspaceId: string;
    email: string;
    name: string;
  }) {
    const now = new Date().toISOString();
    await getAdminDb().doc(firestorePaths.user(uid)).set(
      {
        id: uid,
        name,
        email,
        role: "broker_owner",
        workspaceId,
        status: "active",
        updatedAt: now,
        createdAt: now,
      },
      { merge: true },
    );
    await getAdminDb().doc(firestorePaths.workspaceMember(workspaceId, uid)).set(
      {
        id: uid,
        userId: uid,
        workspaceId,
        role: "broker_owner",
        status: "active",
        updatedAt: now,
        createdAt: now,
      },
      { merge: true },
    );
    return uid;
  }

  private async upsertBrokerWorkspaceDetails({
    workspaceId,
    name,
    email,
    phone,
  }: {
    workspaceId: string;
    name: string;
    email: string;
    phone: string;
  }) {
    await getAdminDb().doc(firestorePaths.workspace(workspaceId)).set(
      {
        name,
        contactName: name,
        contactEmail: email,
        contactPhone: phone,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  }

  private async sendOtp(phone: string, otp: string) {
    if (this.deps.sendOtp) return this.deps.sendOtp(phone, otp);
    const { createWhatsAppProvider } = await import("@/lib/whatsapp/providers/provider-factory");
    const provider: WhatsAppProvider = createWhatsAppProvider();
    await provider.sendTextMessage(phone, `Your therealestatelink verification OTP is ${otp}. It expires in 10 minutes.`);
  }
}

export const brokerVerificationService = new BrokerVerificationService();

function claimFormData(input: {
  name: string;
  occupation: string;
  email: string;
  consent?: {
    brokerVerification: boolean;
    whatsappTransactional: boolean;
    termsAccepted: boolean;
    version: string;
    acceptedAt: string;
  };
}) {
  const formData = new FormData();
  formData.set("name", input.name);
  formData.set("occupation", input.occupation);
  formData.set("email", input.email);
  formData.set("confirmedOwnership", "on");
  formData.set("whatsappTransactionalConsent", input.consent?.whatsappTransactional ? "on" : "on");
  formData.set("termsAccepted", input.consent?.termsAccepted ? "on" : "on");
  if (input.consent) formData.set("consent", JSON.stringify(input.consent));
  return formData;
}

function statusMessage(status: OwnerClaimLookup["status"]) {
  if (status === "claimed") return "This property is already verified.";
  if (status === "expired") return "This verification link has expired.";
  return "Verification is unavailable for this listing.";
}

function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}

function hashOtp(otp: string) {
  return crypto.createHash("sha256").update(otp.trim()).digest("hex");
}
