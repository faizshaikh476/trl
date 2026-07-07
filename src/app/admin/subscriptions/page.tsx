import { AdminSectionPage } from "@/components/admin/admin-section-page";
import { getCurrentAdmin } from "@/lib/auth/current-user";
import { billingService } from "@/lib/billing/billing-service";

export default async function AdminSubscriptionsPage() {
  await getCurrentAdmin();
  const plans = billingService.listPlans();

  return (
    <AdminSectionPage
      active="Subscriptions"
      title="Subscriptions"
      description="Manage plan catalog, listing limits, subscription state, and Razorpay readiness."
      cards={[
        {
          title: "Plan catalog",
          description: "Starter, Pro, and Agency limits are represented in the billing service.",
          status: "ready",
        },
        {
          title: "Razorpay lifecycle",
          description: "Checkout, webhook signature validation, invoices, and payment status are next.",
          status: "next",
        },
        {
          title: "Usage enforcement",
          description: "Listing limits should be enforced before publish and plan upgrades.",
          status: "next",
        },
      ]}
      tableTitle="Plans"
      tableRows={plans.map((plan) => ({
        plan: plan.name,
        active_listings: plan.activeListings,
        price: plan.price,
      }))}
    />
  );
}
