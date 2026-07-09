"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth/current-user";
import { billingService, parsePlanInput, planIdFromName } from "@/lib/billing/billing-service";
import { workspaceService } from "@/lib/workspaces/workspace-service";

export async function createPlanAction(formData: FormData) {
  await getCurrentAdmin();
  const input = planInputFromAdminForm(formData);
  const planId = planIdFromName(input.name);
  if (!planId) throw new Error("Plan name must include letters or numbers.");
  await billingService.upsertPlan(planId, input);
  revalidateAdminBilling();
}

export async function updatePlanAction(planId: string, formData: FormData) {
  await getCurrentAdmin();
  const input = planInputFromAdminForm(formData);
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

function planInputFromAdminForm(formData: FormData) {
  const normalizedFormData = normalizeRupeeAmount(formData);
  return {
    ...parsePlanInput(normalizedFormData),
    description: String(formData.get("description") ?? "").trim(),
  };
}

function normalizeRupeeAmount(formData: FormData) {
  const amountRupees = formData.get("amountRupees");
  if (amountRupees == null || String(amountRupees).trim() === "") return formData;

  const normalized = new FormData();
  for (const [key, value] of formData.entries()) normalized.append(key, value);
  normalized.set("amountPaise", rupeesToPaise(String(amountRupees)));
  return normalized;
}

function rupeesToPaise(rawValue: string) {
  const value = rawValue.trim().replace(/,/g, "");
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
    throw new Error("Amount in rupees must be a valid rupee amount.");
  }

  const [rupees, paise = ""] = value.split(".");
  const amountPaise = BigInt(rupees) * BigInt(100) + BigInt(paise.padEnd(2, "0"));
  if (amountPaise > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("Amount in rupees is too large.");
  }
  return amountPaise.toString();
}
