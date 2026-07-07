import Link from "next/link";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import type { PlatformBranding } from "@/lib/platform/branding";

const policyLinks = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/dpdp", label: "DPDP" },
  { href: "/refund-cancellation", label: "Refunds" },
  { href: "/acceptable-use", label: "Acceptable use" },
] as const;

export function PolicyShell({
  branding,
  title,
  eyebrow,
  description,
  children,
}: {
  branding: PlatformBranding;
  title: string;
  eyebrow: string;
  description: string;
  children: React.ReactNode;
}) {
  const supportEmail = branding.supportEmail || "support@therealestatelink.com";

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-zinc-950">
      <header className="border-b border-zinc-200 bg-[#fbfaf7]/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-3 text-sm font-semibold">
            <ArrowLeft className="size-4" />
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt={branding.brandName} className="h-9 w-auto max-w-[170px] object-contain" />
            ) : (
              branding.brandName
            )}
          </Link>
          <Link
            href={`mailto:${supportEmail}`}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium shadow-sm hover:border-zinc-300"
          >
            <Mail className="size-4" />
            Contact
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 sm:py-16 lg:grid-cols-[260px_1fr] lg:px-8">
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
            <ShieldCheck className="size-4" />
            Compliance
          </div>
          <nav className="mt-5 grid gap-1 text-sm font-medium text-zinc-600">
            {policyLinks.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-md px-3 py-2 hover:bg-white hover:text-zinc-950">
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>

        <article className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">{eyebrow}</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">{title}</h1>
          <p className="mt-5 text-base leading-7 text-zinc-600 sm:text-lg">{description}</p>
          <p className="mt-5 text-sm text-zinc-500">Last updated: 5 July 2026</p>

          <div className="mt-10 space-y-10 border-t border-zinc-200 pt-10">{children}</div>

          <div className="mt-12 rounded-lg border border-zinc-200 bg-white p-5 text-sm leading-6 text-zinc-600 shadow-sm">
            Questions about these terms or your data can be sent to{" "}
            <a className="font-semibold text-zinc-950 underline underline-offset-4" href={`mailto:${supportEmail}`}>
              {supportEmail}
            </a>
            . These pages are prepared for product readiness and should be reviewed by counsel before relying on them for a specific legal position.
          </div>
        </article>
      </section>
    </main>
  );
}

export function PolicySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-4 space-y-4 text-base leading-7 text-zinc-700">{children}</div>
    </section>
  );
}

export function PolicyList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-emerald-700" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
