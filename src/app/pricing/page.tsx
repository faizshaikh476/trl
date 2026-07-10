import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RazorpayCheckout } from "@/components/billing/razorpay-checkout";
import { PricingSection } from "@/components/public/pricing-section";
import { Button } from "@/components/ui/button";
import { billingService, formatPlanPrice } from "@/lib/billing/billing-service";
import { getAuthenticatedUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing | The Realestate Link",
  description: "Listing credit packages for publishing property pages on The Realestate Link.",
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string | string[] }>;
}) {
  const query = await searchParams;
  const selectedPlanId = typeof query.plan === "string" ? query.plan : query.plan?.[0] ?? null;
  const plans = await billingService.listActivePlans();
  const selectedPlan = selectedPlanId ? plans.find((plan) => plan.id === selectedPlanId) ?? null : null;

  if (selectedPlanId) {
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

        {selectedPlan ? (
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
