import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RazorpayCheckout } from "@/components/billing/razorpay-checkout";
import { PricingSection } from "@/components/public/pricing-section";
import { Button } from "@/components/ui/button";
import { billingService, formatPlanPrice } from "@/lib/billing/billing-service";
import { verifyPurchaseLinkToken } from "@/lib/billing/purchase-link";
import { getAuthenticatedUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing | The Realestate Link",
  description: "Listing credit packages for publishing property pages on The Realestate Link.",
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string | string[]; purchase?: string | string[] }>;
}) {
  const query = await searchParams;
  const directPurchaseToken =
    typeof query.purchase === "string" ? query.purchase : query.purchase?.[0] ?? null;
  const directPurchase = directPurchaseToken ? verifyPurchaseLinkToken(directPurchaseToken) : null;
  const selectedPlanId =
    directPurchase?.planId ?? (typeof query.plan === "string" ? query.plan : query.plan?.[0] ?? null);
  const plans = await billingService.listActivePlans();
  const selectedPlanCandidate = selectedPlanId
    ? plans.find((plan) => plan.id === selectedPlanId) ?? null
    : null;
  let selectedPlan = selectedPlanCandidate;
  let directPurchaseError: string | null = null;

  if (directPurchaseToken) {
    const user = await getAuthenticatedUser();
    if (!directPurchase) {
      selectedPlan = null;
      directPurchaseError = "This purchase link is invalid or has expired. Choose an active package below.";
    } else if (!user) {
      redirect(`/login?next=/pricing?purchase=${encodeURIComponent(directPurchaseToken)}`);
    } else if (!user.workspaceId || user.workspaceId !== directPurchase.workspaceId) {
      selectedPlan = null;
      directPurchaseError =
        "This purchase link belongs to another workspace. Choose a package for your signed-in workspace below.";
    }
  } else if (selectedPlanId) {
    const user = await getAuthenticatedUser();
    if (!user) redirect(`/login?next=/pricing?plan=${encodeURIComponent(selectedPlanId)}`);
  }

  return (
    <main className="min-h-screen bg-[#fffaf1] text-zinc-950">
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/" className="text-base font-semibold tracking-tight">
          The Realestate Link
        </Link>
        <Button asChild variant="secondary" className="border border-emerald-100 bg-white hover:bg-emerald-50">
          <Link href="/login">Sign in</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-emerald-700">Pricing</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">
            Publish property pages with listing credits.
          </h1>
          <p className="mt-5 text-base leading-7 text-zinc-700 sm:text-lg">
            Choose a package, sign in, and keep the selected plan attached to your pricing page.
          </p>
        </div>

        {directPurchaseError ? (
          <div className="mt-7 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            {directPurchaseError}
          </div>
        ) : selectedPlan ? (
          <RazorpayCheckout
            planId={selectedPlan.id}
            planLabel={selectedPlan.name}
            priceLabel={formatPlanPrice(selectedPlan)}
          />
        ) : selectedPlanId ? (
          <div className="mt-7 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            That package is not currently available. Choose an active package below.
          </div>
        ) : null}
      </section>

      <PricingSection plans={plans} selectedPlanId={selectedPlan?.id ?? null} />
    </main>
  );
}
