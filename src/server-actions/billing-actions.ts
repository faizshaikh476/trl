"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth/current-user";
import { billingService, parsePlanInput, planIdFromName } from "@/lib/billing/billing-service";
import { workspaceService } from "@/lib/workspaces/workspace-service";

export async function createPlanAction(formData: FormData) {
  await getCurrentAdmin();
  const input = parsePlanInput(formData);
  const planId = planIdFromName(input.name);
  if (!planId) throw new Error("Plan name must include letters or numbers.");
  await billingService.upsertPlan(planId, input);
  revalidateAdminBilling();
}

export async function updatePlanAction(planId: string, formData: FormData) {
  await getCurrentAdmin();
  const input = parsePlanInput(formData);
  await billingService.upsertPlan(planId, input);
  revalidateAdminBilling();
}

export async function deletePlanAction(planId: string, formData: FormData) {
  await getCurrentAdmin();
  const confirmation = String(formData.get("confirmation") ?? "").trim();
  if (confirmation !== "delete") throw new Error("Type delete to remove this plan.");
  await billingService.deletePlan(planId);
  revalidateAdminBilling();
}

export async function assignWorkspacePlanAction(workspaceId: string, formData: FormData) {
  await getCurrentAdmin();
  const planId = String(formData.get("planId") ?? "").trim();
  const activePlans = await billingService.listActivePlans();
  if (!activePlans.some((plan) => plan.id === planId)) {
    throw new Error("Choose an active plan before saving.");
  }
  await workspaceService.updatePlan(workspaceId, planId);
  revalidateAdminBilling();
}

function revalidateAdminBilling() {
  revalidatePath("/admin");
  revalidatePath("/admin/subscriptions");
  revalidatePath("/admin/workspaces");
  revalidatePath("/admin/users");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/listings");
}
