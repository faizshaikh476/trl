import { describe, expect, it, vi } from "vitest";
import { CustomerBackfill, type CustomerBackfillCandidate } from "./customer-backfill";

describe("CustomerBackfill", () => {
  it("reports changes without writing in dry-run mode", async () => {
    const upsertActivity = vi.fn();
    const backfill = new CustomerBackfill(
      { listCandidates: vi.fn().mockResolvedValue([candidate("one"), candidate("two")]) },
      {
        getActivity: vi.fn().mockResolvedValue(null),
        upsertActivity,
      } as never,
    );

    const report = await backfill.run({ apply: false });

    expect(report).toEqual({
      apply: false,
      scanned: 2,
      wouldCreate: 2,
      wouldUpdate: 0,
      unchanged: 0,
      skippedNoPhone: 0,
      errors: [],
    });
    expect(upsertActivity).not.toHaveBeenCalled();
  });

  it("is idempotent and never invents historical messages", async () => {
    const records = new Map<string, CustomerBackfillCandidate["activity"]>();
    const repository = {
      getActivity: vi.fn(async (id: string) => structuredClone(records.get(id) ?? null)),
      upsertActivity: vi.fn(async (id: string, activity: CustomerBackfillCandidate["activity"]) => {
        records.set(id, structuredClone(activity));
        return structuredClone(activity);
      }),
      saveMessage: vi.fn(),
    };
    const backfill = new CustomerBackfill(
      { listCandidates: vi.fn().mockResolvedValue([candidate("one")]) },
      repository as never,
    );

    expect(await backfill.run({ apply: true })).toMatchObject({ wouldCreate: 1, unchanged: 0 });
    const first = structuredClone([...records.entries()]);
    expect(await backfill.run({ apply: true })).toMatchObject({ wouldCreate: 0, unchanged: 1 });
    expect([...records.entries()]).toEqual(first);
    expect(repository.saveMessage).not.toHaveBeenCalled();
    expect(records.get("contact_919876543210")?.historyRetainedFrom).toBe(
      "2026-08-13T10:00:00.000Z",
    );
  });

  it("skips records without a normalized phone and reports source errors", async () => {
    const backfill = new CustomerBackfill(
      {
        listCandidates: vi.fn().mockResolvedValue([
          { ...candidate("one"), activity: { ...candidate("one").activity, phone: "" } },
          { error: "workspace_bad: unable to read listings" },
        ]),
      },
      { getActivity: vi.fn(), upsertActivity: vi.fn() } as never,
    );

    expect(await backfill.run({ apply: false })).toMatchObject({
      scanned: 2,
      skippedNoPhone: 1,
      errors: ["workspace_bad: unable to read listings"],
    });
  });
});

function candidate(suffix: string): CustomerBackfillCandidate {
  const phone = suffix === "one" ? "919876543210" : "919876543211";
  return {
    activity: {
      id: `contact_${phone}`,
      phone,
      displayName: `Broker ${suffix}`,
      email: "",
      city: "Pune",
      workspaceId: `workspace_${suffix}`,
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
      firstSeenAt: "2026-08-13T10:00:00.000Z",
      lastInboundAt: null,
      lastOutboundAt: null,
      lastActivityAt: "2026-08-13T10:00:00.000Z",
      latestActivityLabel: "Imported from existing workspace data",
      tags: [],
      privateNote: "",
      followUpAt: null,
      resolution: "open",
      historyRetainedFrom: "2026-08-13T10:00:00.000Z",
    },
  };
}
