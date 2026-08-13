import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/server-actions/customer-operations-actions", () => ({
  deleteCustomerConversationAction: vi.fn(),
  retryCustomerMessageAction: vi.fn(),
  sendCustomerFollowUpTemplateAction: vi.fn(),
  sendCustomerReplyAction: vi.fn(),
  updateCustomerManagementAction: vi.fn(),
}));
vi.mock("@/server-actions/credit-actions", () => ({ grantPromotionalCreditsAction: vi.fn() }));
vi.mock("@/server-actions/billing-actions", () => ({ assignWorkspacePlanAction: vi.fn() }));

import { CustomerDetailDrawer } from "./customer-detail-drawer";

describe("CustomerDetailDrawer", () => {
  it("bounds the active conversation panel to the viewport content row", () => {
    render(
      <CustomerDetailDrawer
        detail={detail()}
        closeHref="/admin/workspaces"
        plans={[]}
        initialTab="conversation"
      />,
    );

    expect(document.querySelector('[data-slot="sheet-content"]')).toHaveClass(
      "h-dvh",
      "overflow-hidden",
    );
    expect(document.querySelector('[data-slot="tabs"]')).toHaveClass(
      "grid",
      "grid-rows-[auto_minmax(0,1fr)]",
      "overflow-hidden",
    );
    expect(screen.getByRole("log", { name: "Conversation history" }).parentElement?.parentElement).toHaveClass(
      "h-full",
      "min-h-0",
      "overflow-hidden",
    );
  });
});

function detail() {
  return {
    activity: {
      id: "contact_919876543210",
      phone: "919876543210",
      displayName: "Broker 3210",
      classification: "prospect",
      stage: "new_chat",
      workspaceId: "workspace_1",
      city: "Pune",
      planId: "free",
      paymentState: "none",
      effectiveCredits: 0,
      walletState: "no_wallet",
      listingCounts: { published: 0, ready: 0, total: 0 },
      email: "",
      privateNote: "",
      tags: [],
      followUpAt: null,
      resolution: "open",
    },
    planLabel: "Free",
    messages: [],
    events: [],
    insideReplyWindow: true,
    retentionLabel: "History retained from 13 Aug 2026",
  } as Parameters<typeof CustomerDetailDrawer>[0]["detail"];
}
