import type { Firestore, Transaction } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { firestorePaths } from "@/lib/firebase/paths";
import type {
  CreditGrantSourceType,
  CreditLedgerEntry,
  CreditWallet,
} from "@/types/domain";

export interface CreditWalletTransaction {
  getWallet(workspaceId: string): Promise<CreditWallet | null>;
  getLedgerEntry(
    workspaceId: string,
    entryId: string,
  ): Promise<CreditLedgerEntry | null>;
  setWallet(workspaceId: string, wallet: CreditWallet): Promise<void>;
  createLedgerEntry(workspaceId: string, entry: CreditLedgerEntry): Promise<void>;
}

export interface CreditWalletStore {
  runTransaction<T>(
    operation: (transaction: CreditWalletTransaction) => Promise<T>,
  ): Promise<T>;
  getWallet(workspaceId: string): Promise<CreditWallet | null>;
}

export interface GrantCreditsInput {
  workspaceId: string;
  quantity: number;
  validityDays: number;
  sourceId: string;
  sourceType: CreditGrantSourceType;
  reason?: string;
}

export interface ConsumeForListingInput {
  workspaceId: string;
  listingId: string;
}

export class NoListingCreditsError extends Error {
  readonly code = "NO_LISTING_CREDITS";

  constructor() {
    super("This workspace has no active listing credits.");
    this.name = "NoListingCreditsError";
  }
}

export class CreditWalletService {
  constructor(
    private readonly store: CreditWalletStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async grantCredits(input: GrantCreditsInput) {
    assertIdentifier(input.workspaceId, "workspaceId");
    assertIdentifier(input.sourceId, "sourceId");
    assertPositiveWholeNumber(input.quantity, "quantity");
    assertPositiveWholeNumber(input.validityDays, "validityDays");

    const entryId = `grant:${input.sourceType}:${input.sourceId}`;
    const now = this.now();
    const timestamp = now.toISOString();
    const validUntil = addDays(now, input.validityDays).toISOString();

    return this.store.runTransaction(async (transaction) => {
      const existingEntry = await transaction.getLedgerEntry(input.workspaceId, entryId);
      if (existingEntry) return existingEntry;

      const existingWallet = await transaction.getWallet(input.workspaceId);
      const entry: CreditLedgerEntry = {
        id: entryId,
        workspaceId: input.workspaceId,
        type: "grant",
        quantity: input.quantity,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        listingId: null,
        reason: input.reason?.trim() || defaultGrantReason(input.sourceType),
        createdAt: timestamp,
      };
      const wallet: CreditWallet = {
        availableCredits: (existingWallet?.availableCredits ?? 0) + input.quantity,
        validUntil,
        lastPurchaseId:
          input.sourceType === "purchase"
            ? input.sourceId
            : (existingWallet?.lastPurchaseId ?? null),
        createdAt: existingWallet?.createdAt ?? timestamp,
        updatedAt: timestamp,
      };

      await transaction.setWallet(input.workspaceId, wallet);
      await transaction.createLedgerEntry(input.workspaceId, entry);
      return entry;
    });
  }

  async consumeForListing(input: ConsumeForListingInput) {
    assertIdentifier(input.workspaceId, "workspaceId");
    assertIdentifier(input.listingId, "listingId");

    const entryId = `consume:listing:${input.listingId}`;
    const timestamp = this.now().toISOString();

    return this.store.runTransaction(async (transaction) => {
      const existingEntry = await transaction.getLedgerEntry(input.workspaceId, entryId);
      if (existingEntry) return consumptionResult(existingEntry);

      const wallet = await transaction.getWallet(input.workspaceId);
      if (!wallet || wallet.availableCredits <= 0 || !isActive(wallet, timestamp)) {
        throw new NoListingCreditsError();
      }

      const entry: CreditLedgerEntry = {
        id: entryId,
        workspaceId: input.workspaceId,
        type: "consume",
        quantity: -1,
        sourceType: "listing",
        sourceId: input.listingId,
        listingId: input.listingId,
        reason: "First listing publication",
        createdAt: timestamp,
      };

      await transaction.setWallet(input.workspaceId, {
        ...wallet,
        availableCredits: wallet.availableCredits - 1,
        updatedAt: timestamp,
      });
      await transaction.createLedgerEntry(input.workspaceId, entry);
      return consumptionResult(entry);
    });
  }

  async assertCanReactivate(workspaceId: string) {
    assertIdentifier(workspaceId, "workspaceId");
    const wallet = await this.store.getWallet(workspaceId);
    if (!wallet || !isActive(wallet, this.now().toISOString())) {
      throw new NoListingCreditsError();
    }
    return wallet;
  }

  async getBalance(workspaceId: string) {
    assertIdentifier(workspaceId, "workspaceId");
    return (await this.store.getWallet(workspaceId))?.availableCredits ?? 0;
  }

  async getWallet(workspaceId: string) {
    assertIdentifier(workspaceId, "workspaceId");
    return this.store.getWallet(workspaceId);
  }
}

export class FirestoreCreditWalletStore implements CreditWalletStore {
  constructor(private readonly providedDb?: Firestore) {}

  runTransaction<T>(operation: (transaction: CreditWalletTransaction) => Promise<T>) {
    const db = this.db;
    return db.runTransaction((transaction) =>
      operation(new FirestoreWalletTransaction(db, transaction)),
    );
  }

  async getWallet(workspaceId: string) {
    const snapshot = await this.db.doc(firestorePaths.workspaceWallet(workspaceId)).get();
    return snapshot.exists ? (snapshot.data() as CreditWallet) : null;
  }

  private get db() {
    return this.providedDb ?? getAdminDb();
  }
}

class FirestoreWalletTransaction implements CreditWalletTransaction {
  constructor(
    private readonly db: Firestore,
    private readonly transaction: Transaction,
  ) {}

  async getWallet(workspaceId: string) {
    const snapshot = await this.transaction.get(
      this.db.doc(firestorePaths.workspaceWallet(workspaceId)),
    );
    return snapshot.exists ? (snapshot.data() as CreditWallet) : null;
  }

  async getLedgerEntry(workspaceId: string, entryId: string) {
    const snapshot = await this.transaction.get(
      this.db.doc(firestorePaths.workspaceCreditEntry(workspaceId, entryId)),
    );
    return snapshot.exists ? (snapshot.data() as CreditLedgerEntry) : null;
  }

  async setWallet(workspaceId: string, wallet: CreditWallet) {
    this.transaction.set(this.db.doc(firestorePaths.workspaceWallet(workspaceId)), wallet);
  }

  async createLedgerEntry(workspaceId: string, entry: CreditLedgerEntry) {
    this.transaction.create(
      this.db.doc(firestorePaths.workspaceCreditEntry(workspaceId, entry.id)),
      entry,
    );
  }
}

function isActive(wallet: CreditWallet, timestamp: string) {
  const validUntil = Date.parse(wallet.validUntil);
  return Number.isFinite(validUntil) && validUntil > Date.parse(timestamp);
}

function addDays(value: Date, days: number) {
  return new Date(value.getTime() + days * 24 * 60 * 60 * 1000);
}

function assertPositiveWholeNumber(value: number, name: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive whole number.`);
  }
}

function assertIdentifier(value: string, name: string) {
  if (!value.trim() || value.includes("/")) {
    throw new Error(`${name} must be a non-empty Firestore identifier.`);
  }
}

function defaultGrantReason(sourceType: CreditGrantSourceType) {
  switch (sourceType) {
    case "purchase":
      return "Credit purchase";
    case "promotion":
      return "Promotional credit grant";
    case "migration":
      return "Initial wallet migration";
    case "onboarding":
      return "Onboarding credit grant";
  }
}

function consumptionResult(entry: CreditLedgerEntry) {
  return { ...entry, ledgerEntryId: entry.id };
}

export const creditWalletService = new CreditWalletService(
  new FirestoreCreditWalletStore(),
);
