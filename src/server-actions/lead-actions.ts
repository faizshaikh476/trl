"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { leadService } from "@/lib/leads/lead-service";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { requireWorkspacePermission } from "@/lib/rbac/require-permission";
import type { LeadStatus } from "@/types/domain";

export async function updateLeadStatusAction(leadId: string, status: LeadStatus) {
  const user = await getCurrentUser();
  const lead = await leadService.findById(leadId);
  if (!lead) throw new Error("Lead not found");
  requireWorkspacePermission(user, lead.workspaceId, PERMISSIONS.LEADS_UPDATE);
  await leadService.updateStatus(leadId, status);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leads");
}

export async function addLeadNoteAction(leadId: string, formData: FormData) {
  const user = await getCurrentUser();
  const lead = await leadService.findById(leadId);
  if (!lead) throw new Error("Lead not found");
  requireWorkspacePermission(user, lead.workspaceId, PERMISSIONS.LEADS_UPDATE);
  const note = String(formData.get("note") ?? "");
  await leadService.addNote(leadId, note);
  revalidatePath("/dashboard/leads");
}
