import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@/server-actions/customer-operations-actions", () => ({
  retryCustomerMessageAction: vi.fn(),
  sendCustomerFollowUpTemplateAction: vi.fn(),
  sendCustomerReplyAction: vi.fn(),
}));

import { CustomerConversation } from "./customer-conversation";

describe("CustomerConversation", () => {
  it("keeps long chat history inside a shrinking scroll region", () => {
    render(
      <CustomerConversation
        contactId="contact_919876543210"
        workspaceId="workspace_1"
        messages={[]}
        insideReplyWindow
        retentionLabel="History retained from 13 Aug 2026"
      />,
    );

    expect(screen.getByRole("log", { name: "Conversation history" })).toHaveClass(
      "min-h-0",
      "overflow-y-auto",
    );
    expect(screen.getByRole("region", { name: "Conversation reply" })).toHaveClass(
      "shrink-0",
    );
  });
});
