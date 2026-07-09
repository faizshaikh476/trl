import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPlanPrice } from "@/lib/billing/billing-service";
import { cn } from "@/lib/utils";
import type { Plan } from "@/types/domain";

export function PricingSection({
  plans,
  selectedPlanId,
}: {
  plans: Plan[];
  selectedPlanId?: string | null;
}) {
  const activePlans = [...plans]
    .filter((plan) => plan.status === "active")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (!activePlans.length) return null;

  return (
    <section id="pricing" className="bg-white px-4 py-12 text-zinc-950 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-emerald-700">Listing credit packages</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Buy credits when you need more live listings.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-zinc-600">
            Each package uses the current billing plan data and keeps credits active for the listed
            validity window.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {activePlans.map((plan) => {
            const isSelected = plan.id === selectedPlanId;
            const planHref = isSelected
              ? `/pricing/checkout?plan=${encodeURIComponent(plan.id)}`
              : `/pricing?plan=${encodeURIComponent(plan.id)}`;

            return (
              <article
                key={plan.id}
                data-testid="pricing-plan-card"
                className={cn(
                  "flex h-full flex-col rounded-lg border bg-[#fbfaf7] p-5 shadow-sm",
                  plan.featured ? "border-emerald-300 shadow-emerald-900/10" : "border-zinc-200",
                  isSelected && "border-emerald-500 ring-2 ring-emerald-200",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold">{plan.name}</h3>
                    {plan.description ? (
                      <p className="mt-2 min-h-10 text-sm leading-5 text-zinc-600">
                        {plan.description}
                      </p>
                    ) : null}
                  </div>
                  {isSelected ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                      Selected package
                    </span>
                  ) : plan.featured ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                      Featured
                    </span>
                  ) : null}
                </div>

                <p className="mt-5 text-3xl font-semibold tracking-tight">{formatPlanPrice(plan)}</p>

                <dl className="mt-5 grid gap-3 text-sm text-zinc-700">
                  <PackageFact
                    icon={CheckCircle2}
                    label={`${plan.listingCredits} listing credits`}
                  />
                  <PackageFact
                    icon={Clock3}
                    label={`${plan.creditValidityDays}-day credit validity`}
                  />
                  <PackageFact
                    icon={Eye}
                    label={`${plan.listingVisibilityDays}-day listing visibility`}
                  />
                </dl>

                <Button
                  asChild
                  className={cn(
                    "mt-6 w-full bg-emerald-600 text-white hover:bg-emerald-700",
                    plan.featured && "bg-zinc-950 hover:bg-zinc-800",
                  )}
                >
                  <Link href={planHref}>
                    {isSelected ? `Continue with ${plan.name}` : `Choose ${plan.name}`}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PackageFact({
  icon: Icon,
  label,
}: {
  icon: typeof CheckCircle2;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-emerald-700" />
      <span>{label}</span>
    </div>
  );
}
