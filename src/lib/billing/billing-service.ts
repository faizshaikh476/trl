export const plans = [
  { id: "starter", name: "Starter", activeListings: 25, price: "₹1,999/mo" },
  { id: "pro", name: "Pro", activeListings: 100, price: "₹4,999/mo" },
  { id: "agency", name: "Agency", activeListings: 500, price: "Custom" },
];

export class BillingService {
  listPlans() {
    return plans;
  }

  createCheckoutPlaceholder(planId: string) {
    return {
      provider: "razorpay",
      status: "mocked",
      planId,
      message: "Razorpay checkout can be enabled by adding live keys.",
    };
  }
}

export const billingService = new BillingService();
