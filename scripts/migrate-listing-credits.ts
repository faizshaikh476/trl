import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "../src/lib/firebase/admin";
import { firestorePaths } from "../src/lib/firebase/paths";
import type {
  CreditLedgerEntry,
  CreditWallet,
  Listing,
  Plan,
  Workspace,
} from "../src/types/domain";

export interface MigrationDocument {
  path: string;
  data: Record<string, unknown>;
  merge: boolean;
}

export interface ListingCreditMigrationInput {
  now: string;
  plans: Plan[];
  workspaces: Workspace[];
  wallets: Map<string, CreditWallet>;
  listings: Listing[];
  ledgerEntries: Map<string, CreditLedgerEntry>;
}

export interface ListingCreditMigration {
  planWrites: MigrationDocument[];
  walletWrites: MigrationDocument[];
  ledgerWrites: MigrationDocument[];
  listingWrites: MigrationDocument[];
}

const DEFAULT_CREDIT_VALIDITY_DAYS = 30;
const DEFAULT_LISTING_VISIBILITY_DAYS = 60;

export function buildListingCreditMigration(
  input: ListingCreditMigrationInput,
): ListingCreditMigration {
  const normalizedPlans = input.plans.map((plan) => normalizePlan(plan, input.now));
  const plansById = new Map(normalizedPlans.map((plan) => [plan.id, plan]));
  const migratedPublishedCounts = countMigratedPublishedListings(input.listings, input.ledgerEntries);

  const planWrites = normalizedPlans
    .filter((plan) => hasPlanMigrationPatch(input.plans.find((candidate) => candidate.id === plan.id), plan))
    .map((plan) => document(firestorePaths.plan(plan.id), toDocumentData(plan), true));

  const walletWrites: MigrationDocument[] = [];
  const ledgerWrites: MigrationDocument[] = [];
  const listingWrites: MigrationDocument[] = [];

  for (const workspace of input.workspaces) {
    const plan = plansById.get(workspace.planId) ?? normalizedPlans[0];
    if (!plan) continue;

    const entryId = `migration:initial-wallet:${workspace.id}`;
    if (!input.ledgerEntries.has(ledgerKey(workspace.id, entryId))) {
      const existingWallet = input.wallets.get(workspace.id);
      const validUntil = addDays(new Date(input.now), plan.creditValidityDays).toISOString();
      const migratedAvailableCredits = Math.max(
        0,
        plan.listingCredits - (migratedPublishedCounts.get(workspace.id) ?? 0),
      );
      const migratedWallet: CreditWallet = {
        availableCredits: Math.max(
          existingWallet?.availableCredits ?? 0,
          migratedAvailableCredits,
        ),
        validUntil: maxTimestamp(existingWallet?.validUntil, validUntil) ?? validUntil,
        lastPurchaseId: existingWallet?.lastPurchaseId ?? null,
        createdAt: existingWallet?.createdAt ?? input.now,
        updatedAt: input.now,
      };
      const entry: CreditLedgerEntry = {
        id: entryId,
        workspaceId: workspace.id,
        type: "grant",
        quantity: plan.listingCredits,
        sourceType: "migration",
        sourceId: `initial-wallet:${workspace.id}`,
        listingId: null,
        reason: "Initial listing credit migration",
        createdAt: input.now,
      };

      walletWrites.push(
        document(firestorePaths.workspaceWallet(workspace.id), toDocumentData(migratedWallet), true),
      );
      ledgerWrites.push(
        document(firestorePaths.workspaceCreditEntry(workspace.id, entry.id), toDocumentData(entry), false),
      );
    }
  }

  for (const listing of input.listings) {
    if (listing.status !== "published") continue;

    const entryId = `migration:existing-listing:${listing.id}`;
    const hasLedger = input.ledgerEntries.has(ledgerKey(listing.workspaceId, entryId));
    const workspace = input.workspaces.find((candidate) => candidate.id === listing.workspaceId);
    const plan = workspace ? plansById.get(workspace.planId) : normalizedPlans[0];
    const visibilityDays = plan?.listingVisibilityDays ?? DEFAULT_LISTING_VISIBILITY_DAYS;
    const basis = parseTimestamp(listing.publishedAt) ?? parseTimestamp(listing.updatedAt);
    const migratedExpiry = basis ? addDays(basis, visibilityDays).toISOString() : null;
    const expiresAt = maxTimestamp(listing.expiresAt, migratedExpiry);
    const patch: Partial<Listing> = {};

    if (!hasLedger && !listing.creditLedgerEntryId && !listing.creditConsumedAt) {
      const entry: CreditLedgerEntry = {
        id: entryId,
        workspaceId: listing.workspaceId,
        type: "consume",
        quantity: -1,
        sourceType: "listing",
        sourceId: listing.id,
        listingId: listing.id,
        reason: "Existing published listing migration",
        createdAt: input.now,
      };
      ledgerWrites.push(
        document(firestorePaths.workspaceCreditEntry(listing.workspaceId, entry.id), toDocumentData(entry), false),
      );
      patch.creditLedgerEntryId = entry.id;
      patch.creditConsumedAt = input.now;
    }

    if (expiresAt && expiresAt !== listing.expiresAt) {
      patch.expiresAt = expiresAt;
    }

    if (Object.keys(patch).length > 0) {
      listingWrites.push(
        document(firestorePaths.workspaceListing(listing.workspaceId, listing.id), toDocumentData(patch), true),
      );
    }
  }

  return { planWrites, walletWrites, ledgerWrites, listingWrites };
}

async function main() {
  loadLocalEnv();
  const apply = process.argv.includes("--apply");
  const db = getAdminDb();
  const migration = await readFirestoreMigration(db);
  const writes = [
    ...migration.planWrites,
    ...migration.walletWrites,
    ...migration.ledgerWrites,
    ...migration.listingWrites,
  ];

  console.log(
    [
      apply ? "Applying listing credit migration." : "Dry run: listing credit migration.",
      `Plans: ${migration.planWrites.length}`,
      `Wallets: ${migration.walletWrites.length}`,
      `Ledger entries: ${migration.ledgerWrites.length}`,
      `Listings: ${migration.listingWrites.length}`,
      `Total writes: ${writes.length}`,
    ].join("\n"),
  );

  if (!apply) {
    console.log("No writes performed. Re-run with --apply to commit changes.");
    return;
  }

  await commitWrites(db, writes);
  console.log("Listing credit migration complete.");
}

async function readFirestoreMigration(db: Firestore) {
  const [planSnapshot, workspaceSnapshot, walletSnapshot, listingSnapshot, ledgerSnapshot] =
    await Promise.all([
      db.collection(firestorePaths.plans()).get(),
      db.collection(firestorePaths.workspaces()).get(),
      db.collectionGroup("billing").get(),
      db.collectionGroup("listings").get(),
      db.collectionGroup("creditLedger").get(),
    ]);
  const walletEntries: Array<[string, CreditWallet]> = [];
  for (const doc of walletSnapshot.docs) {
    if (doc.id !== "wallet") continue;
    const workspaceId = doc.ref.parent.parent?.id;
    if (!workspaceId) continue;
    walletEntries.push([workspaceId, doc.data() as CreditWallet]);
  }

  return buildListingCreditMigration({
    now: new Date().toISOString(),
    plans: planSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Plan),
    workspaces: workspaceSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Workspace),
    wallets: new Map(walletEntries),
    listings: listingSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Listing),
    ledgerEntries: new Map(
      ledgerSnapshot.docs.map((doc) => {
        const entry = { id: doc.id, ...doc.data() } as CreditLedgerEntry;
        return [ledgerKey(entry.workspaceId, entry.id), entry];
      }),
    ),
  });
}

async function commitWrites(db: Firestore, writes: MigrationDocument[]) {
  let batch = db.batch();
  let operations = 0;

  for (const write of writes) {
    const ref = db.doc(write.path);
    if (write.merge) batch.set(ref, write.data, { merge: true });
    else batch.create(ref, write.data);
    operations += 1;

    if (operations % 450 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  if (operations % 450 !== 0) await batch.commit();
}

function normalizePlan(plan: Plan, now: string): Plan {
  const legacyAmountPaise = parseLegacyAmountPaise(plan.priceLabel);
  const storedAmountPaise = readWholeNumber(plan.amountPaise, 0);
  const amountPaise =
    storedAmountPaise && storedAmountPaise > 0
      ? storedAmountPaise
      : legacyAmountPaise || storedAmountPaise || 0;
  const listingCredits =
    readWholeNumber(plan.listingCredits, 1) ?? readWholeNumber(plan.activeListingLimit, 1) ?? 0;
  return {
    ...plan,
    description: readText(plan.description) ?? "",
    amountPaise,
    currency: "INR",
    listingCredits,
    creditValidityDays:
      readWholeNumber(plan.creditValidityDays, 1) ?? DEFAULT_CREDIT_VALIDITY_DAYS,
    listingVisibilityDays:
      readWholeNumber(plan.listingVisibilityDays, 1) ?? DEFAULT_LISTING_VISIBILITY_DAYS,
    featured: plan.featured === true,
    priceLabel: plan.priceLabel ?? formatPriceLabel(amountPaise),
    activeListingLimit: listingCredits,
    createdAt: readText(plan.createdAt) ?? now,
    updatedAt: now,
  };
}

function hasPlanMigrationPatch(before: Plan | undefined, after: Plan) {
  if (!before) return true;
  return (
    before.amountPaise !== after.amountPaise ||
    before.currency !== after.currency ||
    before.listingCredits !== after.listingCredits ||
    before.creditValidityDays !== after.creditValidityDays ||
    before.listingVisibilityDays !== after.listingVisibilityDays ||
    before.featured !== after.featured ||
    before.activeListingLimit !== after.activeListingLimit
  );
}

function document(path: string, data: Record<string, unknown>, merge: boolean): MigrationDocument {
  return { path, data, merge };
}

function toDocumentData(value: object) {
  return value as Record<string, unknown>;
}

function ledgerKey(workspaceId: string, entryId: string) {
  return `${workspaceId}/${entryId}`;
}

function countMigratedPublishedListings(
  listings: Listing[],
  ledgerEntries: Map<string, CreditLedgerEntry>,
) {
  const counts = new Map<string, number>();
  for (const listing of listings) {
    if (listing.status !== "published") continue;
    if (listing.creditLedgerEntryId || listing.creditConsumedAt) continue;

    const entryId = `migration:existing-listing:${listing.id}`;
    if (ledgerEntries.has(ledgerKey(listing.workspaceId, entryId))) continue;

    counts.set(listing.workspaceId, (counts.get(listing.workspaceId) ?? 0) + 1);
  }
  return counts;
}

function addDays(value: Date, days: number) {
  return new Date(value.getTime() + days * 24 * 60 * 60 * 1000);
}

function maxTimestamp(first: string | null | undefined, second: string | null | undefined) {
  const firstDate = parseTimestamp(first);
  const secondDate = parseTimestamp(second);
  if (!firstDate) return secondDate?.toISOString() ?? null;
  if (!secondDate) return firstDate.toISOString();
  return firstDate.getTime() >= secondDate.getTime()
    ? firstDate.toISOString()
    : secondDate.toISOString();
}

function parseTimestamp(value: string | null | undefined) {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time) : null;
}

function readWholeNumber(value: unknown, minimum: number) {
  return typeof value === "number" && Number.isInteger(value) && value >= minimum ? value : null;
}

function readText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseLegacyAmountPaise(priceLabel: unknown) {
  const label = readText(priceLabel);
  if (!label) return 0;
  const numeric = label.replace(/[^0-9.]/g, "");
  if (!numeric) return 0;
  const rupees = Number(numeric);
  if (!Number.isFinite(rupees) || rupees < 0) return 0;
  return Math.round(rupees * 100);
}

function formatPriceLabel(amountPaise: number) {
  if (amountPaise <= 0) return "Free";
  return `₹${new Intl.NumberFormat("en-IN").format(amountPaise / 100)}`;
}

function loadLocalEnv() {
  const roots = [process.cwd(), resolve(process.cwd(), ".."), resolve(process.cwd(), "../..")];
  const seen = new Set<string>();

  for (const root of roots) {
    for (const file of [".env.local", ".env"]) {
      const path = resolve(root, file);
      if (seen.has(path)) continue;
      seen.add(path);
      if (!existsSync(path)) continue;

      for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        const separator = trimmed.indexOf("=");
        if (separator === -1) continue;

        const key = trimmed.slice(0, separator).trim();
        const rawValue = trimmed.slice(separator + 1).trim();
        if (process.env[key]) continue;
        process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
      }
    }
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
