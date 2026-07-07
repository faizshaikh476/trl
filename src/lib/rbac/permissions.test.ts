import { describe, expect, it } from "vitest";
import { can, getRolePermissions, PERMISSIONS } from "./permissions";

describe("RBAC permissions", () => {
  it("gives broker owners workspace control without platform settings access", () => {
    const permissions = getRolePermissions("broker_owner");

    expect(permissions).toContain(PERMISSIONS.LISTINGS_PUBLISH);
    expect(permissions).toContain(PERMISSIONS.TEAM_MANAGE);
    expect(permissions).not.toContain(PERMISSIONS.PLATFORM_SETTINGS_MANAGE);
  });

  it("allows super admins to perform every declared permission", () => {
    expect(can("super_admin", PERMISSIONS.AI_SETTINGS_MANAGE)).toBe(true);
    expect(can("super_admin", PERMISSIONS.WORKSPACES_SUSPEND)).toBe(true);
    expect(can("super_admin", PERMISSIONS.LEADS_ASSIGN)).toBe(true);
  });

  it("keeps media uploaders away from legal and price fields by default", () => {
    expect(can("photographer", PERMISSIONS.MEDIA_UPLOAD)).toBe(true);
    expect(can("photographer", PERMISSIONS.LISTINGS_EDIT_PRICING)).toBe(false);
    expect(can("photographer", PERMISSIONS.LISTINGS_PUBLISH)).toBe(false);
  });
});
