import type { UserRole } from "@/types/domain";
import { can, type Permission } from "./permissions";
import type { CurrentUser } from "@/lib/auth/current-user";

export function requirePermission(role: UserRole, permission: Permission) {
  if (!can(role, permission)) {
    throw new Error(`Missing permission: ${permission}`);
  }
}

export function requireWorkspacePermission(
  user: CurrentUser,
  workspaceId: string,
  permission: Permission,
) {
  if (user.role !== "super_admin" && user.workspaceId !== workspaceId) {
    throw new Error("Workspace access denied");
  }
  requirePermission(user.role, permission);
}
