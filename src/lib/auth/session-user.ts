import type { CurrentUser } from "./current-user";
import type { UserRole } from "@/types/domain";

export const SESSION_COOKIE = "trl_session";

export interface VerifiedFirebaseToken {
  uid: string;
  email: string;
}

export interface AuthenticatedUserRecord {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  workspaceId: string | null;
  status: "active" | "disabled";
}

const workspaceRoles: UserRole[] = [
  "broker_owner",
  "broker_manager",
  "listing_executive",
  "photographer",
  "sales_executive",
  "viewer",
];

export function deriveCurrentUserFromAuth(
  token: VerifiedFirebaseToken,
  record: AuthenticatedUserRecord | null,
): CurrentUser | null {
  if (!record || record.id !== token.uid || record.status !== "active") return null;
  if (workspaceRoles.includes(record.role) && !record.workspaceId) return null;

  return {
    id: record.id,
    name: record.name,
    email: record.email || token.email,
    role: record.role,
    workspaceId: record.workspaceId,
  };
}
