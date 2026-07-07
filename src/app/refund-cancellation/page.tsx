import type { Metadata } from "next";
import { PolicyList, PolicySection, PolicyShell } from "@/components/policies/policy-shell";
import { getPlatformBranding } from "@/lib/platform/branding";

export const metadata: Metadata = {
  title: "Refund and Cancellation Policy",
  description: "Refund and cancellation policy for therealestatelink subscriptions, setup work, and paid services.",
};

export default async function RefundCancellationPage() {
  const branding = await getPlatformBranding();

  return (
    <PolicyShell
      branding={branding}
      eyebrow="Refund and Cancellation"
      title="Billing, cancellation, and refunds"
      description="This policy explains how subscription cancellation, duplicate payments, setup work, and refund requests are handled."
    >
      <PolicySection title="Subscriptions">
        <p>
          Paid TRL plans, when enabled, are billed for the selected billing period. You may cancel a subscription from your workspace or by contacting support. Cancellation normally takes effect at the end of the current paid period.
        </p>
      </PolicySection>

      <PolicySection title="Refunds">
        <PolicyList
          items={[
            "Fees already paid are generally non-refundable unless required by law or expressly agreed in writing.",
            "Duplicate charges, payment errors, or accidental overbilling will be reviewed and refunded where verified.",
            "Custom onboarding, setup, migration, training, integration, or branding work is non-refundable once work has started, unless agreed otherwise.",
            "If a service is unavailable due to our confirmed fault for an extended period, we may offer a credit, extension, or refund at our discretion.",
          ]}
        />
      </PolicySection>

      <PolicySection title="Free trials and demos">
        <p>
          Free trials, demos, test workspaces, and promotional access may be changed, limited, or discontinued at any time. Trial access does not guarantee eligibility for refunds after a paid plan begins.
        </p>
      </PolicySection>

      <PolicySection title="How to request a refund">
        <p>
          Send your account email, workspace name, payment reference, amount, date, and reason for the request to support. We may ask for additional details before approving a refund.
        </p>
      </PolicySection>
    </PolicyShell>
  );
}
