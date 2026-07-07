import type { Metadata } from "next";
import { PolicyList, PolicySection, PolicyShell } from "@/components/policies/policy-shell";
import { getPlatformBranding } from "@/lib/platform/branding";

export const metadata: Metadata = {
  title: "DPDP Compliance Statement",
  description: "DPDP compliance statement for therealestatelink under the Digital Personal Data Protection Act, 2023.",
};

export default async function DpdpPage() {
  const branding = await getPlatformBranding();

  return (
    <PolicyShell
      branding={branding}
      eyebrow="DPDP Compliance"
      title="Digital Personal Data Protection readiness"
      description="This page explains how TRL approaches consent, notices, rights, grievance handling, processors, and retention under India's DPDP framework."
    >
      <PolicySection title="Roles under DPDP">
        <PolicyList
          items={[
            "For account, authentication, platform security, support, billing, and product operations, TRL acts as a Data Fiduciary.",
            "For buyer, tenant, seller, owner, or third-party data that a broker uploads or receives through their workspace, the broker may act as the Data Fiduciary and TRL may act as a processor or service provider for that broker.",
            "For public listing pages, brokers remain responsible for ensuring that property and contact information can lawfully be published.",
          ]}
        />
      </PolicySection>

      <PolicySection title="Notice and consent">
        <p>
          TRL is designed to give clear notices before account creation, verification, WhatsApp intake, lead submission, and public listing publication. Where consent is the lawful basis, we aim to explain the personal data collected, the purpose of processing, how to withdraw consent, and how to contact us.
        </p>
      </PolicySection>

      <PolicySection title="Data Principal rights">
        <p>
          Subject to applicable law and identity verification, Data Principals may request access to information about processing, correction, completion, updating, erasure, grievance redressal, and nomination of another person to exercise rights in the event of death or incapacity.
        </p>
      </PolicySection>

      <PolicySection title="Grievance handling">
        <p>
          Privacy and grievance requests can be sent to the support email shown on this page. We will review and respond within applicable statutory timelines once the relevant DPDP rules and operational timelines apply to the request.
        </p>
      </PolicySection>

      <PolicySection title="Children and sensitive data">
        <p>
          TRL is intended for professional broker use and is not directed to children. Users must not knowingly upload children&apos;s personal data, highly sensitive identity information, financial credentials, passwords, medical information, or unnecessary personal documents into listing chats or public pages.
        </p>
      </PolicySection>

      <PolicySection title="Processors and AI providers">
        <p>
          To run the product, TRL may use processors for cloud hosting, databases, storage, WhatsApp messaging, authentication, analytics, support, and AI extraction. Property text, images, and related messages may be sent to configured AI providers for listing extraction and drafting.
        </p>
      </PolicySection>

      <PolicySection title="Security safeguards">
        <PolicyList
          items={[
            "Workspace and admin routes use authentication and role-based checks.",
            "Listing ownership is tied to verified accounts and WhatsApp number checks where enabled.",
            "Platform activity may be recorded in audit logs for security, support, and abuse prevention.",
            "Access to production data and infrastructure should be limited to authorized personnel and service providers.",
          ]}
        />
      </PolicySection>

      <PolicySection title="Retention and erasure">
        <p>
          Personal data should be retained only for lawful product, security, business, and legal purposes. Listing, lead, and account deletion workflows should be used when data is no longer required, subject to legal holds, dispute resolution, accounting, abuse prevention, and backup limitations.
        </p>
      </PolicySection>

      <PolicySection title="Breach response">
        <p>
          If we identify a personal data breach, we will assess the scope, contain the incident, preserve relevant logs, notify affected parties or authorities where legally required, and take reasonable steps to reduce recurrence.
        </p>
      </PolicySection>
    </PolicyShell>
  );
}
