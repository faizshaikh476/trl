import { getAdminDb } from "@/lib/firebase/admin";
import { firestorePaths } from "@/lib/firebase/paths";
import type { AuthenticatedUserRecord } from "./session-user";

const workspaceRoles = new Set([
  "broker_owner",
  "broker_manager",
  "listing_executive",
  "photographer",
  "sales_executive",
  "viewer",
]);

export async function findAuthenticatedUser(uid: string) {
  const doc = await getAdminDb().doc(firestorePaths.user(uid)).get();
  return doc.exists ? ({ id: doc.id, ...doc.data() } as AuthenticatedUserRecord) : null;
}

export async function resolveAuthenticatedUserWorkspace(
  record: AuthenticatedUserRecord | null,
  tokenEmail: string,
) {
  if (!record || !workspaceRoles.has(record.role)) return record;

  const email = (record.email || tokenEmail).trim().toLowerCase();
  if (!email) return record;

  const snapshot = await getAdminDb()
    .collectionGroup("ownerProfiles")
    .where("email", "==", email)
    .get()
    .catch((error: unknown) => {
      console.warn("Broker workspace auto-resolution skipped", {
        reason: error instanceof Error ? error.message : "Unknown Firestore error",
      });
      return null;
    });
  if (!snapshot) return record;
  const verifiedProfiles = snapshot.docs
    .map((doc) => ({
      workspaceId: doc.ref.parent.parent?.id ?? "",
      updatedAt: String(doc.data().updatedAt ?? ""),
      status: String(doc.data().status ?? ""),
    }))
    .filter((profile) => profile.workspaceId && profile.status === "verified")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const verifiedWorkspaceId = verifiedProfiles[0]?.workspaceId;
  if (!verifiedWorkspaceId || verifiedWorkspaceId === record.workspaceId) return record;

  const now = new Date().toISOString();
  await getAdminDb().doc(firestorePaths.user(record.id)).set(
    {
      workspaceId: verifiedWorkspaceId,
      updatedAt: now,
    },
    { merge: true },
  );
  await getAdminDb().doc(firestorePaths.workspaceMember(verifiedWorkspaceId, record.id)).set(
    {
      id: record.id,
      userId: record.id,
      workspaceId: verifiedWorkspaceId,
      role: record.role,
      status: "active",
      updatedAt: now,
      createdAt: now,
    },
    { merge: true },
  );

  return {
    ...record,
    workspaceId: verifiedWorkspaceId,
  };
}

export async function listAuthenticatedUsers() {
  const snapshot = await getAdminDb().collection("users").orderBy("name", "asc").get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as AuthenticatedUserRecord);
}
