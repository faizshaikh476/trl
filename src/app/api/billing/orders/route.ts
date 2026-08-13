import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/current-user";
import { verifyListingActivationToken } from "@/lib/billing/listing-activation-link";
import { paymentService } from "@/lib/billing/payment-service";
import { listingService } from "@/lib/listings/listing-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      planId?: unknown;
      idempotencyKey?: unknown;
      activationToken?: unknown;
    };
    if (typeof body.planId !== "string" || typeof body.idempotencyKey !== "string") {
      return NextResponse.json({ message: "Invalid checkout request." }, { status: 400 });
    }
    const user = await getAuthenticatedUser();
    const activation =
      typeof body.activationToken === "string"
        ? verifyListingActivationToken(body.activationToken)
        : null;
    if (!user && !activation) {
      return NextResponse.json({ message: "Please sign in to buy credits." }, { status: 401 });
    }

    let workspaceId = user?.workspaceId ?? activation?.workspaceId ?? null;
    let activationListingId: string | null = null;
    let activationPhone: string | null = null;
    if (activation) {
      const listing = await listingService.findByWorkspaceId(
        activation.workspaceId,
        activation.listingId,
      );
      if (!listing || listing.status !== "ready_to_publish") {
        return NextResponse.json(
          { message: "This listing is no longer awaiting activation." },
          { status: 403 },
        );
      }
      workspaceId = activation.workspaceId;
      activationListingId = activation.listingId;
      activationPhone = listing.ownerPhone?.trim() || null;
    }
    if (!workspaceId) {
      return NextResponse.json(
        { message: "A workspace is required before buying credits." },
        { status: 403 },
      );
    }

    const order = await paymentService.createOrder({
      workspaceId,
      planId: body.planId,
      idempotencyKey: body.idempotencyKey,
      ...(activationListingId ? { activationListingId, activationPhone } : {}),
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
