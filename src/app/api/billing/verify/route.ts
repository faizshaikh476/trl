import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/current-user";
import { verifyListingActivationToken } from "@/lib/billing/listing-activation-link";
import { paymentService } from "@/lib/billing/payment-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    const body = (await request.json()) as Record<string, unknown>;
    const activation =
      typeof body.activationToken === "string"
        ? verifyListingActivationToken(body.activationToken)
        : null;
    if (!user && !activation) {
      return NextResponse.json({ message: "Please sign in to verify checkout." }, { status: 401 });
    }
    const workspaceId = user?.workspaceId ?? activation?.workspaceId ?? null;
    if (!workspaceId) {
      return NextResponse.json(
        { message: "A workspace is required before verifying checkout." },
        { status: 403 },
      );
    }

    const purchase = await paymentService.verifyCheckout({
      razorpay_order_id: asString(body.razorpay_order_id),
      razorpay_payment_id: asString(body.razorpay_payment_id),
      razorpay_signature: asString(body.razorpay_signature),
      workspaceId,
      ...(activation ? { activationListingId: activation.listingId } : {}),
    });

    return NextResponse.json({
      purchaseId: purchase.id,
      status: purchase.status,
      activationStatus: purchase.activationListingId
        ? purchase.activationCompletedAt
          ? "completed"
          : "pending"
        : null,
    });
  } catch (error) {
    console.error("Razorpay checkout verification failed", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to verify checkout right now.",
      },
      { status: 400 },
    );
  }
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}
