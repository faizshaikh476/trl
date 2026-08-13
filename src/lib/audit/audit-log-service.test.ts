import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  set: vi.fn(),
  doc: vi.fn(),
  collection: vi.fn(),
  getAdminDb: vi.fn(),
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: mocks.getAdminDb,
}));

import { AuditLogService } from "./audit-log-service";

beforeEach(() => {
  mocks.set.mockReset().mockResolvedValue(undefined);
  mocks.doc.mockReset().mockReturnValue({ set: mocks.set });
  mocks.collection.mockReset().mockReturnValue({ doc: mocks.doc });
  mocks.getAdminDb.mockReset().mockReturnValue({ collection: mocks.collection });
});

describe("AuditLogService.record", () => {
  it("persists a body-free administrative audit record", async () => {
    const service = new AuditLogService(
      () => new Date("2026-08-13T10:00:00.000Z"),
      () => "audit_1",
    );

    const result = await service.record({
      workspaceId: "workspace_1",
      actorId: "admin_1",
      action: "customer.reply_sent",
      targetId: "contact_919876543210",
    });

    expect(mocks.collection).toHaveBeenCalledWith("workspaces/workspace_1/auditLogs");
    expect(mocks.doc).toHaveBeenCalledWith("audit_1");
    expect(mocks.set).toHaveBeenCalledWith({
      id: "audit_1",
      workspaceId: "workspace_1",
      actorId: "admin_1",
      action: "customer.reply_sent",
      targetId: "contact_919876543210",
      createdAt: "2026-08-13T10:00:00.000Z",
    });
    expect(result).not.toHaveProperty("text");
    expect(result).not.toHaveProperty("body");
  });
});
