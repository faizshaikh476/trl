import Link from "next/link";
import { CheckCircle2, MapPin } from "lucide-react";
import { ListingActivationCheckout } from "@/components/billing/listing-activation-checkout";
import { Button } from "@/components/ui/button";
import { billingService } from "@/lib/billing/billing-service";
import { verifyListingActivationToken } from "@/lib/billing/listing-activation-link";
import { activationPageState } from "@/lib/billing/listing-activation-presentation";
import { listingService } from "@/lib/listings/listing-service";

export const dynamic = "force-dynamic";

export default async function ListingActivationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const activation = verifyListingActivationToken(token);
  const listing = activation
    ? await listingService.findByWorkspaceId(activation.workspaceId, activation.listingId)
    : null;
  const state = activationPageState({ tokenValid: Boolean(activation), listing });

  if (state.kind !== "ready") {
    return (
      <main className="min-h-screen bg-[#fffaf1] px-4 py-16 text-zinc-950">
        <section className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold">Activation link unavailable</h1>
          <p className="mt-3 leading-7 text-zinc-600">
            This link is invalid, expired, or the listing is no longer waiting for activation.
          </p>
          <Button asChild className="mt-6"><Link href="/">Go home</Link></Button>
        </section>
      </main>
    );
  }

  const plans = (await billingService.listActivePlans()).filter((plan) => plan.amountPaise > 0);
  return (
    <main className="min-h-screen bg-[#fffaf1] px-4 py-12 text-zinc-950 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold text-emerald-700">Ready to activate</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{state.title}</h1>
        <p className="mt-3 flex items-center gap-2 text-zinc-600"><MapPin className="size-4" />{state.location}</p>
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
          <p>Choose a package below. After verified payment, this listing will publish automatically.</p>
        </div>
        {plans.length ? (
          <ListingActivationCheckout plans={plans} activationToken={token} />
        ) : (
          <p className="mt-8 rounded-xl border border-amber-200 bg-white p-5">No paid packages are currently available.</p>
        )}
      </div>
    </main>
  );
}
