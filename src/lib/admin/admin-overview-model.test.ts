import { describe, expect, it, vi } from "vitest";
import { loadAdminOverview } from "./admin-overview-model";

describe("loadAdminOverview", () => {
  it("counts listings and leads across every workspace", async () => {
    const result = await loadAdminOverview({
      workspaces: {
        list: vi.fn().mockResolvedValue([{ id: "workspace_1" }, { id: "workspace_2" }]),
      },
      listings: {
        listAll: vi.fn().mockResolvedValue([
          { id: "listing_1", workspaceId: "workspace_1" },
          { id: "listing_2", workspaceId: "workspace_2" },
          { id: "listing_3", workspaceId: "workspace_2" },
        ]),
      },
      leads: {
        listByWorkspace: vi.fn(async (workspaceId: string) =>
          workspaceId === "workspace_1"
            ? [{ id: "lead_1" }]
            : [{ id: "lead_2" }, { id: "lead_3" }],
        ),
      },
      billing: {
        listPlans: vi.fn().mockResolvedValue([{ id: "free" }]),
      },
    } as never);

    expect(result).toMatchObject({
      workspaceCount: 2,
      listingCount: 3,
      leadCount: 3,
    });
    expect(result.plans).toHaveLength(1);
  });
});
