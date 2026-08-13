import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "../src/lib/firebase/admin";
import { firestorePaths } from "../src/lib/firebase/paths";
import {
  CustomerBackfill,
  type CustomerBackfillCandidate,
  type CustomerBackfillError,
  type CustomerBackfillSource,
} from "../src/lib/customer-operations/customer-backfill";
import { buildSearchTokens, deriveJourneyStage, deriveWalletState } from "../src/lib/customer-operations/customer-state";
import type { CustomerActivity } from "../src/lib/customer-operations/customer-operations.types";
import type { CreditPurchase, CreditWallet, Listing, Workspace } from "../src/types/domain";

class FirestoreCustomerBackfillSource implements CustomerBackfillSource {
  constructor(
    private readonly db: Firestore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async listCandidates(): Promise<Array<CustomerBackfillCandidate | CustomerBackfillError>> {
    const [workspaceSnapshot, listingSnapshot, purchaseSnapshot, walletSnapshot, userSnapshot] =
      await Promise.all([
        this.db.collection(firestorePaths.workspaces()).get(),
        this.db.collectionGroup("listings").get(),
        this.db.collection(firestorePaths.purchases()).get(),
        this.db.collectionGroup("billing").get(),
        this.db.collection("users").get(),
      ]);
    const workspaces = workspaceSnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as Workspace,
    );
    const listings = listingSnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as Listing,
    );
    const purchases = purchaseSnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as CreditPurchase,
    );
    const wallets = new Map<string, CreditWallet>();
    for (const doc of walletSnapshot.docs) {
      if (doc.id !== "wallet") continue;
      const workspaceId = doc.ref.parent.parent?.id;
      if (workspaceId) wallets.set(workspaceId, doc.data() as CreditWallet);
    }
    const authenticatedUserByWorkspace = new Map<string, string>();
    for (const doc of userSnapshot.docs) {
      const workspaceId = String(doc.data().workspaceId ?? "");
      if (workspaceId && !authenticatedUserByWorkspace.has(workspaceId)) {
        authenticatedUserByWorkspace.set(workspaceId, doc.id);
      }
    }
    const now = this.now();
    const historyRetainedFrom = now.toISOString();

    return workspaces.map((workspace) => {
      try {
        const phone = workspace.contactPhone?.replace(/\D/g, "") ?? "";
        const workspaceListings = listings.filter(
          (listing) => listing.workspaceId === workspace.id,
        );
        const workspacePurchases = purchases
          .filter((purchase) => purchase.workspaceId === workspace.id)
          .sort((a, b) => timeOf(b.updatedAt) - timeOf(a.updatedAt));
        const latestPurchase = workspacePurchases[0] ?? null;
        const paidPurchase = workspacePurchases.find((purchase) => purchase.status === "paid");
        const wallet = deriveWalletState(
          wallets.get(workspace.id) ?? null,
          wallets.get(workspace.id)?.availableCredits ?? 0,
          now,
        );
        const listingCounts = {
          total: workspaceListings.length,
          ready: workspaceListings.filter((listing) => listing.status === "ready_to_publish").length,
          published: workspaceListings.filter((listing) => listing.status === "published").length,
        };
        const authenticatedUserId = authenticatedUserByWorkspace.get(workspace.id) ?? null;
        const classification = paidPurchase || authenticatedUserId ? "customer" : "prospect";
        const paymentState = latestPurchase?.status ?? "none";
        const stage = deriveJourneyStage({
          needsAttention: paymentState === "failed",
          paymentFailed: paymentState === "failed",
          paymentPending: paymentState === "pending",
          hasReadyListing: listingCounts.ready > 0,
          hasIntake: listingCounts.total > 0,
          isCustomer: classification === "customer",
        });
        const latestActivityAt = latestTimestamp([
          workspace.updatedAt,
          latestPurchase?.updatedAt,
          ...workspaceListings.map((listing) => listing.updatedAt),
        ]) ?? workspace.createdAt ?? historyRetainedFrom;
        return {
          activity: {
            id: phone ? `contact_${phone}` : `workspace_${workspace.id}`,
            phone,
            displayName: workspace.contactName || workspace.name,
            email: workspace.contactEmail?.toLowerCase() ?? "",
            city: workspace.city ?? "",
            workspaceId: workspace.id,
            authenticatedUserId,
            classification,
            stage,
            walletState: wallet.state,
            effectiveCredits: wallet.effectiveCredits,
            planId: workspace.planId,
            paymentState,
            latestPurchaseAt: paidPurchase?.paidAt ?? latestPurchase?.updatedAt ?? null,
            listingCounts,
            searchTokens: buildSearchTokens([
              workspace.name,
              workspace.contactName,
              workspace.contactEmail,
              phone,
              workspace.id,
              workspace.planId,
            ]),
            firstSeenAt: workspace.createdAt ?? latestActivityAt,
            lastInboundAt: null,
            lastOutboundAt: null,
            lastActivityAt: latestActivityAt,
            latestActivityLabel: "Imported from existing workspace data",
            tags: [],
            privateNote: "",
            followUpAt: null,
            resolution: "open",
            historyRetainedFrom,
          },
        } satisfies CustomerBackfillCandidate;
      } catch (error) {
        return {
          error: `${workspace.id}: ${error instanceof Error ? error.message : "unable to project"}`,
        } satisfies CustomerBackfillError;
      }
    });
  }
}

class FirestoreBackfillRepository {
  constructor(private readonly db: Firestore) {}

  async getActivity(contactId: string) {
    const snapshot = await this.db.doc(firestorePaths.customerActivity(contactId)).get();
    return snapshot.exists
      ? ({ id: snapshot.id, ...snapshot.data() } as CustomerActivity)
      : null;
  }

  async upsertActivity(contactId: string, activity: CustomerActivity) {
    await this.db.doc(firestorePaths.customerActivity(contactId)).set(activity);
    return activity;
  }
}

async function main() {
  loadLocalEnv();
  const apply = process.argv.includes("--apply");
  const db = getAdminDb();
  const backfill = new CustomerBackfill(
    new FirestoreCustomerBackfillSource(db),
    new FirestoreBackfillRepository(db),
  );
  const report = await backfill.run({ apply });
  console.log(JSON.stringify(report, null, 2));
  if (!apply) console.log("Dry run complete. No writes performed.");
  if (report.errors.length) process.exitCode = 1;
}

function latestTimestamp(values: Array<string | null | undefined>) {
  return values
    .filter((value): value is string => Boolean(value) && Number.isFinite(Date.parse(value!)))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;
}

function timeOf(value: string | null | undefined) {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function loadLocalEnv() {
  for (const filename of [".env.local", ".env"]) {
    const path = resolve(process.cwd(), filename);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match || process.env[match[1]] !== undefined) continue;
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "").replace(/\\n/g, "\n");
    }
  }
}

if (process.argv[1]?.endsWith("backfill-customer-activity.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
