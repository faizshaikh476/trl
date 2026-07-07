import type { UserRole } from "@/types/domain";

export const PERMISSIONS = {
  PLATFORM_OVERVIEW_VIEW: "platform:overview:view",
  PLATFORM_SETTINGS_MANAGE: "platform:settings:manage",
  WORKSPACES_MANAGE: "workspaces:manage",
  WORKSPACES_SUSPEND: "workspaces:suspend",
  USERS_MANAGE: "users:manage",
  TEAM_MANAGE: "team:manage",
  LISTINGS_VIEW: "listings:view",
  LISTINGS_CREATE: "listings:create",
  LISTINGS_EDIT: "listings:edit",
  LISTINGS_EDIT_PRICING: "listings:edit_pricing",
  LISTINGS_PUBLISH: "listings:publish",
  LISTINGS_ARCHIVE: "listings:archive",
  MEDIA_UPLOAD: "media:upload",
  MEDIA_MANAGE: "media:manage",
  LEADS_VIEW: "leads:view",
  LEADS_ASSIGN: "leads:assign",
  LEADS_UPDATE: "leads:update",
  ANALYTICS_VIEW: "analytics:view",
  BILLING_MANAGE: "billing:manage",
  AI_SETTINGS_MANAGE: "ai:settings:manage",
  WHATSAPP_SETTINGS_MANAGE: "whatsapp:settings:manage",
  AUDIT_LOGS_VIEW: "audit_logs:view",
  IMPERSONATE: "impersonate",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const allPermissions = Object.values(PERMISSIONS);

const rolePermissions: Record<UserRole, Permission[]> = {
  super_admin: allPermissions,
  platform_admin: [
    PERMISSIONS.PLATFORM_OVERVIEW_VIEW,
    PERMISSIONS.WORKSPACES_MANAGE,
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.LISTINGS_VIEW,
    PERMISSIONS.LEADS_VIEW,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.AUDIT_LOGS_VIEW,
  ],
  broker_owner: [
    PERMISSIONS.TEAM_MANAGE,
    PERMISSIONS.LISTINGS_VIEW,
    PERMISSIONS.LISTINGS_CREATE,
    PERMISSIONS.LISTINGS_EDIT,
    PERMISSIONS.LISTINGS_EDIT_PRICING,
    PERMISSIONS.LISTINGS_PUBLISH,
    PERMISSIONS.LISTINGS_ARCHIVE,
    PERMISSIONS.MEDIA_UPLOAD,
    PERMISSIONS.MEDIA_MANAGE,
    PERMISSIONS.LEADS_VIEW,
    PERMISSIONS.LEADS_ASSIGN,
    PERMISSIONS.LEADS_UPDATE,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.BILLING_MANAGE,
    PERMISSIONS.WHATSAPP_SETTINGS_MANAGE,
    PERMISSIONS.AUDIT_LOGS_VIEW,
  ],
  broker_manager: [
    PERMISSIONS.LISTINGS_VIEW,
    PERMISSIONS.LISTINGS_CREATE,
    PERMISSIONS.LISTINGS_EDIT,
    PERMISSIONS.LISTINGS_PUBLISH,
    PERMISSIONS.MEDIA_UPLOAD,
    PERMISSIONS.MEDIA_MANAGE,
    PERMISSIONS.LEADS_VIEW,
    PERMISSIONS.LEADS_ASSIGN,
    PERMISSIONS.LEADS_UPDATE,
    PERMISSIONS.ANALYTICS_VIEW,
  ],
  listing_executive: [
    PERMISSIONS.LISTINGS_VIEW,
    PERMISSIONS.LISTINGS_CREATE,
    PERMISSIONS.LISTINGS_EDIT,
    PERMISSIONS.MEDIA_UPLOAD,
  ],
  photographer: [PERMISSIONS.LISTINGS_VIEW, PERMISSIONS.MEDIA_UPLOAD, PERMISSIONS.MEDIA_MANAGE],
  sales_executive: [PERMISSIONS.LISTINGS_VIEW, PERMISSIONS.LEADS_VIEW, PERMISSIONS.LEADS_UPDATE],
  viewer: [PERMISSIONS.LISTINGS_VIEW, PERMISSIONS.LEADS_VIEW, PERMISSIONS.ANALYTICS_VIEW],
};

export function getRolePermissions(role: UserRole, customPermissions: Permission[] = []) {
  return Array.from(new Set([...(rolePermissions[role] ?? []), ...customPermissions]));
}

export function can(role: UserRole, permission: Permission, customPermissions: Permission[] = []) {
  return getRolePermissions(role, customPermissions).includes(permission);
}
