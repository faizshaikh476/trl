import crypto from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import type { CreditPurchase, Plan } from "@/types/domain";
import {
  PaymentService,
  type PaymentOrderClient,
  type PaymentStore,
} from "./payment-service";

class InMemoryPaymentStore implements PaymentStore {
  purchases = new Map<string, CreditPurchase>();
  providerEvents = new Set<string>();
  private idempotency = new Map<string, string>();

  async runTransaction<T>(operation: (transaction: PaymentStore) => Promise<T>) {
    return operation(this);
  }

  async createPurchase(purchase: CreditPurchase, idempotencyKey: string) {
    const key = `${purchase.workspaceId}:${purchase.planId}:${idempotencyKey}`;
    const existingId = this.idempotency.get(key);
    if (existingId) return structuredClone(this.purchases.get(existingId)!);

    this.purchases.set(purchase.id, structuredClone(purchase));
    this.idempotency.set(key, purchase.id);
    return structuredClone(purchase);
  }

  async setPurchaseProviderOrderId(purchaseId: string, providerOrderId: string, updatedAt: string) {
    const purchase = this.requirePurchase(purchaseId);
    if (purchase.providerOrderId) return structuredClone(purchase);
    purchase.providerOrderId = providerOrderId;
    purchase.updatedAt = updatedAt;
    this.purchases.set(purchaseId, structuredClone(purchase));
    return structuredClone(purchase);
  }

  async findPurchaseById(purchaseId: string) {
    return structuredClone(this.purchases.get(purchaseId) ?? null);
  }

  async findPurchaseByProviderOrderId(providerOrderId: string) {
    return structuredClone(
      [...this.purchases.values()].find(
        (purchase) => purchase.providerOrderId === providerOrderId,
      ) ?? null,
    );
  }

  async markPaid(input: {
    purchaseId: string;
    providerPaymentId: string;
    providerEventId?: string | null;
    paidAt: string;
  }) {
    const purchase = this.requirePurchase(input.purchaseId);
    if (input.providerEventId) purchase.providerEventIds.push(input.providerEventId);
    if (purchase.status === "paid") {
      this.purchases.set(purchase.id, structuredClone(purchase));
      return { purchase: structuredClone(purchase), changed: false };
    }

    purchase.status = "paid";
    purchase.providerPaymentId = input.providerPaymentId;
    purchase.failureReason = null;
    purchase.paidAt = input.paidAt;
    purchase.updatedAt = input.paidAt;
    this.purchases.set(purchase.id, structuredClone(purchase));
    return { purchase: structuredClone(purchase), changed: true };
  }

  async markFailed(input: {
    purchaseId: string;
    providerPaymentId?: string | null;
    providerEventId?: string | null;
    failureReason: string;
    failedAt: string;
  }) {
    const purchase = this.requirePurchase(input.purchaseId);
    if (input.providerEventId) purchase.providerEventIds.push(input.providerEventId);
    if (purchase.status !== "paid") {
      purchase.status = "failed";
      purchase.providerPaymentId = input.providerPaymentId ?? purchase.providerPaymentId;
      purchase.failureReason = input.failureReason;
      purchase.updatedAt = input.failedAt;
    }
    this.purchases.set(purchase.id, structuredClone(purchase));
    return structuredClone(purchase);
  }

  async markRefunded(input: {
    purchaseId: string;
    providerRefundId: string;
    providerEventId?: string | null;
    refundedAt: string;
  }) {
    const purchase = this.requirePurchase(input.purchaseId);
    if (input.providerEventId) purchase.providerEventIds.push(input.providerEventId);
    purchase.status = "refunded";
    purchase.providerRefundId = input.providerRefundId;
    purchase.refundedAt = input.refundedAt;
    purchase.updatedAt = input.refundedAt;
    this.purchases.set(purchase.id, structuredClone(purchase));
    return structuredClone(purchase);
  }

  async markCreditsGranted(input: {
    purchaseId: string;
    creditGrantLedgerEntryId: string;
    creditsGrantedAt: string;
  }) {
    const purchase = this.requirePurchase(input.purchaseId);
    purchase.creditGrantLedgerEntryId = input.creditGrantLedgerEntryId;
    purchase.creditsGrantedAt = input.creditsGrantedAt;
    purchase.updatedAt = input.creditsGrantedAt;
    this.purchases.set(purchase.id, structuredClone(purchase));
    return structuredClone(purchase);
  }

  async hasProviderEvent(providerEventId: string) {
    return this.providerEvents.has(providerEventId);
  }

  async recordProviderEvent(providerEventId: string) {
    if (this.providerEvents.has(providerEventId)) return false;
    this.providerEvents.add(providerEventId);
    return true;
  }

  private requirePurchase(purchaseId: string) {
    const purchase = this.purchases.get(purchaseId);
    if (!purchase) throw new Error(`Missing purchase ${purchaseId}`);
    return structuredClone(purchase);
  }
}

class FakeRazorpayOrders implements PaymentOrderClient {
  calls: Array<{
    amount: number;
    currency: string;
    receipt: string;
    notes: Record<string, string>;
  }> = [];

  async create(input: {
    amount: number;
    currency: string;
    receipt: string;
    notes: Record<string, string>;
  }) {
    this.calls.push(structuredClone(input));
    return { id: `order_${this.calls.length}` };
  }
}

describe("PaymentService", () => {
  const plan: Plan = {
    id: "growth",
    name: "Growth",
    description: "Growth package",
    amountPaise: 799900,
    currency: "INR",
    listingCredits: 50,
    creditValidityDays: 45,
    listingVisibilityDays: 60,
    featured: true,
    status: "active",
    sortOrder: 10,
    createdAt: "2026-07-09T00:00:00.000Z",
    updatedAt: "2026-07-09T00:00:00.000Z",
  };

  let now: Date;
  let store: InMemoryPaymentStore;
  let orders: FakeRazorpayOrders;
  let grantFailuresRemaining: number;
  let grants: Array<{
    workspaceId: string;
    quantity: number;
    validityDays: number;
    sourceId: string;
    sourceType: "purchase";
  }>;
  let service: PaymentService;

  beforeEach(() => {
    now = new Date("2026-07-10T12:00:00.000Z");
    store = new InMemoryPaymentStore();
    orders = new FakeRazorpayOrders();
    grantFailuresRemaining = 0;
    grants = [];
    service = new PaymentService({
      store,
      orders,
      keySecret: "checkout_secret",
      webhookSecret: "webhook_secret",
      plans: {
        findActivePlan: async (planId) => (planId === plan.id ? plan : null),
      },
      wallet: {
        grantCredits: async (input) => {
          if (grantFailuresRemaining > 0) {
            grantFailuresRemaining -= 1;
            throw new Error("simulated grant failure");
          }
          grants.push(input);
          return {
            id: `grant:purchase:${input.sourceId}`,
            workspaceId: input.workspaceId,
            type: "grant",
            quantity: input.quantity,
            sourceType: "purchase",
            sourceId: input.sourceId,
            listingId: null,
            reason: "Credit purchase",
            createdAt: now.toISOString(),
          };
        },
      },
      now: () => now,
    });
  });

  it("creates a pending Razorpay order from active server-side plan values in paise", async () => {
    const result = await service.createOrder({
      workspaceId: "workspace_1",
      planId: "growth",
      idempotencyKey: "button-click-1",
    });

    expect(result).toMatchObject({
      providerOrderId: "order_1",
      amountPaise: 799900,
      currency: "INR",
      planLabel: "Growth",
      listingCredits: 50,
      publicKey: null,
    });
    expect(result.purchaseId).toMatch(/^purchase_/);
    expect(orders.calls).toEqual([
      {
        amount: 799900,
        currency: "INR",
        receipt: result.purchaseId,
        notes: {
          purchaseId: result.purchaseId,
          workspaceId: "workspace_1",
          planId: "growth",
        },
      },
    ]);
    expect(await store.findPurchaseById(result.purchaseId)).toMatchObject({
      id: result.purchaseId,
      workspaceId: "workspace_1",
      planId: "growth",
      quantity: 50,
      validityDays: 30,
      amountPaise: 799900,
      currency: "INR",
      status: "pending",
      provider: "razorpay",
      providerOrderId: "order_1",
    });
  });

  it("reuses a pending purchase and provider order for duplicate create-order keys", async () => {
    const first = await service.createOrder({
      workspaceId: "workspace_1",
      planId: "growth",
      idempotencyKey: "button-click-1",
    });
    const duplicate = await service.createOrder({
      workspaceId: "workspace_1",
      planId: "growth",
      idempotencyKey: "button-click-1",
    });

    expect(duplicate).toEqual(first);
    expect(orders.calls).toHaveLength(1);
  });

  it("does not overwrite a purchase provider order when duplicate order creation races", async () => {
    const stored = await store.createPurchase(
      {
        id: "purchase_race",
        workspaceId: "workspace_1",
        planId: "growth",
        quantity: 50,
        validityDays: 30,
        amountPaise: 799900,
        currency: "INR",
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
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
      "race-key",
    );

    await store.setPurchaseProviderOrderId(stored.id, "order_first", now.toISOString());
    const duplicate = await store.setPurchaseProviderOrderId(
      stored.id,
      "order_second",
      "2026-07-10T12:00:01.000Z",
    );

    expect(duplicate.providerOrderId).toBe("order_first");
    await expect(store.findPurchaseByProviderOrderId("order_second")).resolves.toBeNull();
  });

  it("verifies checkout HMAC over order and payment ids before granting credits once", async () => {
    const order = await service.createOrder({
      workspaceId: "workspace_1",
      planId: "growth",
      idempotencyKey: "checkout-1",
    });
    const signature = checkoutSignature("order_1", "pay_1");

    await expect(
      service.verifyCheckout({
        razorpay_order_id: "order_1",
        razorpay_payment_id: "pay_1",
        razorpay_signature: "bad_signature",
      }),
    ).rejects.toThrow("Invalid Razorpay checkout signature");

    const verified = await service.verifyCheckout({
      razorpay_order_id: "order_1",
      razorpay_payment_id: "pay_1",
      razorpay_signature: signature,
    });
    const duplicate = await service.verifyCheckout({
      razorpay_order_id: "order_1",
      razorpay_payment_id: "pay_1",
      razorpay_signature: signature,
    });

    expect(verified).toMatchObject({
      id: order.purchaseId,
      status: "paid",
      providerPaymentId: "pay_1",
      paidAt: "2026-07-10T12:00:00.000Z",
    });
    expect(duplicate).toMatchObject({ id: order.purchaseId, status: "paid" });
    expect(grants).toEqual([
      {
        workspaceId: "workspace_1",
        quantity: 50,
        validityDays: 30,
        sourceId: order.purchaseId,
        sourceType: "purchase",
      },
    ]);
  });

  it("retries checkout credit grants when a previous verification marked the purchase paid before grant failure", async () => {
    const order = await service.createOrder({
      workspaceId: "workspace_1",
      planId: "growth",
      idempotencyKey: "checkout-retry-grant",
    });
    const signature = checkoutSignature("order_1", "pay_retry_1");
    grantFailuresRemaining = 1;

    await expect(
      service.verifyCheckout({
        razorpay_order_id: "order_1",
        razorpay_payment_id: "pay_retry_1",
        razorpay_signature: signature,
      }),
    ).rejects.toThrow("simulated grant failure");

    expect(await store.findPurchaseById(order.purchaseId)).toMatchObject({
      status: "paid",
      providerPaymentId: "pay_retry_1",
    });
    expect(grants).toHaveLength(0);

    await expect(
      service.verifyCheckout({
        razorpay_order_id: "order_1",
        razorpay_payment_id: "pay_retry_1",
        razorpay_signature: signature,
      }),
    ).resolves.toMatchObject({ id: order.purchaseId, status: "paid" });

    expect(grants).toEqual([
      {
        workspaceId: "workspace_1",
        quantity: 50,
        validityDays: 30,
        sourceId: order.purchaseId,
        sourceType: "purchase",
      },
    ]);

    await service.verifyCheckout({
      razorpay_order_id: "order_1",
      razorpay_payment_id: "pay_retry_1",
      razorpay_signature: signature,
    });
    expect(grants).toHaveLength(1);
  });

  it("processes captured-payment webhooks from the raw body and ignores duplicate events", async () => {
    const order = await service.createOrder({
      workspaceId: "workspace_1",
      planId: "growth",
      idempotencyKey: "webhook-1",
    });
    const rawBody = JSON.stringify({
      id: "evt_captured_1",
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_2",
            order_id: order.providerOrderId,
            captured: true,
          },
        },
      },
    });
    const signature = webhookSignature(rawBody);

    const first = await service.processWebhook(rawBody, signature);
    const duplicate = await service.processWebhook(rawBody, signature);

    expect(first).toEqual({ processed: true, duplicate: false });
    expect(duplicate).toEqual({ processed: false, duplicate: true });
    expect(await store.findPurchaseById(order.purchaseId)).toMatchObject({
      status: "paid",
      providerPaymentId: "pay_2",
      providerEventIds: ["evt_captured_1"],
    });
    expect(grants).toHaveLength(1);
  });

  it("retries captured webhooks when a previous attempt marked paid before grant failure", async () => {
    const order = await service.createOrder({
      workspaceId: "workspace_1",
      planId: "growth",
      idempotencyKey: "webhook-retry-grant",
    });
    const rawBody = JSON.stringify({
      id: "evt_captured_retry",
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_retry_2",
            order_id: order.providerOrderId,
            captured: true,
          },
        },
      },
    });
    const signature = webhookSignature(rawBody);
    grantFailuresRemaining = 1;

    await expect(service.processWebhook(rawBody, signature)).rejects.toThrow(
      "simulated grant failure",
    );

    expect(await store.findPurchaseById(order.purchaseId)).toMatchObject({
      status: "paid",
      providerPaymentId: "pay_retry_2",
      providerEventIds: [],
    });
    expect(grants).toHaveLength(0);

    await expect(service.processWebhook(rawBody, signature)).resolves.toEqual({
      processed: true,
      duplicate: false,
    });

    expect(grants).toEqual([
      {
        workspaceId: "workspace_1",
        quantity: 50,
        validityDays: 30,
        sourceId: order.purchaseId,
        sourceType: "purchase",
      },
    ]);
    expect(await store.findPurchaseById(order.purchaseId)).toMatchObject({
      providerEventIds: ["evt_captured_retry"],
    });

    await expect(service.processWebhook(rawBody, signature)).resolves.toEqual({
      processed: false,
      duplicate: true,
    });
    expect(grants).toHaveLength(1);
  });

  it("marks failed payments without granting credits", async () => {
    const order = await service.createOrder({
      workspaceId: "workspace_1",
      planId: "growth",
      idempotencyKey: "webhook-failed",
    });
    const rawBody = JSON.stringify({
      id: "evt_failed_1",
      event: "payment.failed",
      payload: {
        payment: {
          entity: {
            id: "pay_failed_1",
            order_id: order.providerOrderId,
            error_description: "Bank declined the transaction",
          },
        },
      },
    });

    await expect(
      service.processWebhook(rawBody, webhookSignature(rawBody)),
    ).resolves.toEqual({ processed: true, duplicate: false });

    expect(await store.findPurchaseById(order.purchaseId)).toMatchObject({
      status: "failed",
      providerPaymentId: "pay_failed_1",
      failureReason: "Bank declined the transaction",
      providerEventIds: ["evt_failed_1"],
    });
    expect(grants).toHaveLength(0);
  });

  it("records processed refunds without issuing another credit grant", async () => {
    const order = await service.createOrder({
      workspaceId: "workspace_1",
      planId: "growth",
      idempotencyKey: "webhook-refund",
    });
    await service.verifyCheckout({
      razorpay_order_id: order.providerOrderId,
      razorpay_payment_id: "pay_refunded_1",
      razorpay_signature: checkoutSignature(order.providerOrderId, "pay_refunded_1"),
    });
    const rawBody = JSON.stringify({
      id: "evt_refund_1",
      event: "refund.processed",
      payload: {
        refund: {
          entity: {
            id: "rfnd_1",
            payment_id: "pay_refunded_1",
          },
        },
        payment: {
          entity: {
            id: "pay_refunded_1",
            order_id: order.providerOrderId,
          },
        },
      },
    });

    await expect(
      service.processWebhook(rawBody, webhookSignature(rawBody)),
    ).resolves.toEqual({ processed: true, duplicate: false });

    expect(await store.findPurchaseById(order.purchaseId)).toMatchObject({
      status: "refunded",
      providerRefundId: "rfnd_1",
      providerEventIds: ["evt_refund_1"],
    });
    expect(grants).toHaveLength(1);
  });

  function checkoutSignature(orderId: string, paymentId: string) {
    return crypto
      .createHmac("sha256", "checkout_secret")
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
  }

  function webhookSignature(rawBody: string) {
    return crypto.createHmac("sha256", "webhook_secret").update(rawBody).digest("hex");
  }
});
