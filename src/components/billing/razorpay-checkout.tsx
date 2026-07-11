"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RazorpayCheckoutProps {
  planId: string;
  planLabel: string;
  priceLabel: string;
  buttonLabel?: string;
  className?: string;
  variant?: "panel" | "button";
}

interface BillingOrderResponse {
  orderId: string | null;
  amount: number;
  currency: string;
  planLabel: string;
  purchaseId: string;
  keyId: string | null;
  message?: string;
}

interface RazorpayCheckoutResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler(response: RazorpayCheckoutResponse): void;
  modal: {
    ondismiss(): void;
  };
  theme: {
    color: string;
  };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open(): void;
    };
  }
}

let razorpayScriptPromise: Promise<void> | null = null;

export function RazorpayCheckout({
  planId,
  planLabel,
  priceLabel,
  buttonLabel,
  className,
  variant = "panel",
}: RazorpayCheckoutProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function startCheckout() {
    setIsLoading(true);
    setMessage(null);

    try {
      const orderResponse = await fetch("/api/billing/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          idempotencyKey: makeIdempotencyKey(),
        }),
      });
      const order = (await orderResponse.json()) as BillingOrderResponse;
      if (!orderResponse.ok) throw new Error(order.message ?? "Unable to create order.");
      if (!order.orderId || !order.keyId) {
        throw new Error("Razorpay checkout is not configured yet.");
      }

      await loadRazorpayScript();
      if (!window.Razorpay) throw new Error("Razorpay checkout did not load.");

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "The Realestate Link",
        description: order.planLabel,
        order_id: order.orderId,
        handler: (response) => {
          void verifyCheckout(response, order.purchaseId);
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false);
          },
        },
        theme: {
          color: "#059669",
        },
      });
      checkout.open();
    } catch (error) {
      setIsLoading(false);
      setMessage(error instanceof Error ? error.message : "Unable to start checkout.");
    }
  }

  async function verifyCheckout(
    response: RazorpayCheckoutResponse,
    fallbackPurchaseId: string,
  ) {
    try {
      const verifyResponse = await fetch("/api/billing/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(response),
      });
      const result = (await verifyResponse.json()) as {
        purchaseId?: string;
        message?: string;
      };
      if (!verifyResponse.ok || !result.purchaseId) {
        throw new Error(result.message ?? "Payment verification failed.");
      }
      window.location.assign(
        `/pricing/success?purchase=${encodeURIComponent(result.purchaseId ?? fallbackPurchaseId)}`,
      );
    } catch (error) {
      setIsLoading(false);
      setMessage(
        error instanceof Error
          ? error.message
          : "Payment captured, but verification failed. Please contact support.",
      );
    }
  }

  const button = (
    <Button
      type="button"
      className={cn("bg-emerald-600 text-white hover:bg-emerald-700", className)}
      onClick={startCheckout}
      disabled={isLoading}
    >
      {isLoading ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
      {isLoading ? "Opening checkout" : buttonLabel ?? "Buy credits"}
    </Button>
  );

  if (variant === "button") {
    return (
      <div className="mt-6">
        {button}
        {message ? <p className="mt-3 text-sm text-red-700">{message}</p> : null}
      </div>
    );
  }

  return (
    <div id="checkout" className="mt-7 rounded-lg border border-emerald-200 bg-white p-4 text-sm text-zinc-700 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p>
            <span className="font-semibold text-zinc-950">{planLabel}</span> is selected.
          </p>
          <p className="mt-1 text-zinc-600">One-time purchase: {priceLabel}</p>
        </div>
        {button}
      </div>
      {message ? <p className="mt-3 text-sm text-red-700">{message}</p> : null}
    </div>
  );
}

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve();
  razorpayScriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Razorpay checkout."));
    document.body.appendChild(script);
  });
  return razorpayScriptPromise;
}

function makeIdempotencyKey() {
  return window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
