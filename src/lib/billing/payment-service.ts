import crypto from "node:crypto";
import type { Firestore, Transaction } from "firebase-admin/firestore";
import { billingService } from "@/lib/billing/billing-service";
import { creditWalletService } from "@/lib/billing/credit-wallet-service";
import { getAdminDb } from "@/lib/firebase/admin";
import { firestorePaths } from "@/lib/firebase/paths";
import type { CreditLedgerEntry, CreditPurchase, Plan } from "@/types/domain";
import { getRazorpayOrderClient } from "./razorpay-client";

export interface PaymentOrderClient {
  create(input: {
    amount: number;
    currency: string;
    receipt: string;
    notes: Record<string, string>;
  }): Promise<{ id: string }>;
}

export interface PaymentStore {
  runTransaction<T>(operation: (transaction: PaymentStore) => Promise<T>): Promise<T>;
  createPurchase(purchase: CreditPurchase, idempotencyKey: string): Promise<CreditPurchase>;
  setPurchaseProviderOrderId(
    purchaseId: string,
    providerOrderId: string,
    updatedAt: string,
  ): Promise<CreditPurchase>;
  findPurchaseById(purchaseId: string): Promise<CreditPurchase | null>;
  findPurchaseByProviderOrderId(providerOrderId: string): Promise<CreditPurchase | null>;
  markPaid(input: {
    purchaseId: string;
    providerPaymentId: string;
    providerEventId?: string | null;
    paidAt: string;
  }): Promise<{ purchase: CreditPurchase; changed: boolean }>;
  markFailed(input: {
    purchaseId: string;
    providerPaymentId?: string | null;
    providerEventId?: string | null;
    failureReason: string;
    failedAt: string;
  }): Promise<CreditPurchase>;
  markRefunded(input: {
    purchaseId: string;
    providerRefundId: string;
    providerEventId?: string | null;
    refundedAt: string;
  }): Promise<CreditPurchase>;
  markCreditsGranted(input: {
    purchaseId: string;
    creditGrantLedgerEntryId: string;
    creditsGrantedAt: string;
  }): Promise<CreditPurchase>;
  hasProviderEvent(providerEventId: string): Promise<boolean>;
  recordProviderEvent(providerEventId: string): Promise<boolean>;
}

export interface PaymentServiceDependencies {
  store: PaymentStore;
  orders: PaymentOrderClient;
  keySecret: string;
  webhookSecret: string;
  publicKey?: string | null;
  plans: {
    findActivePlan(planId: string): Promise<Plan | null>;
  };
  wallet: {
    grantCredits(input: {
      workspaceId: string;
      quantity: number;
      validityDays: number;
      sourceId: string;
      sourceType: "purchase";
    }): Promise<CreditLedgerEntry>;
  };
  now?: () => Date;
}

export interface CreatePaymentOrderInput {
  workspaceId: string;
  planId: string;
  idempotencyKey: string;
}

export interface CheckoutVerificationInput {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  workspaceId?: string;
}

export class PaymentService {
  private readonly now: () => Date;

  constructor(private readonly dependencies: PaymentServiceDependencies) {
    this.now = dependencies.now ?? (() => new Date());
  }

  async createOrder(input: CreatePaymentOrderInput) {
    assertIdentifier(input.workspaceId, "workspaceId");
    assertIdentifier(input.planId, "planId");
    if (!input.idempotencyKey.trim()) throw new Error("idempotencyKey is required.");

    const plan = await this.dependencies.plans.findActivePlan(input.planId);
    if (!plan) throw new Error("Selected package is not available.");
    assertPurchasablePlan(plan);

    const timestamp = this.now().toISOString();
    const purchase: CreditPurchase = {
      id: purchaseIdFor(input),
      workspaceId: input.workspaceId,
      planId: plan.id,
      quantity: plan.listingCredits,
      validityDays: plan.creditValidityDays,
      amountPaise: plan.amountPaise,
      currency: plan.currency,
      status: "pending",
      provider: "razorpay",
      providerOrderId: null,
      providerPaymentId: null,
      providerRefundId: null,
      providerEventIds: [],
      creditGrantLedgerEntryId: null,
      creditsGrantedAt: null,
      failureReason: null,
      paidAt: null,
      refundedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const stored = await this.dependencies.store.createPurchase(
      purchase,
      input.idempotencyKey,
    );
    if (stored.providerOrderId) return orderResponse(stored, plan, this.dependencies.publicKey);

    const order = await this.dependencies.orders.create({
      amount: stored.amountPaise,
      currency: stored.currency,
      receipt: stored.id,
      notes: {
        purchaseId: stored.id,
        workspaceId: stored.workspaceId,
        planId: stored.planId,
      },
    });
    const updated = await this.dependencies.store.setPurchaseProviderOrderId(
      stored.id,
      order.id,
      this.now().toISOString(),
    );

    return orderResponse(updated, plan, this.dependencies.publicKey);
  }

  async verifyCheckout(input: CheckoutVerificationInput) {
    assertConfiguredSecret(this.dependencies.keySecret, "RAZORPAY_KEY_SECRET");
    const orderId = requiredString(input.razorpay_order_id, "razorpay_order_id");
    const paymentId = requiredString(input.razorpay_payment_id, "razorpay_payment_id");
    const signature = requiredString(input.razorpay_signature, "razorpay_signature");
    const expected = hmac(`${orderId}|${paymentId}`, this.dependencies.keySecret);

    if (!timingSafeEqualHex(signature, expected)) {
      throw new Error("Invalid Razorpay checkout signature");
    }

    const result = await this.dependencies.store.runTransaction(async (transaction) => {
      const purchase = await transaction.findPurchaseByProviderOrderId(orderId);
      if (!purchase) throw new Error("Purchase not found for Razorpay order.");
      if (input.workspaceId && purchase.workspaceId !== input.workspaceId) {
        throw new Error("Checkout does not match this workspace.");
      }
      return transaction.markPaid({
        purchaseId: purchase.id,
        providerPaymentId: paymentId,
        paidAt: this.now().toISOString(),
      });
    });

    return this.ensurePurchaseCreditsGranted(result.purchase);
  }

  async processWebhook(rawBody: string, signature: string | null) {
    assertConfiguredSecret(this.dependencies.webhookSecret, "RAZORPAY_WEBHOOK_SECRET");
    const providedSignature = requiredString(signature ?? "", "x-razorpay-signature");
    const expected = hmac(rawBody, this.dependencies.webhookSecret);
    if (!timingSafeEqualHex(providedSignature, expected)) {
      throw new Error("Invalid Razorpay webhook signature");
    }

    const event = parseWebhookEvent(rawBody);
    switch (event.event) {
      case "payment.captured":
        return this.processCapturedPayment(event);
      case "payment.failed":
        return this.processFailedPayment(event);
      case "refund.processed":
        return this.processProcessedRefund(event);
      default:
        return { processed: false, duplicate: false };
    }
  }

  private async processCapturedPayment(event: RazorpayWebhookEvent) {
    const payment = paymentEntity(event);
    const orderId = requiredString(payment.order_id, "payment.order_id");
    const paymentId = requiredString(payment.id, "payment.id");

    const result = await this.dependencies.store.runTransaction(async (transaction) => {
      const purchase = await transaction.findPurchaseByProviderOrderId(orderId);
      if (!purchase) return { processed: false, duplicate: false, purchase: null };
      if (purchase.providerEventIds.includes(event.id) && purchase.creditGrantLedgerEntryId) {
        return { processed: false, duplicate: true, purchase };
      }

      const paid = await transaction.markPaid({
        purchaseId: purchase.id,
        providerPaymentId: paymentId,
        paidAt: this.now().toISOString(),
      });
      return {
        processed: true,
        duplicate: false,
        purchase: paid.purchase,
        eventAlreadyRecorded: purchase.providerEventIds.includes(event.id),
      };
    });

    if (result.processed && result.purchase) {
      const purchase = await this.ensurePurchaseCreditsGranted(result.purchase);
      if (!result.eventAlreadyRecorded) {
        await this.dependencies.store.markPaid({
          purchaseId: purchase.id,
          providerPaymentId: paymentId,
          providerEventId: event.id,
          paidAt: purchase.paidAt ?? this.now().toISOString(),
        });
      }
    }
    return { processed: result.processed, duplicate: result.duplicate };
  }

  private async processFailedPayment(event: RazorpayWebhookEvent) {
    const payment = paymentEntity(event);
    const orderId = requiredString(payment.order_id, "payment.order_id");

    return this.dependencies.store.runTransaction(async (transaction) => {
      const purchase = await transaction.findPurchaseByProviderOrderId(orderId);
      if (!purchase) return { processed: false, duplicate: false };
      if (purchase.providerEventIds.includes(event.id)) {
        return { processed: false, duplicate: true };
      }
      await transaction.markFailed({
        purchaseId: purchase.id,
        providerPaymentId: typeof payment.id === "string" ? payment.id : null,
        providerEventId: event.id,
        failureReason:
          readString(payment.error_description) ??
          readString(payment.error_reason) ??
          "Razorpay reported payment failure.",
        failedAt: this.now().toISOString(),
      });
      return { processed: true, duplicate: false };
    });
  }

  private async processProcessedRefund(event: RazorpayWebhookEvent) {
    const payment = paymentEntity(event);
    const refund = refundEntity(event);
    const orderId = requiredString(payment.order_id, "payment.order_id");
    const refundId = requiredString(refund.id, "refund.id");

    return this.dependencies.store.runTransaction(async (transaction) => {
      const purchase = await transaction.findPurchaseByProviderOrderId(orderId);
      if (!purchase) return { processed: false, duplicate: false };
      if (purchase.providerEventIds.includes(event.id)) {
        return { processed: false, duplicate: true };
      }
      await transaction.markRefunded({
        purchaseId: purchase.id,
        providerRefundId: refundId,
        providerEventId: event.id,
        refundedAt: this.now().toISOString(),
      });
      return { processed: true, duplicate: false };
    });
  }

  private grantPurchaseCredits(purchase: CreditPurchase) {
    return this.dependencies.wallet.grantCredits({
      workspaceId: purchase.workspaceId,
      quantity: purchase.quantity,
      validityDays: purchase.validityDays,
      sourceId: purchase.id,
      sourceType: "purchase",
    });
  }

  private async ensurePurchaseCreditsGranted(purchase: CreditPurchase) {
    if (purchase.creditGrantLedgerEntryId) return purchase;
    const entry = await this.grantPurchaseCredits(purchase);
    return this.dependencies.store.markCreditsGranted({
      purchaseId: purchase.id,
      creditGrantLedgerEntryId: entry.id,
      creditsGrantedAt: this.now().toISOString(),
    });
  }
}

export class FirestorePaymentStore implements PaymentStore {
  constructor(private readonly providedDb?: Firestore) {}

  runTransaction<T>(operation: (transaction: PaymentStore) => Promise<T>) {
    return this.db.runTransaction((transaction) =>
      operation(new FirestorePaymentTransaction(this.db, transaction)),
    );
  }

  async createPurchase(purchase: CreditPurchase) {
    const ref = this.db.doc(firestorePaths.purchase(purchase.id));
    const snapshot = await ref.get();
    if (snapshot.exists) return snapshot.data() as CreditPurchase;
    await ref.create(purchase);
    return purchase;
  }

  async setPurchaseProviderOrderId(
    purchaseId: string,
    providerOrderId: string,
    updatedAt: string,
  ) {
    const ref = this.db.doc(firestorePaths.purchase(purchaseId));
    await ref.update({ providerOrderId, updatedAt });
    const snapshot = await ref.get();
    return snapshot.data() as CreditPurchase;
  }

  async findPurchaseById(purchaseId: string) {
    const snapshot = await this.db.doc(firestorePaths.purchase(purchaseId)).get();
    return snapshot.exists ? (snapshot.data() as CreditPurchase) : null;
  }

  async findPurchaseByProviderOrderId(providerOrderId: string) {
    const snapshot = await this.db
      .collection(firestorePaths.purchases())
      .where("providerOrderId", "==", providerOrderId)
      .limit(1)
      .get();
    return snapshot.empty ? null : (snapshot.docs[0].data() as CreditPurchase);
  }

  async markPaid(input: {
    purchaseId: string;
    providerPaymentId: string;
    providerEventId?: string | null;
    paidAt: string;
  }) {
    return markPaidRecord(await this.requirePurchase(input.purchaseId), input, async (purchase) => {
      await this.db.doc(firestorePaths.purchase(purchase.id)).set(purchase);
    });
  }

  async markFailed(input: {
    purchaseId: string;
    providerPaymentId?: string | null;
    providerEventId?: string | null;
    failureReason: string;
    failedAt: string;
  }) {
    return markFailedRecord(await this.requirePurchase(input.purchaseId), input, async (purchase) => {
      await this.db.doc(firestorePaths.purchase(purchase.id)).set(purchase);
    });
  }

  async markRefunded(input: {
    purchaseId: string;
    providerRefundId: string;
    providerEventId?: string | null;
    refundedAt: string;
  }) {
    return markRefundedRecord(await this.requirePurchase(input.purchaseId), input, async (purchase) => {
      await this.db.doc(firestorePaths.purchase(purchase.id)).set(purchase);
    });
  }

  async markCreditsGranted(input: {
    purchaseId: string;
    creditGrantLedgerEntryId: string;
    creditsGrantedAt: string;
  }) {
    const purchase = await this.requirePurchase(input.purchaseId);
    const updated = {
      ...purchase,
      creditGrantLedgerEntryId: input.creditGrantLedgerEntryId,
      creditsGrantedAt: input.creditsGrantedAt,
      updatedAt: input.creditsGrantedAt,
    };
    await this.db.doc(firestorePaths.purchase(updated.id)).set(updated);
    return updated;
  }

  async hasProviderEvent(providerEventId: string) {
    const snapshot = await this.db
      .collection(firestorePaths.purchases())
      .where("providerEventIds", "array-contains", providerEventId)
      .limit(1)
      .get();
    return !snapshot.empty;
  }

  async recordProviderEvent() {
    return true;
  }

  private async requirePurchase(purchaseId: string) {
    const snapshot = await this.db.doc(firestorePaths.purchase(purchaseId)).get();
    if (!snapshot.exists) throw new Error(`Missing purchase ${purchaseId}`);
    return snapshot.data() as CreditPurchase;
  }

  private get db() {
    return this.providedDb ?? getAdminDb();
  }
}

class FirestorePaymentTransaction implements PaymentStore {
  constructor(
    private readonly db: Firestore,
    private readonly transaction: Transaction,
  ) {}

  runTransaction<T>(): Promise<T> {
    throw new Error("Nested payment transactions are not supported.");
  }

  async createPurchase(purchase: CreditPurchase) {
    const ref = this.db.doc(firestorePaths.purchase(purchase.id));
    const snapshot = await this.transaction.get(ref);
    if (snapshot.exists) return snapshot.data() as CreditPurchase;
    this.transaction.create(ref, purchase);
    return purchase;
  }

  async setPurchaseProviderOrderId(
    purchaseId: string,
    providerOrderId: string,
    updatedAt: string,
  ) {
    const ref = this.db.doc(firestorePaths.purchase(purchaseId));
    const snapshot = await this.transaction.get(ref);
    if (!snapshot.exists) throw new Error(`Missing purchase ${purchaseId}`);
    const purchase = { ...(snapshot.data() as CreditPurchase), providerOrderId, updatedAt };
    this.transaction.set(ref, purchase);
    return purchase;
  }

  async findPurchaseById(purchaseId: string) {
    const snapshot = await this.transaction.get(
      this.db.doc(firestorePaths.purchase(purchaseId)),
    );
    return snapshot.exists ? (snapshot.data() as CreditPurchase) : null;
  }

  async findPurchaseByProviderOrderId(providerOrderId: string) {
    const snapshot = await this.transaction.get(
      this.db
        .collection(firestorePaths.purchases())
        .where("providerOrderId", "==", providerOrderId)
        .limit(1),
    );
    return snapshot.empty ? null : (snapshot.docs[0].data() as CreditPurchase);
  }

  async markPaid(input: {
    purchaseId: string;
    providerPaymentId: string;
    providerEventId?: string | null;
    paidAt: string;
  }) {
    return markPaidRecord(await this.requirePurchase(input.purchaseId), input, (purchase) => {
      this.transaction.set(this.db.doc(firestorePaths.purchase(purchase.id)), purchase);
      return Promise.resolve();
    });
  }

  async markFailed(input: {
    purchaseId: string;
    providerPaymentId?: string | null;
    providerEventId?: string | null;
    failureReason: string;
    failedAt: string;
  }) {
    return markFailedRecord(await this.requirePurchase(input.purchaseId), input, (purchase) => {
      this.transaction.set(this.db.doc(firestorePaths.purchase(purchase.id)), purchase);
      return Promise.resolve();
    });
  }

  async markRefunded(input: {
    purchaseId: string;
    providerRefundId: string;
    providerEventId?: string | null;
    refundedAt: string;
  }) {
    return markRefundedRecord(await this.requirePurchase(input.purchaseId), input, (purchase) => {
      this.transaction.set(this.db.doc(firestorePaths.purchase(purchase.id)), purchase);
      return Promise.resolve();
    });
  }

  async markCreditsGranted(input: {
    purchaseId: string;
    creditGrantLedgerEntryId: string;
    creditsGrantedAt: string;
  }) {
    const purchase = {
      ...(await this.requirePurchase(input.purchaseId)),
      creditGrantLedgerEntryId: input.creditGrantLedgerEntryId,
      creditsGrantedAt: input.creditsGrantedAt,
      updatedAt: input.creditsGrantedAt,
    };
    this.transaction.set(this.db.doc(firestorePaths.purchase(purchase.id)), purchase);
    return purchase;
  }

  async hasProviderEvent(providerEventId: string) {
    const snapshot = await this.transaction.get(
      this.db
        .collection(firestorePaths.purchases())
        .where("providerEventIds", "array-contains", providerEventId)
        .limit(1),
    );
    return !snapshot.empty;
  }

  async recordProviderEvent() {
    return true;
  }

  private async requirePurchase(purchaseId: string) {
    const snapshot = await this.transaction.get(
      this.db.doc(firestorePaths.purchase(purchaseId)),
    );
    if (!snapshot.exists) throw new Error(`Missing purchase ${purchaseId}`);
    return snapshot.data() as CreditPurchase;
  }
}

function markPaidRecord(
  original: CreditPurchase,
  input: {
    purchaseId: string;
    providerPaymentId: string;
    providerEventId?: string | null;
    paidAt: string;
  },
  persist: (purchase: CreditPurchase) => Promise<void>,
) {
  const purchase = {
    ...original,
    providerEventIds: withEventId(original.providerEventIds, input.providerEventId),
  };
  if (purchase.status === "paid") {
    return persist(purchase).then(() => ({ purchase, changed: false }));
  }

  purchase.status = "paid";
  purchase.providerPaymentId = input.providerPaymentId;
  purchase.failureReason = null;
  purchase.paidAt = input.paidAt;
  purchase.updatedAt = input.paidAt;
  return persist(purchase).then(() => ({ purchase, changed: true }));
}

function markFailedRecord(
  original: CreditPurchase,
  input: {
    purchaseId: string;
    providerPaymentId?: string | null;
    providerEventId?: string | null;
    failureReason: string;
    failedAt: string;
  },
  persist: (purchase: CreditPurchase) => Promise<void>,
) {
  const purchase = {
    ...original,
    providerEventIds: withEventId(original.providerEventIds, input.providerEventId),
  };
  if (purchase.status !== "paid") {
    purchase.status = "failed";
    purchase.providerPaymentId = input.providerPaymentId ?? purchase.providerPaymentId;
    purchase.failureReason = input.failureReason;
    purchase.updatedAt = input.failedAt;
  }
  return persist(purchase).then(() => purchase);
}

function markRefundedRecord(
  original: CreditPurchase,
  input: {
    purchaseId: string;
    providerRefundId: string;
    providerEventId?: string | null;
    refundedAt: string;
  },
  persist: (purchase: CreditPurchase) => Promise<void>,
) {
  const purchase = {
    ...original,
    status: "refunded" as const,
    providerRefundId: input.providerRefundId,
    providerEventIds: withEventId(original.providerEventIds, input.providerEventId),
    refundedAt: input.refundedAt,
    updatedAt: input.refundedAt,
  };
  return persist(purchase).then(() => purchase);
}

function withEventId(providerEventIds: string[], providerEventId?: string | null) {
  if (!providerEventId || providerEventIds.includes(providerEventId)) {
    return [...providerEventIds];
  }
  return [...providerEventIds, providerEventId];
}

function purchaseIdFor(input: CreatePaymentOrderInput) {
  const digest = crypto
    .createHash("sha256")
    .update(`${input.workspaceId}:${input.planId}:${input.idempotencyKey}`)
    .digest("hex")
    .slice(0, 24);
  return `purchase_${digest}`;
}

function orderResponse(purchase: CreditPurchase, plan: Plan, publicKey?: string | null) {
  return {
    purchaseId: purchase.id,
    providerOrderId: purchase.providerOrderId,
    amountPaise: purchase.amountPaise,
    currency: purchase.currency,
    planLabel: plan.name,
    listingCredits: purchase.quantity,
    publicKey: publicKey ?? null,
  };
}

function assertPurchasablePlan(plan: Plan) {
  if (plan.status !== "active") throw new Error("Selected package is not active.");
  if (plan.amountPaise <= 0) throw new Error("Only paid credit packages can be purchased.");
  if (plan.currency !== "INR") throw new Error("Only INR packages can be purchased.");
  if (plan.listingCredits <= 0 || plan.creditValidityDays <= 0) {
    throw new Error("Selected package is not configured for credit purchases.");
  }
}

function assertIdentifier(value: string, name: string) {
  if (!value.trim() || value.includes("/")) {
    throw new Error(`${name} must be a non-empty Firestore identifier.`);
  }
}

function requiredString(value: unknown, name: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${name} is required.`);
  }
  return value.trim();
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function assertConfiguredSecret(value: string, name: string) {
  if (!value) throw new Error(`${name} is not configured.`);
}

function hmac(value: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

function timingSafeEqualHex(provided: string, expected: string) {
  if (!/^[a-f0-9]+$/i.test(provided) || provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided, "hex"), Buffer.from(expected, "hex"));
}

interface RazorpayWebhookEvent {
  id: string;
  event: string;
  payload?: {
    payment?: { entity?: Record<string, unknown> };
    refund?: { entity?: Record<string, unknown> };
  };
}

function parseWebhookEvent(rawBody: string): RazorpayWebhookEvent {
  const parsed = JSON.parse(rawBody) as RazorpayWebhookEvent;
  return {
    ...parsed,
    id: requiredString(parsed.id, "event.id"),
    event: requiredString(parsed.event, "event"),
  };
}

function paymentEntity(event: RazorpayWebhookEvent) {
  const entity = event.payload?.payment?.entity;
  if (!entity) throw new Error("Webhook payment entity is required.");
  return entity;
}

function refundEntity(event: RazorpayWebhookEvent) {
  const entity = event.payload?.refund?.entity;
  if (!entity) throw new Error("Webhook refund entity is required.");
  return entity;
}

export const paymentService = new PaymentService({
  store: new FirestorePaymentStore(),
  orders: getRazorpayOrderClient(),
  keySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
  publicKey: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? null,
  plans: {
    findActivePlan: async (planId) =>
      (await billingService.listActivePlans()).find((plan) => plan.id === planId) ?? null,
  },
  wallet: creditWalletService,
});
