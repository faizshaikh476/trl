import "server-only";

import { getAdminDb } from "@/lib/firebase/admin";
import { firestorePaths } from "@/lib/firebase/paths";
import { normalizePhoneNumber } from "@/lib/owners/owner-profile-service";
import type { Workspace } from "@/types/domain";

export interface WhatsAppBrokerWorkspaceService {
  resolveWorkspaceForPhone(phone: string): Promise<string>;
}

export class FirestoreWhatsAppBrokerWorkspaceService implements WhatsAppBrokerWorkspaceService {
  async resolveWorkspaceForPhone(phone: string) {
    const normalizedPhone = normalizePhoneNumber(phone);
    if (!normalizedPhone) return getFallbackWorkspaceId();

    const workspaceId = workspaceIdForBrokerPhone(normalizedPhone);
    const ref = getAdminDb().doc(firestorePaths.workspace(workspaceId));
    const snapshot = await ref.get();
    const now = new Date().toISOString();

    if (!snapshot.exists) {
      const workspace: Workspace = {
        id: workspaceId,
        name: `Broker ${normalizedPhone.slice(-4)}`,
        slug: workspaceSlugForBrokerPhone(normalizedPhone),
        city: "",
        ownerId: `owner_${normalizedPhone}`,
        logoURL: "",
        contactName: "",
        contactPhone: normalizedPhone,
        contactEmail: "",
        websiteTheme: "premium",
        customDomain: null,
        planId: "starter",
        status: "active",
        createdAt: now,
        updatedAt: now,
      };
      await ref.set(workspace);
      return workspaceId;
    }

    await ref.set(
      {
        contactPhone: normalizedPhone,
        updatedAt: now,
      },
      { merge: true },
    );
    return workspaceId;
  }
}

export const firestoreWhatsAppBrokerWorkspaceService = new FirestoreWhatsAppBrokerWorkspaceService();

export function workspaceIdForBrokerPhone(phone: string) {
  const normalizedPhone = normalizePhoneNumber(phone);
  if (!normalizedPhone) return getFallbackWorkspaceId();
  return `workspace_broker_${normalizedPhone}`;
}

export function workspaceSlugForBrokerPhone(phone: string) {
  const normalizedPhone = normalizePhoneNumber(phone);
  if (!normalizedPhone) return getFallbackWorkspaceId();
  return `broker-${normalizedPhone}`;
}

function getFallbackWorkspaceId() {
  return process.env.WHATSAPP_DEFAULT_WORKSPACE_ID ?? "workspace_rare_address";
}
