import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { firestorePaths } from "@/lib/firebase/paths";
import type { OwnerProfile } from "@/types/domain";

export function normalizePhoneNumber(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length > 10 && digits.startsWith("0")) return digits.replace(/^0+/, "");
  return digits;
}

export function ownerProfileIdForPhone(input: string) {
  const phone = normalizePhoneNumber(input);
  if (!phone) throw new Error("Owner phone number is required.");
  return `owner_${phone}`;
}

export function maskPhoneNumber(input: string) {
  const phone = normalizePhoneNumber(input);
  if (phone.length <= 4) return phone;
  return `${"*".repeat(Math.max(phone.length - 4, 0))}${phone.slice(-4)}`;
}

export class OwnerProfileService {
  async findById(workspaceId: string, ownerProfileId: string) {
    const snapshot = await getAdminDb()
      .doc(firestorePaths.workspaceOwnerProfile(workspaceId, ownerProfileId))
      .get();
    if (!snapshot.exists) return null;
    return { id: snapshot.id, ...snapshot.data() } as OwnerProfile;
  }

  async upsertFromWhatsApp({
    workspaceId,
    phone,
    listingId,
  }: {
    workspaceId: string;
    phone: string;
    listingId: string;
  }) {
    const normalizedPhone = normalizePhoneNumber(phone);
    const ownerProfileId = ownerProfileIdForPhone(normalizedPhone);
    const now = new Date().toISOString();
    const ref = getAdminDb().doc(firestorePaths.workspaceOwnerProfile(workspaceId, ownerProfileId));
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      const profile: OwnerProfile = {
        id: ownerProfileId,
        workspaceId,
        phone: normalizedPhone,
        displayPhone: phone.trim() || normalizedPhone,
        name: "",
        occupation: "",
        email: "",
        status: "unverified",
        source: "whatsapp",
        createdFromListingId: listingId,
        claimedListingIds: [],
        verifiedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      await ref.set(profile);
      return profile;
    }

    await ref.update({
      phone: normalizedPhone,
      displayPhone: phone.trim() || normalizedPhone,
      updatedAt: now,
    });

    return {
      id: snapshot.id,
      ...snapshot.data(),
      phone: normalizedPhone,
      displayPhone: phone.trim() || normalizedPhone,
      updatedAt: now,
    } as OwnerProfile;
  }

  async addClaimedListing({
    workspaceId,
    ownerProfileId,
    listingId,
    name,
    occupation,
    email,
    consent,
  }: {
    workspaceId: string;
    ownerProfileId: string;
    listingId: string;
    name: string;
    occupation: string;
    email: string;
    consent?: OwnerProfile["consent"];
  }) {
    const now = new Date().toISOString();
    await getAdminDb().doc(firestorePaths.workspaceOwnerProfile(workspaceId, ownerProfileId)).set(
      {
        name,
        occupation,
        email,
        ...(consent ? { consent } : {}),
        status: "verified",
        verifiedAt: now,
        updatedAt: now,
        claimedListingIds: FieldValue.arrayUnion(listingId),
      },
      { merge: true },
    );
  }

  async updateProfileForPhone({
    workspaceId,
    phone,
    name,
    occupation,
    email,
  }: {
    workspaceId: string;
    phone: string;
    name: string;
    occupation: string;
    email: string;
  }) {
    const ownerProfileId = ownerProfileIdForPhone(phone);
    const ref = getAdminDb().doc(firestorePaths.workspaceOwnerProfile(workspaceId, ownerProfileId));
    const snapshot = await ref.get();
    if (!snapshot.exists) return null;

    await ref.set(
      {
        name,
        occupation,
        email,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    return this.findById(workspaceId, ownerProfileId);
  }
}

export const ownerProfileService = new OwnerProfileService();
