export const firestorePaths = {
  user: (userId: string) => `users/${userId}`,
  workspaces: () => "workspaces",
  workspace: (workspaceId: string) => `workspaces/${workspaceId}`,
  workspaceMembers: (workspaceId: string) => `workspaces/${workspaceId}/members`,
  workspaceMember: (workspaceId: string, userId: string) =>
    `workspaces/${workspaceId}/members/${userId}`,
  workspaceListings: (workspaceId: string) => `workspaces/${workspaceId}/listings`,
  workspaceListing: (workspaceId: string, listingId: string) =>
    `workspaces/${workspaceId}/listings/${listingId}`,
  workspaceMedia: (workspaceId: string) => `workspaces/${workspaceId}/media`,
  workspaceMediaAsset: (workspaceId: string, mediaId: string) =>
    `workspaces/${workspaceId}/media/${mediaId}`,
  workspaceOwnerProfiles: (workspaceId: string) =>
    `workspaces/${workspaceId}/ownerProfiles`,
  workspaceOwnerProfile: (workspaceId: string, ownerProfileId: string) =>
    `workspaces/${workspaceId}/ownerProfiles/${ownerProfileId}`,
  workspaceLeads: (workspaceId: string) => `workspaces/${workspaceId}/leads`,
  workspaceLead: (workspaceId: string, leadId: string) =>
    `workspaces/${workspaceId}/leads/${leadId}`,
  workspaceIntakeSessions: (workspaceId: string) =>
    `workspaces/${workspaceId}/intakeSessions`,
  workspaceWhatsAppMessages: (workspaceId: string) =>
    `workspaces/${workspaceId}/whatsappMessages`,
  workspaceAnalyticsEvents: (workspaceId: string) =>
    `workspaces/${workspaceId}/analyticsEvents`,
  workspaceAuditLogs: (workspaceId: string) => `workspaces/${workspaceId}/auditLogs`,
  workspaceAiGenerations: (workspaceId: string) =>
    `workspaces/${workspaceId}/aiGenerations`,
  workspaceSettings: (workspaceId: string) => `workspaces/${workspaceId}/settings`,
  publicListing: (slug: string) => `publicListingIndex/${slug}`,
  ownerClaimToken: (token: string) => `ownerClaimTokens/${token}`,
  platformAdmin: (userId: string) => `platformAdmins/${userId}`,
  platformSetting: (settingId: string) => `platformSettings/${settingId}`,
  plans: () => "plans",
  plan: (planId: string) => `plans/${planId}`,
};
