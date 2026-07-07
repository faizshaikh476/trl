import type { Metadata } from "next";
import { PolicyList, PolicySection, PolicyShell } from "@/components/policies/policy-shell";
import { getPlatformBranding } from "@/lib/platform/branding";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description: "Terms and Conditions for therealestatelink broker workspaces, WhatsApp intake, listing pages, and catalogues.",
};

export default async function TermsPage() {
  const branding = await getPlatformBranding();

  return (
    <PolicyShell
      branding={branding}
      eyebrow="Terms and Conditions"
      title="Terms for using therealestatelink"
      description="These terms explain how brokers, teams, and visitors may use TRL to create property pages, share catalogues, and manage enquiries."
    >
      <PolicySection title="Ownership and operator">
        <p>
          TRL, also known as therealestatelink, is owned and operated by Yknot Media Group. In these Terms, &quot;TRL&quot;, &quot;we&quot;, &quot;us&quot;, and &quot;our&quot; refer to Yknot Media Group and the therealestatelink product.
        </p>
      </PolicySection>

      <PolicySection title="What TRL provides">
        <PolicyList
          items={[
            "A WhatsApp-first intake system that helps brokers turn property details, photos, and videos into listing pages.",
            "Broker workspaces for editing listings, managing enquiries, and publishing catalogue links.",
            "AI-assisted extraction, drafting, formatting, and quality checks for property content.",
            "Public listing pages and broker catalogue pages that can be shared with buyers, tenants, sellers, owners, and prospects.",
          ]}
        />
        <p>
          TRL is a software tool. We are not a real estate broker, property marketplace, legal advisor, valuation advisor, or due-diligence agency.
        </p>
      </PolicySection>

      <PolicySection title="Broker responsibilities">
        <PolicyList
          items={[
            "You must have the right to share, market, lease, sell, or otherwise promote every property you upload.",
            "You are responsible for the accuracy of price, area, location, ownership, availability, brokerage, taxes, possession, photos, and all other listing details.",
            "You must comply with applicable real estate, advertising, consumer protection, RERA, privacy, anti-spam, and telecom or WhatsApp platform rules.",
            "You must review AI-generated drafts before relying on them or sharing them with clients.",
            "You must not upload personal data, buyer data, owner data, tenant data, or third-party contact details unless you have a lawful basis and have provided required notices.",
          ]}
        />
      </PolicySection>

      <PolicySection title="Accounts and access">
        <p>
          You are responsible for keeping your login credentials secure and for all activity in your workspace. If a listing is created from a WhatsApp number, that number may be used to identify ownership of the listing and broker workspace.
        </p>
        <p>
          We may restrict, suspend, or remove access if we believe an account is being misused, creating legal risk, violating these Terms, or harming other users.
        </p>
      </PolicySection>

      <PolicySection title="Content and license">
        <p>
          You retain ownership of property photos, videos, text, logos, and business information that you provide. You grant TRL a limited license to host, process, format, display, transmit, and reproduce that content only to operate the product, publish listings and catalogues, provide support, improve safety, and meet legal obligations.
        </p>
      </PolicySection>

      <PolicySection title="AI output">
        <p>
          AI may help create listing titles, descriptions, highlights, captions, moderation signals, and structured property fields. AI can make mistakes. You must verify every draft before treating it as final or sending it to buyers, owners, tenants, or other third parties.
        </p>
      </PolicySection>

      <PolicySection title="Third-party services">
        <p>
          TRL may rely on third-party services such as Firebase, Vercel, WhatsApp Cloud API, Meta, AI providers, email providers, analytics, payment providers, and storage providers. Their availability, terms, and technical limits can affect the product.
        </p>
      </PolicySection>

      <PolicySection title="No guarantees">
        <p>
          We do not guarantee that a listing will generate leads, that a buyer or tenant will proceed, that property information is legally complete, or that a public page will always remain available. Property transactions require independent verification, documentation, legal review, and professional advice where needed.
        </p>
      </PolicySection>

      <PolicySection title="Limitation of liability">
        <p>
          To the maximum extent permitted by law, TRL and Yknot Media Group will not be liable for indirect, incidental, consequential, special, punitive, or loss-of-profit damages arising from use of the product. Our total liability for any claim will be limited to the amount paid to us for the affected service during the three months before the claim, unless applicable law requires otherwise.
        </p>
      </PolicySection>

      <PolicySection title="Governing law">
        <p>
          These Terms are governed by the laws of India. Disputes will be handled by courts in Maharashtra, India, unless applicable law requires another forum.
        </p>
      </PolicySection>
    </PolicyShell>
  );
}
