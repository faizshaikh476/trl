import { getAdminDb } from "@/lib/firebase/admin";
import { firestorePaths } from "@/lib/firebase/paths";
import type { Workspace } from "@/types/domain";
import type { WorkspaceProfileInput, WorkspaceRepository } from "./workspace-repository";

export class FirestoreWorkspaceRepository implements WorkspaceRepository {
  async list() {
    const snapshot = await getAdminDb().collection(firestorePaths.workspaces()).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Workspace);
  }

  async findBySlug(slug: string) {
    const snapshot = await getAdminDb()
      .collection(firestorePaths.workspaces())
      .where("slug", "==", slug)
      .limit(1)
      .get();
    const doc = snapshot.docs[0];
    return doc ? ({ id: doc.id, ...doc.data() } as Workspace) : null;
  }

  async findById(id: string) {
    const doc = await getAdminDb().doc(firestorePaths.workspace(id)).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() } as Workspace) : null;
  }

  async updateProfile(id: string, input: WorkspaceProfileInput) {
    const ref = getAdminDb().doc(firestorePaths.workspace(id));
    await ref.update({
      name: input.name,
      city: input.city,
      logoURL: input.logoURL,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      websiteTheme: input.websiteTheme,
      updatedAt: new Date().toISOString(),
    });

    const updated = await ref.get();
    if (!updated.exists) throw new Error("Workspace not found");
    return { id: updated.id, ...updated.data() } as Workspace;
  }

  async updatePlan(id: string, planId: string) {
    const ref = getAdminDb().doc(firestorePaths.workspace(id));
    await ref.update({
      planId,
      updatedAt: new Date().toISOString(),
    });

    const updated = await ref.get();
    if (!updated.exists) throw new Error("Workspace not found");
    return { id: updated.id, ...updated.data() } as Workspace;
  }
}

export const firestoreWorkspaceRepository = new FirestoreWorkspaceRepository();
