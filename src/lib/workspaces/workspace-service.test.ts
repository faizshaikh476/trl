import { describe, expect, it } from "vitest";
import type { Workspace } from "@/types/domain";
import { WorkspaceService } from "./workspace-service";
import type { WorkspaceRepository } from "./repositories/workspace-repository";

const workspace: Workspace = {
  id: "workspace_firestore",
  name: "Firestore Realty",
  slug: "firestore-realty",
  city: "Pune",
  ownerId: "user_owner_demo",
  logoURL: "",
  contactName: "Deepak S.",
  contactPhone: "9822052388",
  contactEmail: "hello@example.com",
  websiteTheme: "premium",
  customDomain: null,
  planId: "pro",
  status: "active",
  createdAt: "2026-06-27T00:00:00.000Z",
  updatedAt: "2026-06-27T00:00:00.000Z",
};

class InMemoryWorkspaceRepository implements WorkspaceRepository {
  private current = workspace;

  async list() {
    return [this.current];
  }

  async findBySlug(slug: string) {
    return slug === this.current.slug ? this.current : null;
  }

  async findById(id: string) {
    return id === this.current.id ? this.current : null;
  }

  async updateProfile(id: string, input: Parameters<WorkspaceRepository["updateProfile"]>[1]) {
    if (id !== this.current.id) throw new Error("Workspace not found");
    this.current = {
      ...this.current,
      ...input,
      updatedAt: "2026-06-28T00:00:00.000Z",
    };
    return this.current;
  }

  async updatePlan(id: string, planId: string) {
    if (id !== this.current.id) throw new Error("Workspace not found");
    this.current = {
      ...this.current,
      planId,
      updatedAt: "2026-06-28T00:00:00.000Z",
    };
    return this.current;
  }
}

describe("WorkspaceService", () => {
  it("uses the repository contract for listing and lookups", async () => {
    const service = new WorkspaceService(new InMemoryWorkspaceRepository());

    await expect(service.list()).resolves.toEqual([workspace]);
    await expect(service.findBySlug("firestore-realty")).resolves.toEqual(workspace);
    await expect(service.findById("workspace_firestore")).resolves.toEqual(workspace);
    await expect(service.findBySlug("missing")).resolves.toBeNull();
  });

  it("updates editable profile fields without changing the locked phone", async () => {
    const service = new WorkspaceService(new InMemoryWorkspaceRepository());

    await expect(
      service.updateProfile("workspace_firestore", {
        name: "Updated Realty",
        city: "Mumbai",
        logoURL: "https://example.com/logo.png",
        contactName: "Updated Broker",
        contactEmail: "updated@example.com",
        websiteTheme: "minimal",
      }),
    ).resolves.toMatchObject({
      name: "Updated Realty",
      city: "Mumbai",
      logoURL: "https://example.com/logo.png",
      contactName: "Updated Broker",
      contactEmail: "updated@example.com",
      websiteTheme: "minimal",
      contactPhone: "9822052388",
    });
  });

  it("assigns a new plan to a workspace", async () => {
    const service = new WorkspaceService(new InMemoryWorkspaceRepository());

    await expect(service.updatePlan("workspace_firestore", "agency")).resolves.toMatchObject({
      id: "workspace_firestore",
      planId: "agency",
      updatedAt: "2026-06-28T00:00:00.000Z",
    });
  });
});
