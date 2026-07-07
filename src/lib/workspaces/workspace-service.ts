import { firestoreWorkspaceRepository } from "./repositories/firestore-workspace-repository";
import type { WorkspaceProfileInput, WorkspaceRepository } from "./repositories/workspace-repository";

export class WorkspaceService {
  constructor(private readonly repository: WorkspaceRepository = firestoreWorkspaceRepository) {}

  list() {
    return this.repository.list();
  }

  findBySlug(slug: string) {
    return this.repository.findBySlug(slug);
  }

  findById(id: string) {
    return this.repository.findById(id);
  }

  updateProfile(id: string, input: WorkspaceProfileInput) {
    return this.repository.updateProfile(id, input);
  }
}

export const workspaceService = new WorkspaceService();
export type { WorkspaceProfileInput };
