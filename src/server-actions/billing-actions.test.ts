import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentAdmin: vi.fn(),
  listActivePlans: vi.fn(),
  updatePlan: vi.fn(),
  project: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth/current-user", () => ({ getCurrentAdmin: mocks.getCurrentAdmin }));
vi.mock("@/lib/billing/billing-service", () => ({
  billingService: {
    listActivePlans: mocks.listActivePlans,
    upsertPlan: vi.fn(),
    deletePlan: vi.fn(),
  },
  parsePlanInput: vi.fn(),
  planIdFromName: vi.fn(),
}));
vi.mock("@/lib/workspaces/workspace-service", () => ({
  workspaceService: { updatePlan: mocks.updatePlan },
}));
vi.mock("@/lib/customer-operations/customer-activity-projection", () => ({
  customerActivityProjector: { project: mocks.project },
}));

import { assignWorkspacePlanAction } from "./billing-actions";

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.getCurrentAdmin.mockResolvedValue({ id: "admin_1", role: "super_admin" });
  mocks.listActivePlans.mockResolvedValue([{ id: "starter" }]);
  mocks.updatePlan.mockResolvedValue(undefined);
  mocks.project.mockResolvedValue(undefined);
});

describe("assignWorkspacePlanAction", () => {
  it("projects the selected plan after the authoritative workspace update", async () => {
    const formData = new FormData();
    formData.set("planId", "starter");

    await assignWorkspacePlanAction("workspace_1", formData);

    expect(mocks.updatePlan).toHaveBeenCalledWith("workspace_1", "starter");
    expect(mocks.project).toHaveBeenCalledWith({
      workspaceId: "workspace_1",
      planId: "starter",
      latestActivityLabel: "Plan changed to starter",
      event: {
        type: "plan_changed",
        label: "Plan changed to starter",
        idempotencyKey: "workspace_1:starter",
        sourceId: "admin_1",
      },
    });
    expect(mocks.updatePlan.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.project.mock.invocationCallOrder[0],
    );
  });
});
