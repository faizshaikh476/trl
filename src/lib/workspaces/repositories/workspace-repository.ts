import type { Workspace } from "@/types/domain";

export type WorkspaceProfileInput = Pick<
  Workspace,
  "name" | "city" | "logoURL" | "contactName" | "contactEmail" | "websiteTheme"
>;

export interface WorkspaceRepository {
  list(): Promise<Workspace[]>;
  findBySlug(slug: string): Promise<Workspace | null>;
  findById(id: string): Promise<Workspace | null>;
  updateProfile(id: string, input: WorkspaceProfileInput): Promise<Workspace>;
}
