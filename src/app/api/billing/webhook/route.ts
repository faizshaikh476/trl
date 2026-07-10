import { NextResponse } from "next/server";
import { paymentService } from "@/lib/billing/payment-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");
    const result = await paymentService.processWebhook(rawBody, signature);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Razorpay webhook processing failed", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to process Razorpay webhook.",
      },
      { status: 400 },
    );
  }
}
