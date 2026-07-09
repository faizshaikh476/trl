import { beforeEach, describe, expect, it } from "vitest";
import type { CreditLedgerEntry, CreditWallet } from "@/types/domain";
import {
  CreditWalletService,
  NoListingCreditsError,
  type CreditWalletStore,
  type CreditWalletTransaction,
} from "./credit-wallet-service";

class InMemoryCreditWalletStore implements CreditWalletStore {
  private wallets = new Map<string, CreditWallet>();
  private ledger = new Map<string, CreditLedgerEntry>();
  private pending = Promise.resolve();

  runTransaction<T>(operation: (transaction: CreditWalletTransaction) => Promise<T>) {
    const result = this.pending.then(async () => {
      const wallets = new Map(
        [...this.wallets].map(([key, value]) => [key, structuredClone(value)]),
      );
      const ledger = new Map(
        [...this.ledger].map(([key, value]) => [key, structuredClone(value)]),
      );
      const transaction: CreditWalletTransaction = {
        getWallet: async (workspaceId) => structuredClone(wallets.get(workspaceId) ?? null),
        getLedgerEntry: async (workspaceId, entryId) =>
          structuredClone(ledger.get(this.ledgerKey(workspaceId, entryId)) ?? null),
        setWallet: async (workspaceId, wallet) => {
          wallets.set(workspaceId, structuredClone(wallet));
        },
        createLedgerEntry: async (workspaceId, entry) => {
          const key = this.ledgerKey(workspaceId, entry.id);
          if (ledger.has(key)) throw new Error(`Ledger entry ${entry.id} already exists.`);
          ledger.set(key, structuredClone(entry));
        },
      };

      const value = await operation(transaction);
      this.wallets = wallets;
      this.ledger = ledger;
      return value;
    });
    this.pending = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async getWallet(workspaceId: string) {
    return structuredClone(this.wallets.get(workspaceId) ?? null);
  }

  async getLedgerEntry(workspaceId: string, entryId: string) {
    return structuredClone(this.ledger.get(this.ledgerKey(workspaceId, entryId)) ?? null);
  }

  private ledgerKey(workspaceId: string, entryId: string) {
    return `${workspaceId}/${entryId}`;
  }
}

describe("CreditWalletService", () => {
  let now: Date;
  let store: InMemoryCreditWalletStore;
  let service: CreditWalletService;

  beforeEach(() => {
    now = new Date("2026-07-09T10:00:00.000Z");
    store = new InMemoryCreditWalletStore();
    service = new CreditWalletService(store, () => now);
  });

  it("grants a source exactly once with a deterministic ledger entry", async () => {
    const input = {
      workspaceId: "workspace_1",
      quantity: 10,
      validityDays: 30,
      sourceId: "purchase_1",
      sourceType: "purchase" as const,
    };

    const first = await service.grantCredits(input);
    const duplicate = await service.grantCredits(input);

    expect(first).toEqual(duplicate);
    expect(first.id).toBe("grant:purchase:purchase_1");
    expect(await service.getBalance("workspace_1")).toBe(10);
    expect(await store.getLedgerEntry("workspace_1", first.id)).toEqual(first);
  });

  it("consumes one credit per listing exactly once and exposes no refund operation", async () => {
    await service.grantCredits({
      workspaceId: "workspace_1",
      quantity: 10,
      validityDays: 30,
      sourceId: "purchase_1",
      sourceType: "purchase",
    });

    const first = await service.consumeForListing({
      workspaceId: "workspace_1",
      listingId: "listing_1",
    });
    const duplicate = await service.consumeForListing({
      workspaceId: "workspace_1",
      listingId: "listing_1",
    });

    expect(first).toEqual(duplicate);
    expect(first).toMatchObject({
      id: "consume:listing:listing_1",
      ledgerEntryId: "consume:listing:listing_1",
      quantity: -1,
      type: "consume",
      listingId: "listing_1",
    });
    expect(await service.getBalance("workspace_1")).toBe(9);
    expect(
      (service as unknown as Record<string, unknown>).refundForListing,
    ).toBeUndefined();
  });

  it("carries unused credits forward and resets expiry from the latest grant", async () => {
    await service.grantCredits({
      workspaceId: "workspace_1",
      quantity: 10,
      validityDays: 30,
      sourceId: "purchase_1",
      sourceType: "purchase",
    });
    now = new Date("2026-07-20T12:30:00.000Z");

    await service.grantCredits({
      workspaceId: "workspace_1",
      quantity: 5,
      validityDays: 30,
      sourceId: "purchase_2",
      sourceType: "purchase",
    });

    expect(await service.getBalance("workspace_1")).toBe(15);
    expect(await store.getWallet("workspace_1")).toMatchObject({
      availableCredits: 15,
      validUntil: "2026-08-19T12:30:00.000Z",
      lastPurchaseId: "purchase_2",
      createdAt: "2026-07-09T10:00:00.000Z",
      updatedAt: "2026-07-20T12:30:00.000Z",
    });
  });

  it("rejects consumption from missing, empty, or expired wallets without writing a ledger entry", async () => {
    await expect(
      service.consumeForListing({
        workspaceId: "missing_workspace",
        listingId: "listing_missing",
      }),
    ).rejects.toBeInstanceOf(NoListingCreditsError);

    await service.grantCredits({
      workspaceId: "workspace_1",
      quantity: 1,
      validityDays: 1,
      sourceId: "purchase_1",
      sourceType: "purchase",
    });
    await service.consumeForListing({
      workspaceId: "workspace_1",
      listingId: "listing_1",
    });
    await expect(
      service.consumeForListing({
        workspaceId: "workspace_1",
        listingId: "listing_2",
      }),
    ).rejects.toBeInstanceOf(NoListingCreditsError);

    now = new Date("2026-07-10T10:00:00.000Z");
    await expect(
      service.consumeForListing({
        workspaceId: "workspace_1",
        listingId: "listing_3",
      }),
    ).rejects.toBeInstanceOf(NoListingCreditsError);
    expect(
      await store.getLedgerEntry("workspace_1", "consume:listing:listing_3"),
    ).toBeNull();
  });

  it("allows free reactivation while the wallet is active even at zero balance", async () => {
    await service.grantCredits({
      workspaceId: "workspace_1",
      quantity: 1,
      validityDays: 1,
      sourceId: "purchase_1",
      sourceType: "purchase",
    });
    await service.consumeForListing({
      workspaceId: "workspace_1",
      listingId: "listing_1",
    });

    await expect(service.assertCanReactivate("workspace_1")).resolves.toMatchObject({
      availableCredits: 0,
    });

    now = new Date("2026-07-10T10:00:00.000Z");
    await expect(service.assertCanReactivate("workspace_1")).rejects.toBeInstanceOf(
      NoListingCreditsError,
    );
  });
});
