import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { paymentService } from "@/lib/billing/payment-service";
import { purchaseSuccessState } from "@/lib/billing/listing-activation-presentation";
import { listingService } from "@/lib/listings/listing-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Payment Successful | The Realestate Link",
  description: "Your listing credits have been added to your workspace.",
};

export default async function PricingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ purchase?: string | string[] }>;
}) {
  const query = await searchParams;
  const purchaseId =
    typeof query.purchase === "string" ? query.purchase : query.purchase?.[0] ?? null;
  const purchase = purchaseId ? await paymentService.findPurchaseById(purchaseId) : null;
  const listing = purchase?.activationListingId
    ? await listingService.findByWorkspaceId(purchase.workspaceId, purchase.activationListingId)
    : null;
  const state = purchaseSuccessState({
    activationListingId: purchase?.activationListingId ?? null,
    activationCompletedAt: purchase?.activationCompletedAt ?? null,
    activationError: purchase?.activationError ?? null,
    listingSlug: listing?.slug ?? null,
  });
  const heading =
    state.kind === "activated"
      ? "Listing activated"
      : state.kind === "pending"
        ? "Payment received — activation pending"
        : "Credits added";
  const description =
    state.kind === "activated"
      ? "Your payment was verified and the saved listing is now live."
      : state.kind === "pending"
        ? "Your payment was verified and credits were added. We’ll retry publishing your saved listing automatically."
        : "Your Razorpay payment was verified and the listing credits were added to your workspace.";

  return (
    <main className="min-h-screen bg-[#fffaf1] px-4 py-16 text-zinc-950 sm:px-6">
      <section className="mx-auto max-w-2xl rounded-lg border border-emerald-200 bg-white p-8 shadow-sm">
        <CheckCircle2 className="size-10 text-emerald-600" />
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">{heading}</h1>
        <p className="mt-3 text-base leading-7 text-zinc-700">
          {description}
        </p>
        {purchaseId ? (
          <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            Purchase ID: <span className="font-medium">{purchaseId}</span>
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {state.kind === "activated" ? (
            <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
              <Link href={state.listingHref}>View live listing</Link>
            </Button>
          ) : null}
          <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
          <Button asChild variant="secondary" className="border border-zinc-200 bg-white">
            <Link href="/pricing">View packages</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
