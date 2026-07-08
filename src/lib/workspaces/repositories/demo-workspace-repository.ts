import { demoWorkspace } from "@/lib/mock-data/demo-data";
import type { WorkspaceProfileInput, WorkspaceRepository } from "./workspace-repository";

export class DemoWorkspaceRepository implements WorkspaceRepository {
  async list() {
    return [demoWorkspace];
  }

  async findBySlug(slug: string) {
    return demoWorkspace.slug === slug ? demoWorkspace : null;
  }

  async findById(id: string) {
    return demoWorkspace.id === id ? demoWorkspace : null;
  }

  async updateProfile(id: string, input: WorkspaceProfileInput) {
    if (demoWorkspace.id !== id) throw new Error("Workspace not found");
    return {
      ...demoWorkspace,
      ...input,
      updatedAt: new Date().toISOString(),
    };
  }

  async updatePlan(id: string, planId: string) {
    if (demoWorkspace.id !== id) throw new Error("Workspace not found");
    return {
      ...demoWorkspace,
      planId,
      updatedAt: new Date().toISOString(),
    };
  }
}

export const demoWorkspaceRepository = new DemoWorkspaceRepository();
