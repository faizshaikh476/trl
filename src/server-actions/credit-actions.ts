"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth/current-user";
import { creditWalletService } from "@/lib/billing/credit-wallet-service";

const PROMOTIONAL_CREDIT_VALIDITY_DAYS = 30;

export async function grantPromotionalCreditsAction(workspaceId: string, formData: FormData) {
  const admin = await getCurrentAdmin();
  if (admin.role !== "super_admin") {
    throw new Error("Only super admins can grant promotional credits.");
  }

  const normalizedWorkspaceId = workspaceId.trim();
  if (!normalizedWorkspaceId || normalizedWorkspaceId.includes("/")) {
    throw new Error("Workspace id is required.");
  }

  const quantity = positiveWholeNumber(formData, "quantity");
  const reason = requiredReason(formData);
  const idempotencyKey = requiredIdempotencyKey(formData);
  const confirmation = String(formData.get("confirmation") ?? "").trim();
  if (confirmation !== "confirm") {
    throw new Error("Confirm the promotional credit grant before submitting.");
  }

  await creditWalletService.grantCredits({
    workspaceId: normalizedWorkspaceId,
    quantity,
    validityDays: PROMOTIONAL_CREDIT_VALIDITY_DAYS,
    sourceType: "promotion",
    sourceId: promotionalGrantSourceId({
      adminId: admin.id,
      workspaceId: normalizedWorkspaceId,
      idempotencyKey,
    }),
    reason,
  });

  revalidatePath("/admin/workspaces");
  revalidatePath("/dashboard/listings");
}

function positiveWholeNumber(formData: FormData, key: string) {
  const value = Number(formData.get(key));
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("Quantity must be a positive whole number.");
  }
  return value;
}

function requiredReason(formData: FormData) {
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) throw new Error("Reason is required.");
  return reason;
}

function requiredIdempotencyKey(formData: FormData) {
  const value = String(formData.get("idempotencyKey") ?? "").trim();
  if (!value) throw new Error("Idempotency key is required.");
  if (!/^[a-zA-Z0-9_-]{6,128}$/.test(value)) {
    throw new Error("Idempotency key is invalid.");
  }
  return value;
}

function promotionalGrantSourceId(input: {
  adminId: string;
  workspaceId: string;
  idempotencyKey: string;
}) {
  return [
    "admin",
    sourceSegment(input.adminId),
    sourceSegment(input.workspaceId),
    input.idempotencyKey,
  ].join(":");
}

function sourceSegment(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "grant"
  );
}
