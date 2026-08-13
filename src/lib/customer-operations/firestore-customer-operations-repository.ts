import "server-only";

import { createHash } from "node:crypto";
import { getAdminDb } from "@/lib/firebase/admin";
import { firestorePaths } from "@/lib/firebase/paths";
import type {
  CustomerActivity,
  CustomerActivityCounts,
  CustomerDirectoryFilters,
  CustomerDirectoryPage,
  CustomerDirectoryQuery,
  CustomerDirectorySort,
  CustomerEvent,
  CustomerMessage,
} from "./customer-operations.types";
import type { CustomerOperationsRepository } from "./customer-operations-repository";

type DirectoryCursor = {
  sortValue: string | null;
  id: string;
  previousCursor: string | null;
};

const DEFAULT_SCAN_LIMIT = 100;

export class FirestoreCustomerOperationsRepository implements CustomerOperationsRepository {
  constructor(private readonly configuredDb: FirebaseFirestore.Firestore | null = null) {}

  private get db() {
    return this.configuredDb ?? getAdminDb();
  }

  async getActivity(contactId: string) {
    const snapshot = await this.db.doc(firestorePaths.customerActivity(contactId)).get();
    return snapshot.exists ? toActivity(snapshot.id, snapshot.data()) : null;
  }

  async upsertActivity(contactId: string, patch: Partial<CustomerActivity>) {
    const ref = this.db.doc(firestorePaths.customerActivity(contactId));
    await ref.set({ ...patch, id: contactId }, { merge: true });
    const updated = await ref.get();
    if (!updated.exists) throw new Error("Customer activity was not saved.");
    return toActivity(updated.id, updated.data());
  }

  async queryActivities(query: CustomerDirectoryQuery): Promise<CustomerDirectoryPage> {
    const sort = sortDefinition(query.sort);
    const decodedCursor = decodeDirectoryCursor(query.cursor);
    let firestoreQuery: FirebaseFirestore.Query = this.db.collection(firestorePaths.customerActivities());
    const primary = primaryConstraint(query);
    if (primary) firestoreQuery = firestoreQuery.where(primary.field, primary.operator, primary.value);
    firestoreQuery = firestoreQuery.orderBy(sort.field, sort.direction).orderBy("id", sort.direction);
    if (decodedCursor) {
      firestoreQuery = firestoreQuery.startAfter(decodedCursor.sortValue, decodedCursor.id);
    }
    const scanLimit = Math.max(DEFAULT_SCAN_LIMIT, query.pageSize * 4);
    const snapshot = await firestoreQuery.limit(scanLimit).get();
    const candidates = snapshot.docs.map((doc) => toActivity(doc.id, doc.data()));
    const matching = candidates.filter((activity) => matchesActivity(activity, query));
    const items = matching.slice(0, query.pageSize);
    const lastItem = items.at(-1);
    const lastScanned = lastItem ?? candidates.at(-1);
    const hasMore = matching.length > query.pageSize || snapshot.size === scanLimit;

    return {
      items,
      previousCursor: decodedCursor?.previousCursor ?? null,
      nextCursor:
        hasMore && lastScanned
          ? encodeDirectoryCursor({
              sortValue: sortValue(lastScanned, query.sort),
              id: lastScanned.id,
              previousCursor: query.cursor,
            })
          : null,
    };
  }

  async countActivities(): Promise<CustomerActivityCounts> {
    const collection = this.db.collection(firestorePaths.customerActivities());
    const [all, customers, prospects, needsAttention] = await Promise.all([
      collection.count().get(),
      collection.where("classification", "==", "customer").count().get(),
      collection.where("classification", "==", "prospect").count().get(),
      collection.where("stage", "==", "needs_attention").count().get(),
    ]);
    return {
      all: all.data().count,
      customers: customers.data().count,
      prospects: prospects.data().count,
      needsAttention: needsAttention.data().count,
    };
  }

  async saveMessage(message: CustomerMessage) {
    const sanitized = sanitizeMessageForPersistence(message);
    const ref = this.db.doc(
      firestorePaths.customerMessage(message.contactId, messageDocumentId(message.id)),
    );
    return this.db.runTransaction(async (transaction) => {
      const existing = await transaction.get(ref);
      if (existing.exists) return toMessage(existing.id, existing.data());
      transaction.create(ref, sanitized);
      return sanitized;
    });
  }

  async getMessage(contactId: string, messageId: string) {
    const snapshot = await this.db
      .doc(firestorePaths.customerMessage(contactId, messageDocumentId(messageId)))
      .get();
    return snapshot.exists ? toMessage(snapshot.id, snapshot.data()) : null;
  }

  async updateMessage(contactId: string, messageId: string, patch: Partial<CustomerMessage>) {
    const ref = this.db.doc(
      firestorePaths.customerMessage(contactId, messageDocumentId(messageId)),
    );
    const existing = await ref.get();
    if (!existing.exists) throw new Error("Message not found.");
    const allowedPatch: Partial<CustomerMessage> = {};
    if (patch.providerMessageId !== undefined) allowedPatch.providerMessageId = patch.providerMessageId;
    if (patch.deliveryStatus !== undefined) allowedPatch.deliveryStatus = patch.deliveryStatus;
    if (patch.failureSummary !== undefined) allowedPatch.failureSummary = patch.failureSummary;
    await ref.set(allowedPatch, { merge: true });
    const updated = await ref.get();
    return toMessage(updated.id, updated.data());
  }

  async updateMessageDelivery(
    providerMessageId: string,
    patch: Pick<CustomerMessage, "deliveryStatus" | "failureSummary">,
  ) {
    const snapshot = await this.db
      .collectionGroup("customerMessages")
      .where("providerMessageId", "==", providerMessageId)
      .limit(10)
      .get();
    if (snapshot.empty) return 0;
    const batch = this.db.batch();
    snapshot.docs.forEach((doc) => batch.set(doc.ref, patch, { merge: true }));
    await batch.commit();
    return snapshot.size;
  }

  async listMessages(contactId: string, limit = 100) {
    const snapshot = await this.db
      .collection(firestorePaths.customerMessages(contactId))
      .orderBy("createdAt", "desc")
      .limit(Math.min(Math.max(limit, 1), 250))
      .get();
    return snapshot.docs.map((doc) => toMessage(doc.id, doc.data())).reverse();
  }

  async deleteMessages(contactId: string) {
    let deleted = 0;
    while (true) {
      const snapshot = await this.db
        .collection(firestorePaths.customerMessages(contactId))
        .limit(400)
        .get();
      if (snapshot.empty) return deleted;
      const batch = this.db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      deleted += snapshot.size;
    }
  }

  async appendEvent(event: CustomerEvent) {
    const ref = this.db
      .collection(firestorePaths.customerEvents(event.contactId))
      .doc(eventDocumentId(event.id));
    await ref.set(event, { merge: false });
    return event;
  }

  async listEvents(contactId: string, limit = 100) {
    const snapshot = await this.db
      .collection(firestorePaths.customerEvents(contactId))
      .orderBy("occurredAt", "desc")
      .limit(Math.min(Math.max(limit, 1), 250))
      .get();
    return snapshot.docs.map((doc) => ({ ...doc.data(), id: String(doc.data().id ?? doc.id) }) as CustomerEvent);
  }
}

export function paginateCustomerActivityRecords(
  records: CustomerActivity[],
  query: CustomerDirectoryQuery,
): CustomerDirectoryPage {
  const decodedCursor = decodeDirectoryCursor(query.cursor);
  const ordered = [...records]
    .filter((activity) => matchesActivity(activity, query))
    .sort((left, right) => compareActivities(left, right, query.sort));
  const startIndex = decodedCursor
    ? ordered.findIndex(
        (activity) =>
          activity.id === decodedCursor.id &&
          sortValue(activity, query.sort) === decodedCursor.sortValue,
      ) + 1
    : 0;
  const safeStart = Math.max(0, startIndex);
  const items = ordered.slice(safeStart, safeStart + query.pageSize);
  const lastItem = items.at(-1);
  return {
    items,
    previousCursor: decodedCursor?.previousCursor ?? null,
    nextCursor:
      lastItem && safeStart + items.length < ordered.length
        ? encodeDirectoryCursor({
            sortValue: sortValue(lastItem, query.sort),
            id: lastItem.id,
            previousCursor: query.cursor,
          })
        : null,
  };
}

export function sanitizeMessageForPersistence(message: CustomerMessage): CustomerMessage {
  return {
    id: message.id,
    contactId: message.contactId,
    workspaceId: message.workspaceId,
    direction: message.direction,
    senderType: message.senderType,
    text: message.text,
    providerMessageId: message.providerMessageId,
    deliveryStatus: message.deliveryStatus,
    failureSummary: message.failureSummary,
    createdAt: message.createdAt,
    expiresAt: message.expiresAt,
  };
}

export function messageDocumentId(messageId: string) {
  return `message_${createHash("sha256").update(messageId).digest("hex").slice(0, 32)}`;
}

export function decodeDirectoryCursor(value: string | null): DirectoryCursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<DirectoryCursor>;
    if (
      typeof parsed.id !== "string" ||
      (typeof parsed.sortValue !== "string" && parsed.sortValue !== null) ||
      (typeof parsed.previousCursor !== "string" && parsed.previousCursor !== null)
    ) {
      return null;
    }
    return {
      id: parsed.id,
      sortValue: parsed.sortValue,
      previousCursor: parsed.previousCursor,
    };
  } catch {
    return null;
  }
}

function encodeDirectoryCursor(cursor: DirectoryCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function primaryConstraint(query: CustomerDirectoryQuery): {
  field: string;
  operator: FirebaseFirestore.WhereFilterOp;
  value: string;
} | null {
  if (query.searchToken) return { field: "searchTokens", operator: "array-contains", value: query.searchToken };
  if (query.tab !== "all") {
    return {
      field: "classification",
      operator: "==",
      value: query.tab === "customers" ? "customer" : "prospect",
    };
  }
  if (query.filters.stage) return { field: "stage", operator: "==", value: query.filters.stage };
  if (query.filters.planId) return { field: "planId", operator: "==", value: query.filters.planId };
  if (query.filters.paymentState) return { field: "paymentState", operator: "==", value: query.filters.paymentState };
  if (query.filters.walletState) return { field: "walletState", operator: "==", value: query.filters.walletState };
  return null;
}

function matchesActivity(activity: CustomerActivity, query: CustomerDirectoryQuery) {
  if (query.tab === "customers" && activity.classification !== "customer") return false;
  if (query.tab === "prospects" && activity.classification !== "prospect") return false;
  if (query.searchToken && !activity.searchTokens.includes(query.searchToken)) return false;
  const filters = query.filters;
  if (filters.stage && activity.stage !== filters.stage) return false;
  if (filters.planId && activity.planId !== filters.planId) return false;
  if (filters.paymentState && activity.paymentState !== filters.paymentState) return false;
  if (filters.walletState && activity.walletState !== filters.walletState) return false;
  return matchesFollowUp(activity, filters);
}

function matchesFollowUp(activity: CustomerActivity, filters: CustomerDirectoryFilters) {
  if (!filters.followUpState) return true;
  if (filters.followUpState === "resolved") return activity.resolution === "resolved";
  if (activity.resolution === "resolved") return false;
  if (filters.followUpState === "none") return !activity.followUpAt;
  if (!activity.followUpAt) return false;
  const isDue = Date.parse(activity.followUpAt) <= Date.now();
  return filters.followUpState === "due" ? isDue : !isDue;
}

function compareActivities(left: CustomerActivity, right: CustomerActivity, sort: CustomerDirectorySort) {
  const definition = sortDefinition(sort);
  const leftValue = sortValue(left, sort) ?? "";
  const rightValue = sortValue(right, sort) ?? "";
  const comparison = leftValue.localeCompare(rightValue);
  if (comparison !== 0) return definition.direction === "desc" ? -comparison : comparison;
  return definition.direction === "desc"
    ? right.id.localeCompare(left.id)
    : left.id.localeCompare(right.id);
}

function sortDefinition(sort: CustomerDirectorySort): {
  field: "lastActivityAt" | "firstSeenAt" | "latestPurchaseAt" | "followUpAt";
  direction: FirebaseFirestore.OrderByDirection;
} {
  if (sort === "first_seen_desc") return { field: "firstSeenAt", direction: "desc" };
  if (sort === "latest_purchase_desc") return { field: "latestPurchaseAt", direction: "desc" };
  if (sort === "follow_up_asc") return { field: "followUpAt", direction: "asc" };
  return { field: "lastActivityAt", direction: "desc" };
}

function sortValue(activity: CustomerActivity, sort: CustomerDirectorySort) {
  if (sort === "first_seen_desc") return activity.firstSeenAt;
  if (sort === "latest_purchase_desc") return activity.latestPurchaseAt;
  if (sort === "follow_up_asc") return activity.followUpAt;
  return activity.lastActivityAt;
}

function eventDocumentId(eventId: string) {
  return `event_${createHash("sha256").update(eventId).digest("hex").slice(0, 32)}`;
}

function toActivity(id: string, data: FirebaseFirestore.DocumentData | undefined) {
  return { id, ...(data ?? {}) } as CustomerActivity;
}

function toMessage(id: string, data: FirebaseFirestore.DocumentData | undefined) {
  return { id: String(data?.id ?? id), ...(data ?? {}) } as CustomerMessage;
}

export const firestoreCustomerOperationsRepository = new FirestoreCustomerOperationsRepository();
