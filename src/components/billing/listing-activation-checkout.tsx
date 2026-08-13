import { RazorpayCheckout } from "@/components/billing/razorpay-checkout";
import { formatPlanPrice } from "@/lib/billing/billing-service";
import type { Plan } from "@/types/domain";

export function ListingActivationCheckout({
  plans,
  activationToken,
}: {
  plans: Plan[];
  activationToken: string;
}) {
  return (
    <div className="mt-8 grid gap-4 md:grid-cols-3">
      {plans.map((plan) => (
        <section key={plan.id} className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-950">{plan.name}</h2>
          <p className="mt-2 text-sm text-zinc-600">{plan.listingCredits} listing credits</p>
          <p className="mt-3 text-2xl font-semibold text-emerald-700">{formatPlanPrice(plan)}</p>
          <RazorpayCheckout
            planId={plan.id}
            planLabel={plan.name}
            priceLabel={formatPlanPrice(plan)}
            buttonLabel={`Buy & activate`}
            variant="button"
            activationToken={activationToken}
          />
        </section>
      ))}
    </div>
  );
}
