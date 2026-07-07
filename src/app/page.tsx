import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bot,
  CheckCircle2,
  Clock3,
  FileText,
  GalleryVerticalEnd,
  Images,
  LayoutDashboard,
  Link2,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPlatformBranding } from "@/lib/platform/branding";

export const dynamic = "force-dynamic";

const DEMO_LISTING_IMAGE =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1800&q=85";
const DEMO_GALLERY_IMAGES = [
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80",
];
const DEMO_LISTING_TITLE = "2 BHK apartment for sale in Tower A3, NIBM, Pune";
const DEMO_LISTING_PRICE = "Rs 99 L";
const CREATE_LISTING_WHATSAPP_URL = "https://wa.me/message/J5AZEENAAMZVK1";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getPlatformBranding();
  return {
    title: branding.seoTitle,
    description: branding.seoDescription,
    openGraph: {
      title: branding.seoTitle,
      description: branding.seoDescription,
      images: branding.socialImageUrl ? [{ url: branding.socialImageUrl }] : undefined,
    },
  };
}

export default async function Home() {
  const branding = await getPlatformBranding();
  const sampleListingHref = "/sample-listing";

  return (
    <main className="min-h-screen bg-[#fffaf1] text-zinc-950">
      <section className="relative isolate overflow-hidden bg-[#fff8ee] text-zinc-950">
        <Image
          src={DEMO_LISTING_IMAGE}
          alt="Premium property listing created from WhatsApp"
          fill
          loading="eager"
          sizes="100vw"
          className="object-cover opacity-18"
        />
        <div className="absolute inset-0 bg-[linear-gradient(110deg,#fffaf1_0%,rgba(255,250,241,0.96)_42%,rgba(236,253,245,0.88)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#fffaf1] to-transparent" />
        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex min-h-14 items-center text-base font-semibold tracking-tight">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt={branding.brandName} className="h-14 w-auto max-w-[240px] object-contain sm:h-16" />
            ) : (
              branding.brandName
            )}
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-zinc-700 sm:flex">
            <a href="#workflow" className="hover:text-emerald-700">
              Workflow
            </a>
            <a href="#features" className="hover:text-emerald-700">
              Features
            </a>
            <a href="#catalogue" className="hover:text-emerald-700">
              Catalogue
            </a>
          </nav>
          <Button asChild size="sm" className="border border-emerald-100 bg-white text-zinc-950 shadow-sm hover:bg-emerald-50">
            <Link href="/login">Sign in</Link>
          </Button>
        </header>

        <div className="trl-home-hero-height relative z-10 mx-auto flex max-w-7xl flex-col justify-end px-4 pb-8 pt-20 sm:min-h-[720px] sm:px-6 sm:pb-12 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-800 shadow-sm ring-1 ring-emerald-100">
              <MessageCircle className="size-4 text-emerald-600" />
              WhatsApp first. AI powered.
            </div>
            <h1 className="mt-5 text-balance text-5xl font-semibold leading-[0.98] tracking-tight sm:text-7xl">
              AI-powered WhatsApp to property pages.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-700 sm:text-xl sm:leading-8">
              Send photos and property details on WhatsApp. Get a clean, shareable listing page
              with gallery, price, location, WhatsApp enquiry, and your broker catalogue.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 bg-emerald-600 px-5 text-white hover:bg-emerald-700">
                <a href={CREATE_LISTING_WHATSAPP_URL}>
                  Create a property page
                  <ArrowRight className="size-4" />
                </a>
              </Button>
              <Button asChild size="lg" variant="secondary" className="h-12 border border-emerald-100 bg-white text-zinc-950 shadow-sm hover:bg-emerald-50">
                <Link href="/catalogue">Open your catalogue</Link>
              </Button>
            </div>
          </div>

          <div className="mt-10 grid max-w-3xl grid-cols-3 overflow-hidden rounded-lg border border-emerald-100 bg-white/80 text-center shadow-sm backdrop-blur">
            <HeroMetric value="WhatsApp" label="Send details" />
            <HeroMetric value="AI" label="Builds the page" />
            <HeroMetric value="1 link" label="Share anywhere" />
          </div>
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            <Sparkles className="size-4" />
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
            Send a WhatsApp message. Get a property page.
          </h2>
        </div>
        <div className="mt-8 grid gap-px overflow-hidden rounded-lg bg-zinc-200 sm:grid-cols-2 lg:grid-cols-4">
          <WorkflowStep
            icon={MessageCircle}
            title="1. Send on WhatsApp"
            body="Photos, videos, price, location, area, rent, deposit, and any extra notes."
          />
          <WorkflowStep
            icon={Bot}
            title="2. AI cleans it"
            body="The details become a title, highlights, facts, captions, and a buyer-ready pitch."
          />
          <WorkflowStep
            icon={GalleryVerticalEnd}
            title="3. Page is ready"
            body="Your listing gets a proper gallery, pricing, contact buttons, and enquiry form."
          />
          <WorkflowStep
            icon={LayoutDashboard}
            title="4. Edit anytime"
            body="Change details, add photos, track leads, and keep the page updated."
          />
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {DEMO_GALLERY_IMAGES.map((image, index) => (
              <Link
                key={image}
                href={sampleListingHref}
                className="group relative min-h-[260px] overflow-hidden rounded-lg bg-white text-white shadow-sm ring-1 ring-zinc-200"
              >
                <Image
                  src={image}
                  alt={`Sample property preview ${index + 1}`}
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/85 via-zinc-950/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <p className="text-xs font-medium text-emerald-200">Sample preview</p>
                  <h3 className="mt-1 line-clamp-2 text-lg font-semibold leading-tight">
                    {DEMO_LISTING_TITLE}
                  </h3>
                </div>
              </Link>
            ))}
        </div>
      </section>

      <section id="features" className="bg-white py-12 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[.82fr_1.18fr] lg:gap-14">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                <ShieldCheck className="size-4" />
                What you get
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
                Simple tools for better property sharing.
              </h2>
              <p className="mt-4 text-base leading-7 text-zinc-600">
                {branding.brandName} is not a marketplace. It is a WhatsApp-first tool for brokers
                to create professional property links quickly.
              </p>
              <Button asChild className="mt-6 bg-emerald-600 text-white hover:bg-emerald-700">
                <a href={CREATE_LISTING_WHATSAPP_URL}>
                  Open broker workspace
                  <ArrowRight className="size-4" />
                </a>
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Feature icon={Images} title="Property pages" body="Photos, price, location, facts, WhatsApp, call button, and enquiry form." />
              <Feature icon={FileText} title="AI listing copy" body="Better titles, short descriptions, highlights, and WhatsApp captions." />
              <Feature icon={UserCheck} title="Broker login" body="Claim your listing once and manage it from your own workspace." />
              <Feature icon={Link2} title="Broker catalogue" body="One mobile-friendly catalogue link for all your active properties." />
              <Feature icon={BarChart3} title="Lead tracking" body="See enquiries, calls, WhatsApp clicks, and listing views in one place." />
              <Feature icon={BadgeCheck} title="Admin control" body="Review, publish, edit, archive, or delete listings when needed." />
            </div>
          </div>
        </div>
      </section>

      <section id="catalogue" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-12">
          <div className="group relative min-h-[430px] overflow-hidden rounded-lg bg-white text-zinc-950 shadow-sm ring-1 ring-zinc-200">
            <Image
              src={DEMO_LISTING_IMAGE}
              alt={DEMO_LISTING_TITLE}
              fill
              loading="eager"
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover transition duration-700 group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/45 to-white/5" />
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/65 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
              <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-800 shadow-sm">
                <Clock3 className="size-4 text-emerald-600" />
                Sample listing page
              </p>
              <h3 className="mt-4 max-w-xl text-2xl font-semibold leading-tight tracking-tight sm:text-4xl">
                {DEMO_LISTING_TITLE}
              </h3>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-900 shadow-sm">
                  {DEMO_LISTING_PRICE}
                </span>
                <Button asChild size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700">
                  <Link href={sampleListingHref}>Open example</Link>
                </Button>
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              <Phone className="size-4" />
              Built for sharing
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
              Every listing becomes a clean link.
            </h2>
            <p className="mt-4 text-base leading-7 text-zinc-600">
              Share one property with a buyer, or share your full catalogue when they want more
              options.
            </p>
            <div className="mt-6 grid gap-3">
              <Proof title="Listing link" body="A beautiful property page made from WhatsApp details." />
              <Proof title="Catalogue link" body="All active properties under your broker profile." />
              <Proof title="Workspace" body="Your place to edit listings and manage leads." />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#eafaf1] px-4 py-12 text-zinc-950 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-semibold text-emerald-700">AI-powered. WhatsApp first.</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
            Turn your next WhatsApp listing into a page buyers can open.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-700">
            Send the property details. Get the link. Share it with confidence.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-emerald-600 text-white hover:bg-emerald-700">
              <a href={CREATE_LISTING_WHATSAPP_URL}>Create a property page</a>
            </Button>
            <Button asChild size="lg" variant="secondary" className="border border-emerald-100 bg-white text-zinc-950 hover:bg-emerald-50">
              <Link href="/catalogue">Open your catalogue</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="bg-[#eafaf1] px-4 pb-8 text-zinc-950 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 border-t border-emerald-200 pt-6 text-sm text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="font-semibold text-zinc-800">{branding.brandName}</span>{" "}
            is a TRL product owned and operated by{" "}
            <span className="font-semibold text-zinc-800">Yknot Media Group</span>.
          </p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/terms" className="hover:text-emerald-700">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-emerald-700">
              Privacy
            </Link>
            <Link href="/dpdp" className="hover:text-emerald-700">
              DPDP
            </Link>
            <Link href="/refund-cancellation" className="hover:text-emerald-700">
              Refunds
            </Link>
            <Link href="/acceptable-use" className="hover:text-emerald-700">
              Acceptable use
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}

function HeroMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-r border-emerald-100 px-2 py-3 last:border-r-0">
      <p className="text-xl font-semibold">{value}</p>
      <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-zinc-500">{label}</p>
    </div>
  );
}

function WorkflowStep({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof MessageCircle;
  title: string;
  body: string;
}) {
  return (
    <div className="bg-[#fbfaf7] p-5 sm:p-6">
      <Icon className="size-6 text-emerald-700" />
      <h3 className="mt-5 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-600">{body}</p>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof MessageCircle;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-[#fbfaf7] p-5">
      <Icon className="size-5 text-emerald-700" />
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-600">{body}</p>
    </div>
  );
}

function Proof({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex gap-3 border-t border-zinc-200 pt-4">
      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" />
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-zinc-600">{body}</p>
      </div>
    </div>
  );
}
