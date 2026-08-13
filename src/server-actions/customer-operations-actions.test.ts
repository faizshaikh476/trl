import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CustomerDetail } from "@/lib/customer-operations/customer-operations-service";

const mocks = vi.hoisted(() => ({
  getCurrentAdmin: vi.fn(),
  getCustomerDetail: vi.fn(),
  updateManagement: vi.fn(),
  deleteConversation: vi.fn(),
  sendText: vi.fn(),
  sendTemplate: vi.fn(),
  retryText: vi.fn(),
  auditRecord: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth/current-user", () => ({ getCurrentAdmin: mocks.getCurrentAdmin }));
vi.mock("@/lib/customer-operations/customer-operations-service", () => ({
  customerOperationsService: {
    getCustomerDetail: mocks.getCustomerDetail,
    updateManagement: mocks.updateManagement,
    deleteConversation: mocks.deleteConversation,
  },
}));
vi.mock("@/lib/whatsapp/whatsapp-message-sender", () => ({
  whatsAppMessageSender: {
    sendText: mocks.sendText,
    sendTemplate: mocks.sendTemplate,
    retryText: mocks.retryText,
  },
}));
vi.mock("@/lib/audit/audit-log-service", () => ({
  auditLogService: { record: mocks.auditRecord },
}));

import {
  deleteCustomerConversationAction,
  retryCustomerMessageAction,
  sendCustomerFollowUpTemplateAction,
  sendCustomerReplyAction,
  updateCustomerManagementAction,
} from "./customer-operations-actions";

const initialState = { ok: false, message: "" };

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.getCurrentAdmin.mockResolvedValue({
    id: "admin_1",
    name: "Admin",
    email: "admin@example.com",
    role: "super_admin",
    workspaceId: null,
  });
  mocks.getCustomerDetail.mockResolvedValue(detail());
  mocks.sendText.mockResolvedValue({ id: "wamid.reply" });
  mocks.sendTemplate.mockResolvedValue({ id: "wamid.template" });
  mocks.retryText.mockResolvedValue({ id: "wamid.retry" });
  mocks.updateManagement.mockResolvedValue(detail().activity);
  mocks.deleteConversation.mockResolvedValue(2);
  mocks.auditRecord.mockResolvedValue({ id: "audit_1" });
  delete process.env.WHATSAPP_ADMIN_FOLLOWUP_TEMPLATE_NAME;
  delete process.env.WHATSAPP_ADMIN_FOLLOWUP_TEMPLATE_LANGUAGE;
});

afterEach(() => {
  delete process.env.WHATSAPP_ADMIN_FOLLOWUP_TEMPLATE_NAME;
  delete process.env.WHATSAPP_ADMIN_FOLLOWUP_TEMPLATE_LANGUAGE;
});

describe("customer operations actions", () => {
  it("sends and audits a free-form reply inside the 24-hour window", async () => {
    const result = await sendCustomerReplyAction(
      "contact_919876543210",
      initialState,
      form({ workspaceId: "workspace_1", text: "How can I help?" }),
    );

    expect(result).toEqual({ ok: true, message: "Reply sent." });
    expect(mocks.sendText).toHaveBeenCalledWith({
      phone: "919876543210",
      workspaceId: "workspace_1",
      text: "How can I help?",
      senderType: "admin",
    });
    expect(mocks.auditRecord).toHaveBeenCalledWith({
      workspaceId: "workspace_1",
      actorId: "admin_1",
      action: "customer.reply_sent",
      targetId: "contact_919876543210",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/workspaces");
  });

  it("blocks free-form replies outside the 24-hour window", async () => {
    mocks.getCustomerDetail.mockResolvedValue(
      detail({ lastInboundAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() }),
    );

    const result = await sendCustomerReplyAction(
      "contact_919876543210",
      initialState,
      form({ workspaceId: "workspace_1", text: "Hello" }),
    );

    expect(result).toEqual({
      ok: false,
      message: "The 24-hour reply window has closed. Send the approved follow-up template instead.",
    });
    expect(mocks.sendText).not.toHaveBeenCalled();
  });

  it("rejects empty, oversized, and workspace-mismatched replies", async () => {
    expect(
      await sendCustomerReplyAction(
        "contact_919876543210",
        initialState,
        form({ workspaceId: "workspace_1", text: "   " }),
      ),
    ).toEqual({ ok: false, message: "Reply text is required." });
    expect(
      await sendCustomerReplyAction(
        "contact_919876543210",
        initialState,
        form({ workspaceId: "workspace_1", text: "x".repeat(2001) }),
      ),
    ).toEqual({ ok: false, message: "Reply must be 2,000 characters or fewer." });
    expect(
      await sendCustomerReplyAction(
        "contact_919876543210",
        initialState,
        form({ workspaceId: "workspace_2", text: "Hello" }),
      ),
    ).toEqual({ ok: false, message: "Customer workspace mismatch." });
    expect(mocks.sendText).not.toHaveBeenCalled();
  });

  it("requires and sends the configured approved follow-up template", async () => {
    expect(
      await sendCustomerFollowUpTemplateAction(
        "contact_919876543210",
        initialState,
        form({ workspaceId: "workspace_1" }),
      ),
    ).toEqual({ ok: false, message: "The admin follow-up template is not configured." });

    process.env.WHATSAPP_ADMIN_FOLLOWUP_TEMPLATE_NAME = "admin_follow_up";
    process.env.WHATSAPP_ADMIN_FOLLOWUP_TEMPLATE_LANGUAGE = "en_US";
    const result = await sendCustomerFollowUpTemplateAction(
      "contact_919876543210",
      initialState,
      form({ workspaceId: "workspace_1" }),
    );

    expect(result).toEqual({ ok: true, message: "Follow-up template sent." });
    expect(mocks.sendTemplate).toHaveBeenCalledWith({
      phone: "919876543210",
      workspaceId: "workspace_1",
      template: { name: "admin_follow_up", languageCode: "en_US" },
      senderType: "admin",
    });
  });

  it("retries only a failed outbound message belonging to the customer", async () => {
    const result = await retryCustomerMessageAction(
      "contact_919876543210",
      initialState,
      form({ workspaceId: "workspace_1", messageId: "message_failed" }),
    );
    expect(result).toEqual({ ok: true, message: "Message retried." });
    expect(mocks.retryText).toHaveBeenCalledWith(
      expect.objectContaining({ id: "message_failed", direction: "outbound", deliveryStatus: "failed" }),
    );

    expect(
      await retryCustomerMessageAction(
        "contact_919876543210",
        initialState,
        form({ workspaceId: "workspace_1", messageId: "message_inbound" }),
      ),
    ).toEqual({ ok: false, message: "Only a failed outbound message can be retried." });
  });

  it("updates customer management fields and audits the change", async () => {
    const result = await updateCustomerManagementAction(
      "contact_919876543210",
      initialState,
      form({
        workspaceId: "workspace_1",
        privateNote: "Asked about Pune listings",
        tags: "hot, Pune, hot",
        followUpAt: "2026-08-20T10:00:00.000Z",
        resolution: "open",
      }),
    );

    expect(result).toEqual({ ok: true, message: "Customer management updated." });
    expect(mocks.updateManagement).toHaveBeenCalledWith("contact_919876543210", {
      privateNote: "Asked about Pune listings",
      tags: ["hot", "Pune", "hot"],
      followUpAt: "2026-08-20T10:00:00.000Z",
      resolution: "open",
      actorId: "admin_1",
    });
  });

  it("requires explicit confirmation before deleting retained conversation text", async () => {
    expect(
      await deleteCustomerConversationAction(
        "contact_919876543210",
        initialState,
        form({ workspaceId: "workspace_1", confirmation: "yes" }),
      ),
    ).toEqual({ ok: false, message: 'Type "delete" to confirm conversation deletion.' });
    expect(mocks.deleteConversation).not.toHaveBeenCalled();

    const result = await deleteCustomerConversationAction(
      "contact_919876543210",
      initialState,
      form({ workspaceId: "workspace_1", confirmation: "delete" }),
    );
    expect(result).toEqual({ ok: true, message: "Conversation deleted (2 messages)." });
    expect(mocks.deleteConversation).toHaveBeenCalledWith("contact_919876543210", "admin_1");
  });
});

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

function detail(overrides: Partial<CustomerDetail["activity"]> = {}): CustomerDetail {
  const now = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  return {
    activity: {
      id: "contact_919876543210",
      phone: "919876543210",
      displayName: "Monesh Kumar",
      email: "",
      city: "Pune",
      workspaceId: "workspace_1",
      authenticatedUserId: null,
      classification: "prospect",
      stage: "new_chat",
      walletState: "never_funded",
      effectiveCredits: 0,
      planId: "free",
      paymentState: "none",
      latestPurchaseAt: null,
      listingCounts: { total: 0, ready: 0, published: 0 },
      searchTokens: [],
      firstSeenAt: now,
      lastInboundAt: now,
      lastOutboundAt: null,
      lastActivityAt: now,
      latestActivityLabel: "Customer message received",
      tags: [],
      privateNote: "",
      followUpAt: null,
      resolution: "open",
      historyRetainedFrom: now,
      ...overrides,
    },
    messages: [
      {
        id: "message_failed",
        contactId: "contact_919876543210",
        workspaceId: "workspace_1",
        direction: "outbound",
        senderType: "admin",
        text: "Hello",
        providerMessageId: null,
        deliveryStatus: "failed",
        failureSummary: "Network error",
        createdAt: now,
        expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "message_inbound",
        contactId: "contact_919876543210",
        workspaceId: "workspace_1",
        direction: "inbound",
        senderType: "customer",
        text: "Hi",
        providerMessageId: "wamid.inbound",
        deliveryStatus: "delivered",
        failureSummary: null,
        createdAt: now,
        expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    events: [],
  };
}
