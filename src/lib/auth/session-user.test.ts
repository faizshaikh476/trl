import { describe, expect, it } from "vitest";
import type { UserRole } from "@/types/domain";
import {
  deriveCurrentUserFromAuth,
  type AuthenticatedUserRecord,
  type VerifiedFirebaseToken,
} from "./session-user";

const token: VerifiedFirebaseToken = {
  uid: "uid_admin",
  email: "admin@therealestatelink.com",
};

function user(overrides: Partial<AuthenticatedUserRecord> = {}): AuthenticatedUserRecord {
  return {
    id: "uid_admin",
    name: "Admin",
    email: "admin@therealestatelink.com",
    role: "super_admin",
    workspaceId: null,
    status: "active",
    ...overrides,
  };
}

describe("deriveCurrentUserFromAuth", () => {
  it("returns an active Firestore user when the token subject matches", () => {
    expect(deriveCurrentUserFromAuth(token, user())).toEqual({
      id: "uid_admin",
      name: "Admin",
      email: "admin@therealestatelink.com",
      role: "super_admin" satisfies UserRole,
      workspaceId: null,
    });
  });

  it("rejects missing, mismatched, or inactive user records", () => {
    expect(deriveCurrentUserFromAuth(token, null)).toBeNull();
    expect(deriveCurrentUserFromAuth(token, user({ id: "other_uid" }))).toBeNull();
    expect(deriveCurrentUserFromAuth(token, user({ status: "disabled" }))).toBeNull();
  });

  it("requires broker users to have a workspace", () => {
    expect(deriveCurrentUserFromAuth(token, user({ role: "broker_owner", workspaceId: null }))).toBeNull();
    expect(
      deriveCurrentUserFromAuth(token, user({ role: "broker_owner", workspaceId: "workspace_1" })),
    )?.toMatchObject({ role: "broker_owner", workspaceId: "workspace_1" });
  });
});
