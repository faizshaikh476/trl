import "server-only";

import crypto from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { firestorePaths } from "@/lib/firebase/paths";
import type { Listing, OwnerClaimToken, OwnerProfile } from "@/types/domain";
import { ownerProfileService, maskPhoneNumber } from "@/lib/owners/owner-profile-service";

const claimInputSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name."),
  occupation: z.string().trim().min(2, "Please enter your occupation."),
  email: z
    .string()
    .trim()
    .transform((value) => value.toLowerCase())
    .pipe(z.email("Please enter a valid email.").or(z.literal(""))),
  confirmedOwnership: z.literal("on", {
    error: "Please confirm that you own or are authorised to list this property.",
  }),
  whatsappTransactionalConsent: z.literal("on", {
    error: "Please allow WhatsApp OTP and listing updates.",
  }),
  termsAccepted: z.literal("on", {
    error: "Please accept the Terms, Privacy Policy, and DPDP notice.",
  }),
});

export type OwnerClaimLookup =
  | {
      status: "ready";
      token: OwnerClaimToken;
      listing: Listing;
      ownerProfile: OwnerProfile;
      maskedPhone: string;
    }
  | {
      status: "invalid" | "expired" | "claimed" | "missing_listing";
      token?: OwnerClaimToken;
      listing?: Listing | null;
      ownerProfile?: OwnerProfile | null;
      maskedPhone?: string;
    };

export class OwnerClaimService {
  async createListingClaim({
    workspaceId,
    listingId,
    ownerProfileId,
    phone,
  }: {
    workspaceId: string;
    listingId: string;
    ownerProfileId: string;
    phone: string;
  }) {
    const db = getAdminDb();
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 14);
    const token = crypto.randomBytes(24).toString("base64url");
    const tokenRecord: OwnerClaimToken = {
      id: token,
      workspaceId,
      listingId,
      ownerProfileId,
      phone,
      status: "pending",
      expiresAt: expiresAt.toISOString(),
      claimedAt: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await db.doc(firestorePaths.ownerClaimToken(token)).set(tokenRecord);
    await db.doc(firestorePaths.workspaceListing(workspaceId, listingId)).update({
      ownerProfileId,
      ownerPhone: phone,
      ownerClaimStatus: "claim_sent",
      ownerClaimedAt: null,
      updatedAt: now.toISOString(),
    });

    return {
      token,
      claimPath: `/claim/${token}`,
      claimUrl: `${getPublicBaseUrl()}/claim/${token}`,
      expiresAt: tokenRecord.expiresAt,
    };
  }

  async markListingClaimedForVerifiedProfile({
    workspaceId,
    listingId,
    ownerProfileId,
    phone,
  }: {
    workspaceId: string;
    listingId: string;
    ownerProfileId: string;
    phone: string;
  }) {
    const now = new Date().toISOString();
    await Promise.all([
      getAdminDb().doc(firestorePaths.workspaceOwnerProfile(workspaceId, ownerProfileId)).set(
        {
          status: "verified",
          claimedListingIds: FieldValue.arrayUnion(listingId),
          updatedAt: now,
        },
        { merge: true },
      ),
      getAdminDb().doc(firestorePaths.workspaceListing(workspaceId, listingId)).update({
        ownerProfileId,
        ownerPhone: phone,
        ownerClaimStatus: "claimed",
        ownerClaimedAt: now,
        updatedAt: now,
      }),
    ]);
  }

  async lookup(token: string): Promise<OwnerClaimLookup> {
    if (!token) return { status: "invalid" };

    const db = getAdminDb();
    const tokenDoc = await db.doc(firestorePaths.ownerClaimToken(token)).get();
    if (!tokenDoc.exists) return { status: "invalid" };

    const tokenRecord = { id: tokenDoc.id, ...tokenDoc.data() } as OwnerClaimToken;
    const [listingDoc, ownerDoc] = await Promise.all([
      db.doc(firestorePaths.workspaceListing(tokenRecord.workspaceId, tokenRecord.listingId)).get(),
      db
        .doc(firestorePaths.workspaceOwnerProfile(tokenRecord.workspaceId, tokenRecord.ownerProfileId))
        .get(),
    ]);

    const listing = listingDoc.exists
      ? ({ id: listingDoc.id, ...listingDoc.data() } as Listing)
      : null;
    const ownerProfile = ownerDoc.exists
      ? ({ id: ownerDoc.id, ...ownerDoc.data() } as OwnerProfile)
      : null;
    const maskedPhone = maskPhoneNumber(tokenRecord.phone);

    if (tokenRecord.status === "claimed") {
      return { status: "claimed", token: tokenRecord, listing, ownerProfile, maskedPhone };
    }
    if (new Date(tokenRecord.expiresAt).getTime() < Date.now()) {
      await tokenDoc.ref.update({
        status: "expired",
        updatedAt: new Date().toISOString(),
      });
      return { status: "expired", token: tokenRecord, listing, ownerProfile, maskedPhone };
    }
    if (!listing || !ownerProfile) {
      return { status: "missing_listing", token: tokenRecord, listing, ownerProfile, maskedPhone };
    }

    return { status: "ready", token: tokenRecord, listing, ownerProfile, maskedPhone };
  }

  async findPendingForListing(workspaceId: string, listingId: string): Promise<OwnerClaimLookup | null> {
    const snapshot = await getAdminDb()
      .collection("ownerClaimTokens")
      .where("listingId", "==", listingId)
      .limit(10)
      .get();

    const token = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }) as OwnerClaimToken)
      .find((record) => record.workspaceId === workspaceId && record.status === "pending");

    return token ? this.lookup(token.id) : null;
  }

  async claim(token: string, formData: FormData) {
    const parsed = claimInputSchema.safeParse({
      name: formData.get("name"),
      occupation: formData.get("occupation"),
      email: formData.get("email") ?? "",
      confirmedOwnership: formData.get("confirmedOwnership"),
      whatsappTransactionalConsent: formData.get("whatsappTransactionalConsent"),
      termsAccepted: formData.get("termsAccepted"),
    });

    if (!parsed.success) {
      return {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Please check the details and try again.",
      };
    }

    const lookup = await this.lookup(token);
    if (lookup.status !== "ready") {
      return {
        ok: false,
        message: claimStatusMessage(lookup.status),
      };
    }

    const now = new Date().toISOString();
    const { name, occupation, email } = parsed.data;
    const consent = parseConsent(formData.get("consent"), now);
    await Promise.all([
      ownerProfileService.addClaimedListing({
        workspaceId: lookup.token.workspaceId,
        ownerProfileId: lookup.token.ownerProfileId,
        listingId: lookup.token.listingId,
        name,
        occupation,
        email,
        consent,
      }),
      getAdminDb().doc(firestorePaths.ownerClaimToken(token)).update({
        status: "claimed",
        claimedAt: now,
        updatedAt: now,
      }),
      getAdminDb()
        .doc(firestorePaths.workspaceListing(lookup.token.workspaceId, lookup.token.listingId))
        .update({
          ownerClaimStatus: "claimed",
          ownerClaimedAt: now,
          updatedAt: now,
        }),
    ]);

    return { ok: true, message: "Broker details verified." };
  }
}

export const ownerClaimService = new OwnerClaimService();

function parseConsent(raw: FormDataEntryValue | null, now: string) {
  if (typeof raw === "string" && raw) {
    try {
      const parsed = JSON.parse(raw) as {
        brokerVerification?: boolean;
        whatsappTransactional?: boolean;
        termsAccepted?: boolean;
        version?: string;
        acceptedAt?: string;
      };
      return {
        brokerVerification: parsed.brokerVerification === true,
        whatsappTransactional: parsed.whatsappTransactional === true,
        termsAccepted: parsed.termsAccepted === true,
        version: parsed.version || "broker-verification-v1",
        acceptedAt: parsed.acceptedAt || now,
      };
    } catch {
      // Fall through to the standard claim consent below.
    }
  }

  return {
    brokerVerification: true,
    whatsappTransactional: true,
    termsAccepted: true,
    version: "owner-claim-v1",
    acceptedAt: now,
  };
}

export function getPublicBaseUrl() {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:3000";
  const withProtocol = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/+$/, "");
}

function claimStatusMessage(status: OwnerClaimLookup["status"]) {
  if (status === "expired") return "This claim link has expired. Please ask the broker for a new link.";
  if (status === "claimed") return "This property has already been claimed.";
  if (status === "missing_listing") return "This claim link is missing its listing record.";
  return "This claim link is invalid.";
}
