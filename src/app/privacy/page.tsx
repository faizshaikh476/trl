import type { Metadata } from "next";
import { PolicyList, PolicySection, PolicyShell } from "@/components/policies/policy-shell";
import { getPlatformBranding } from "@/lib/platform/branding";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for therealestatelink, including WhatsApp intake, broker workspaces, listing pages, and enquiries.",
};

export default async function PrivacyPage() {
  const branding = await getPlatformBranding();

  return (
    <PolicyShell
      branding={branding}
      eyebrow="Privacy Policy"
      title="How we handle data"
      description="This policy explains what data TRL collects, why we use it, who it may be shared with, and the choices available to users."
    >
      <PolicySection title="Who this policy covers">
        <p>
          This Privacy Policy applies to brokers, broker teams, property owners, buyers, tenants, website visitors, and anyone interacting with TRL through WhatsApp, listing pages, catalogues, forms, dashboards, or support channels.
        </p>
      </PolicySection>

      <PolicySection title="Data we collect">
        <PolicyList
          items={[
            "Account data such as name, email, role, company or agency name, city, profile details, and login identifiers.",
            "WhatsApp intake data such as phone number, messages, property photos, videos, documents, timestamps, and conversation state.",
            "Property listing data such as address, locality, price, rent, deposit, area, amenities, photos, captions, ownership or availability notes, and published page links.",
            "Lead and enquiry data such as buyer or tenant name, phone, email, enquiry message, preferred visit date, budget, and interaction metadata.",
            "Technical and usage data such as IP address, browser, device, pages viewed, clicks, workspace activity, logs, audit events, and security signals.",
            "Billing and support data if paid plans, invoices, refunds, troubleshooting, or account support are enabled.",
          ]}
        />
      </PolicySection>

      <PolicySection title="Why we use data">
        <PolicyList
          items={[
            "To create, publish, edit, and host property listing pages and broker catalogues.",
            "To send WhatsApp replies, claim prompts, verification messages, listing links, and operational notifications.",
            "To authenticate users, manage roles, protect workspaces, and prevent unauthorized access.",
            "To generate AI-assisted listing drafts, captions, summaries, quality signals, and moderation checks.",
            "To route enquiries to the right broker and help brokers manage leads.",
            "To improve reliability, support users, debug errors, prevent abuse, and comply with law.",
          ]}
        />
      </PolicySection>

      <PolicySection title="Public listing data">
        <p>
          Published property pages and broker catalogue pages are public by design. Anyone with the link may see listing photos, descriptions, prices, location details, availability, and any broker contact information that is enabled for the page.
        </p>
      </PolicySection>

      <PolicySection title="Service providers">
        <p>
          We may share data with trusted processors and platforms that help us run TRL, including hosting, database, storage, authentication, WhatsApp messaging, AI processing, analytics, security, support, email, and payment providers. These providers may process data in India or other countries, subject to applicable law and contractual controls.
        </p>
      </PolicySection>

      <PolicySection title="Retention">
        <p>
          We keep data for as long as needed to provide the product, maintain records, resolve disputes, prevent abuse, meet legal obligations, or support broker workspaces. Brokers can request deletion or archival of listings, leads, and profile information where deletion is legally and technically possible.
        </p>
      </PolicySection>

      <PolicySection title="Security">
        <p>
          We use administrative, technical, and organizational safeguards such as authentication, role checks, audit logs, access controls, encrypted transport, and restricted infrastructure access. No system is perfectly secure, so users should avoid uploading unnecessary sensitive data.
        </p>
      </PolicySection>

      <PolicySection title="Your choices">
        <PolicyList
          items={[
            "You may update profile and business information from your workspace where available.",
            "You may ask us to correct, complete, update, or erase personal data where applicable law gives you that right.",
            "You may withdraw consent for optional processing, but some product features may stop working after withdrawal.",
            "You may contact us for access, correction, deletion, grievance, or account support requests.",
          ]}
        />
      </PolicySection>
    </PolicyShell>
  );
}
