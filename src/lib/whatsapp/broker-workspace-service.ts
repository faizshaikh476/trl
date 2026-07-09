import "server-only";

import { createHmac } from "crypto";
import { getAdminDb } from "@/lib/firebase/admin";
import { firestorePaths } from "@/lib/firebase/paths";
import { normalizePhoneNumber } from "@/lib/owners/owner-profile-service";
import { billingService } from "@/lib/billing/billing-service";
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
      const planId = await billingService.defaultPlanId();
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
        planId,
        status: "active",
        createdAt: now,
        updatedAt: now,
      };
      await ref.set(workspace);
      return workspaceId;
    }

    const workspace = snapshot.data() as Workspace;
    const safeSlug = workspaceSlugForBrokerPhone(normalizedPhone);
    if (isPhoneBasedBrokerSlug(workspace.slug)) {
      await ref.set(
        {
          slug: safeSlug,
          updatedAt: now,
        },
        { merge: true },
      );
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
  return `broker-${brokerPhoneSlugToken(normalizedPhone)}`;
}

function getFallbackWorkspaceId() {
  return process.env.WHATSAPP_DEFAULT_WORKSPACE_ID ?? "workspace_rare_address";
}

function brokerPhoneSlugToken(normalizedPhone: string) {
  const secret =
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    process.env.FIREBASE_PROJECT_ID ??
    "therealestatelink-broker-slug-v1";
  return createHmac("sha256", secret).update(normalizedPhone).digest("hex").slice(0, 12);
}

function isPhoneBasedBrokerSlug(slug: string) {
  return /^broker-\d{8,15}$/.test(slug);
}
