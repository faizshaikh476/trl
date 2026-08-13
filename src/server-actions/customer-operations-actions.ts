"use server";

import { revalidatePath } from "next/cache";
import { auditLogService } from "@/lib/audit/audit-log-service";
import { getCurrentAdmin } from "@/lib/auth/current-user";
import {
  customerOperationsService,
  type CustomerDetail,
} from "@/lib/customer-operations/customer-operations-service";
import { isInsideCustomerServiceWindow } from "@/lib/customer-operations/customer-state";
import { whatsAppMessageSender } from "@/lib/whatsapp/whatsapp-message-sender";

export interface CustomerOperationsActionState {
  ok: boolean;
  message: string;
}

export async function sendCustomerReplyAction(
  contactId: string,
  _previousState: CustomerOperationsActionState,
  formData: FormData,
): Promise<CustomerOperationsActionState> {
  const context = await loadActionContext(contactId, formData);
  if ("error" in context) return context.error;
  const text = formValue(formData, "text").trim();
  if (!text) return failure("Reply text is required.");
  if (text.length > 2000) return failure("Reply must be 2,000 characters or fewer.");
  if (!isInsideCustomerServiceWindow(context.detail.activity.lastInboundAt, new Date())) {
    return failure(
      "The 24-hour reply window has closed. Send the approved follow-up template instead.",
    );
  }

  try {
    await whatsAppMessageSender.sendText({
      phone: context.detail.activity.phone,
      workspaceId: context.detail.activity.workspaceId,
      text,
      senderType: "admin",
    });
    await recordAction(context, "customer.reply_sent");
    return success("Reply sent.");
  } catch {
    return failure("The reply could not be sent. You can retry the failed message.");
  }
}

export async function sendCustomerFollowUpTemplateAction(
  contactId: string,
  _previousState: CustomerOperationsActionState,
  formData: FormData,
): Promise<CustomerOperationsActionState> {
  const context = await loadActionContext(contactId, formData);
  if ("error" in context) return context.error;
  const templateName = process.env.WHATSAPP_ADMIN_FOLLOWUP_TEMPLATE_NAME?.trim();
  if (!templateName) return failure("The admin follow-up template is not configured.");
  const languageCode =
    process.env.WHATSAPP_ADMIN_FOLLOWUP_TEMPLATE_LANGUAGE?.trim() || "en";

  try {
    await whatsAppMessageSender.sendTemplate({
      phone: context.detail.activity.phone,
      workspaceId: context.detail.activity.workspaceId,
      template: { name: templateName, languageCode },
      senderType: "admin",
    });
    await recordAction(context, "customer.follow_up_template_sent");
    return success("Follow-up template sent.");
  } catch {
    return failure("The follow-up template could not be sent.");
  }
}

export async function retryCustomerMessageAction(
  contactId: string,
  _previousState: CustomerOperationsActionState,
  formData: FormData,
): Promise<CustomerOperationsActionState> {
  const context = await loadActionContext(contactId, formData);
  if ("error" in context) return context.error;
  const messageId = formValue(formData, "messageId");
  const message = context.detail.messages.find((candidate) => candidate.id === messageId);
  if (!message || message.direction !== "outbound" || message.deliveryStatus !== "failed") {
    return failure("Only a failed outbound message can be retried.");
  }

  try {
    await whatsAppMessageSender.retryText(message);
    await recordAction(context, "customer.message_retried");
    return success("Message retried.");
  } catch {
    return failure("The message retry failed.");
  }
}

export async function updateCustomerManagementAction(
  contactId: string,
  _previousState: CustomerOperationsActionState,
  formData: FormData,
): Promise<CustomerOperationsActionState> {
  const context = await loadActionContext(contactId, formData);
  if ("error" in context) return context.error;
  const resolution = formValue(formData, "resolution");
  if (resolution !== "open" && resolution !== "resolved") {
    return failure("Resolution must be open or resolved.");
  }

  try {
    await customerOperationsService.updateManagement(contactId, {
      privateNote: formValue(formData, "privateNote"),
      tags: formValue(formData, "tags").split(",").map((tag) => tag.trim()),
      followUpAt: formValue(formData, "followUpAt") || null,
      resolution,
      actorId: context.adminId,
    });
    await recordAction(context, "customer.management_updated");
    return success("Customer management updated.");
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Customer management could not be updated.");
  }
}

export async function deleteCustomerConversationAction(
  contactId: string,
  _previousState: CustomerOperationsActionState,
  formData: FormData,
): Promise<CustomerOperationsActionState> {
  const context = await loadActionContext(contactId, formData);
  if ("error" in context) return context.error;
  if (formValue(formData, "confirmation").trim().toLowerCase() !== "delete") {
    return failure('Type "delete" to confirm conversation deletion.');
  }

  try {
    const deleted = await customerOperationsService.deleteConversation(contactId, context.adminId);
    await recordAction(context, "customer.conversation_deleted");
    return success(`Conversation deleted (${deleted} messages).`);
  } catch {
    return failure("The conversation could not be deleted.");
  }
}

type ActionContext = {
  adminId: string;
  contactId: string;
  detail: CustomerDetail;
};

async function loadActionContext(
  contactId: string,
  formData: FormData,
): Promise<ActionContext | { error: CustomerOperationsActionState }> {
  const admin = await getCurrentAdmin();
  const detail = await customerOperationsService.getCustomerDetail(contactId);
  if (!detail) return { error: failure("Customer activity not found.") };
  if (formValue(formData, "workspaceId") !== detail.activity.workspaceId) {
    return { error: failure("Customer workspace mismatch.") };
  }
  return { adminId: admin.id, contactId, detail };
}

async function recordAction(context: ActionContext, action: string) {
  await auditLogService.record({
    workspaceId: context.detail.activity.workspaceId,
    actorId: context.adminId,
    action,
    targetId: context.contactId,
  });
  revalidatePath("/admin/workspaces");
}

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function success(message: string): CustomerOperationsActionState {
  return { ok: true, message };
}

function failure(message: string): CustomerOperationsActionState {
  return { ok: false, message };
}
