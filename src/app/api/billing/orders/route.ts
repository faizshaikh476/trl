import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/current-user";
import { paymentService } from "@/lib/billing/payment-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ message: "Please sign in to buy credits." }, { status: 401 });
    }
    if (!user.workspaceId) {
      return NextResponse.json(
        { message: "A workspace is required before buying credits." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as {
      planId?: unknown;
      idempotencyKey?: unknown;
    };
    if (typeof body.planId !== "string" || typeof body.idempotencyKey !== "string") {
      return NextResponse.json({ message: "Invalid checkout request." }, { status: 400 });
    }

    const order = await paymentService.createOrder({
      workspaceId: user.workspaceId,
      planId: body.planId,
      idempotencyKey: body.idempotencyKey,
    });

    return NextResponse.json({
      orderId: order.providerOrderId,
      amount: order.amountPaise,
      currency: order.currency,
      planLabel: order.planLabel,
      purchaseId: order.purchaseId,
      keyId: order.publicKey,
    });
  } catch (error) {
    console.error("Razorpay order creation failed", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to start checkout right now.",
      },
      { status: 500 },
    );
  }
}
