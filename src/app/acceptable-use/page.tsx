import type { Metadata } from "next";
import { PolicyList, PolicySection, PolicyShell } from "@/components/policies/policy-shell";
import { getPlatformBranding } from "@/lib/platform/branding";

export const metadata: Metadata = {
  title: "Acceptable Use Policy",
  description: "Acceptable Use Policy for therealestatelink broker accounts, WhatsApp intake, AI tools, listing pages, and catalogues.",
};

export default async function AcceptableUsePage() {
  const branding = await getPlatformBranding();

  return (
    <PolicyShell
      branding={branding}
      eyebrow="Acceptable Use"
      title="Use TRL responsibly"
      description="These rules protect brokers, buyers, property owners, and the platform from misuse, spam, fraud, and privacy risk."
    >
      <PolicySection title="You may not use TRL to">
        <PolicyList
          items={[
            "Publish fake, misleading, unavailable, unauthorized, or bait property listings.",
            "Impersonate a broker, owner, agency, buyer, tenant, government body, bank, or platform representative.",
            "Upload content that is unlawful, discriminatory, defamatory, harassing, obscene, fraudulent, infringing, or unsafe.",
            "Send spam, bulk unsolicited messages, deceptive WhatsApp messages, or communications that violate Meta, WhatsApp, telecom, or anti-spam rules.",
            "Upload personal data without authority, notice, consent, or another valid legal basis.",
            "Upload passwords, payment credentials, government IDs, medical data, children's data, or sensitive documents unless specifically required and legally permitted.",
            "Probe, scrape, overload, reverse engineer, bypass authentication, abuse rate limits, or interfere with the product.",
            "Use AI output to mislead buyers, hide material facts, fabricate amenities, or create deceptive claims.",
          ]}
        />
      </PolicySection>

      <PolicySection title="Listing standards">
        <p>
          Listings should clearly reflect the actual property, current price or rent expectations, relevant charges, availability, location, and broker contact route. Photos and videos should belong to the property being marketed and should not misrepresent condition, size, or amenities.
        </p>
      </PolicySection>

      <PolicySection title="Enforcement">
        <p>
          We may edit, hide, archive, reject, delete, restrict, or suspend content or accounts that violate this policy, create legal risk, harm users, or degrade product reliability. Serious misuse may be reported to service providers, authorities, or affected parties where appropriate.
        </p>
      </PolicySection>
    </PolicyShell>
  );
}
