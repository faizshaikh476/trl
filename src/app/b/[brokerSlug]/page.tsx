import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  Home,
  MapPin,
  MessageCircle,
  Phone,
  Sparkles,
} from "lucide-react";
import { ShareCatalogueButton } from "@/components/public/share-catalogue-button";
import { Button } from "@/components/ui/button";
import { getPublicBaseUrl } from "@/lib/claims/owner-claim-service";
import { formatNumber, formatRupees } from "@/lib/format";
import { listingService } from "@/lib/listings/listing-service";
import { mediaService } from "@/lib/media/media-service";
import { getPlatformBranding } from "@/lib/platform/branding";
import { workspaceService } from "@/lib/workspaces/workspace-service";
import type { Listing, MediaAsset } from "@/types/domain";

type ListingWithHero = {
  listing: Listing;
  hero: MediaAsset | null;
};

export default async function BrokerPage({
  params,
}: {
  params: Promise<{ brokerSlug: string }>;
}) {
  const { brokerSlug } = await params;
  const branding = await getPlatformBranding();
  const workspace = await workspaceService.findBySlug(brokerSlug);
  if (!workspace) notFound();

  const publishedListings = (await listingService.listByWorkspace(workspace.id))
    .filter((listing) => listing.status === "published")
    .sort((a, b) => scoreListing(b) - scoreListing(a));
  const listingEntries = await Promise.all(
    publishedListings.map(async (listing) => ({
      listing,
      hero: await mediaService.heroForListing(listing.workspaceId, listing.id),
    })),
  );
  const featured = listingEntries[0] ?? null;
  const totalViews = publishedListings.reduce((sum, listing) => sum + listing.views, 0);
  const totalEnquiries = publishedListings.reduce((sum, listing) => sum + listing.leads, 0);
  const saleCount = publishedListings.filter((listing) => listing.transactionType === "sale").length;
  const rentCount = publishedListings.filter((listing) => listing.transactionType === "rent").length;
  const contactPhone = phoneForContact(workspace.contactPhone);
  const whatsappHref = `https://wa.me/${contactPhone}?text=${encodeURIComponent(`Hi ${workspace.contactName}, I saw your property catalogue on ${branding.brandName}.`)}`;
  const catalogueUrl = `${getPublicBaseUrl()}/b/${workspace.slug}`;
  const heroImage = featured?.hero?.url ?? null;
  const contactName = workspace.contactName.replace(/[.!?\s]+$/, "");

  return (
    <main className="min-h-screen bg-[#fbfaf7] pb-28 text-zinc-950 sm:pb-0">
      <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-[#fbfaf7]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt={branding.brandName} className="h-8 w-auto max-w-[160px] object-contain" />
            ) : (
              branding.brandName
            )}
          </Link>
          <Button asChild size="sm" className="bg-zinc-950 text-white hover:bg-zinc-800">
            <a href={whatsappHref}>
              <MessageCircle className="size-4" />
              WhatsApp
            </a>
          </Button>
        </div>
      </header>

      <section className="relative isolate overflow-hidden bg-zinc-950 text-white">
        {heroImage ? (
          <Image
            src={heroImage}
            alt={`${workspace.name} featured property`}
            fill
            loading="eager"
            sizes="100vw"
            className="object-cover opacity-55"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/55 via-zinc-950/75 to-zinc-950" />
        <div className="trl-tall-hero-height relative mx-auto flex max-w-6xl flex-col justify-end px-4 pb-6 pt-24 sm:min-h-[620px] sm:px-6 sm:pb-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              <BadgeCheck className="size-4 text-emerald-300" />
              Broker catalogue · {workspace.city}
            </div>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">
              {workspace.name}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-zinc-100 sm:text-lg">
              A curated set of active properties shared directly by {contactName}.
              View photos, prices, location notes, and enquire on WhatsApp in one tap.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button asChild className="h-12 bg-emerald-600 px-5 text-white hover:bg-emerald-700">
                <a href={whatsappHref}>
                  <MessageCircle className="size-4" />
                  Ask for options
                </a>
              </Button>
              <Button asChild variant="secondary" className="h-12 bg-white text-zinc-950 hover:bg-zinc-100">
                <a href={`tel:+${contactPhone}`}>
                  <Phone className="size-4" />
                  Call broker
                </a>
              </Button>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-3 overflow-hidden rounded-lg border border-white/15 bg-white/10 text-center backdrop-blur sm:max-w-xl">
            <Metric value={publishedListings.length.toString()} label="Listings" />
            <Metric value={saleCount && rentCount ? `${saleCount}/${rentCount}` : saleCount ? saleCount.toString() : rentCount.toString()} label="Buy/Rent" />
            <Metric value={totalEnquiries ? formatNumber(totalEnquiries) : formatNumber(totalViews)} label={totalEnquiries ? "Enquiries" : "Views"} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              <Sparkles className="size-4" />
              Current catalogue
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-4xl">
              Properties ready to share
            </h2>
          </div>
          <ShareCatalogueButton
            url={catalogueUrl}
            title={`${workspace.name} property catalogue`}
            className="hidden bg-white sm:inline-flex"
          />
        </div>

        {featured ? (
          <FeaturedListing item={featured} />
        ) : (
          <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6 text-zinc-600">
            No published listings are available in this catalogue yet.
          </div>
        )}

        {listingEntries.length > 1 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listingEntries.slice(1).map((item) => (
              <ListingCard key={item.listing.id} item={item} />
            ))}
          </div>
        ) : null}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <div className="grid gap-3 rounded-lg bg-white p-4 shadow-sm ring-1 ring-zinc-200 sm:grid-cols-3 sm:p-6">
          <TrustCue icon={CheckCircle2} title="Direct broker source" body={`Listings are managed by ${workspace.name}.`} />
          <TrustCue icon={CalendarClock} title="Fresh catalogue" body="Active properties stay in one clean share link." />
          <TrustCue icon={MessageCircle} title="WhatsApp first" body="Shortlist, ask questions, and plan visits faster." />
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-[#fbfaf7]/95 px-3 py-3 shadow-[0_-12px_40px_rgba(24,24,27,0.12)] backdrop-blur sm:hidden">
        <div className="grid grid-cols-[minmax(0,1fr)_44px] gap-2">
          <Button asChild className="h-11 min-w-0 bg-emerald-600 text-white hover:bg-emerald-700">
            <a href={whatsappHref}>
              <MessageCircle className="size-4" />
              WhatsApp catalogue
            </a>
          </Button>
          <Button asChild variant="outline" size="icon" className="h-11 w-11 bg-white">
            <a href={`tel:+${contactPhone}`} aria-label={`Call ${workspace.contactName}`}>
              <Phone className="size-4" />
            </a>
          </Button>
        </div>
      </div>
    </main>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ brokerSlug: string }>;
}): Promise<Metadata> {
  const { brokerSlug } = await params;
  const branding = await getPlatformBranding();
  const workspace = await workspaceService.findBySlug(brokerSlug);
  if (!workspace) {
    return {
      title: `Broker catalogue | ${branding.brandName}`,
    };
  }

  const url = `${getPublicBaseUrl()}/b/${workspace.slug}`;
  return {
    title: `${workspace.name} property catalogue | ${branding.brandName}`,
    description: `Explore active properties from ${workspace.name} in ${workspace.city}.`,
    alternates: { canonical: url },
    openGraph: {
      title: `${workspace.name} property catalogue`,
      description: `Explore active properties from ${workspace.name} in ${workspace.city}.`,
      url,
      type: "website",
    },
  };
}

function FeaturedListing({ item }: { item: ListingWithHero }) {
  const { listing, hero } = item;

  return (
    <Link
      href={`/l/${listing.slug}`}
      className="group mt-6 grid overflow-hidden rounded-lg bg-zinc-950 text-white shadow-[0_24px_70px_rgba(24,24,27,0.18)] sm:grid-cols-[1.05fr_.95fr]"
    >
      <div className="relative aspect-[4/3] bg-zinc-900 sm:aspect-auto sm:min-h-[380px]">
        {hero ? (
          <Image
            src={hero.url}
            alt={listing.title}
            fill
            loading="eager"
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : null}
        <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-zinc-950">
          <Home className="size-4" />
          Featured
        </div>
      </div>
      <div className="flex flex-col justify-between p-5 sm:p-7">
        <div>
          <p className="flex items-center gap-1.5 text-sm text-zinc-300">
            <MapPin className="size-4" />
            {listing.locality || listing.city}
          </p>
          <h3 className="mt-3 text-2xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {listing.title}
          </h3>
          <p className="mt-4 text-sm leading-6 text-zinc-300">{listing.descriptionShort}</p>
        </div>
        <div className="mt-6 grid gap-4">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <Fact label={listing.transactionType === "rent" ? "Rent" : "Price"} value={priceFor(listing)} />
            <Fact label="Area" value={listing.carpetArea ? `${formatNumber(listing.carpetArea)} sqft` : "Ask"} />
            <Fact label="Type" value={listing.bhk ? `${listing.bhk} BHK` : titleCase(listing.propertyType)} />
          </div>
          <span className="inline-flex items-center justify-between rounded-md bg-white px-4 py-3 text-sm font-semibold text-zinc-950">
            View photos and details
            <ArrowRight className="size-4 transition group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function ListingCard({ item }: { item: ListingWithHero }) {
  const { listing, hero } = item;

  return (
    <Link
      href={`/l/${listing.slug}`}
      className="group overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-zinc-200 transition hover:-translate-y-0.5 hover:shadow-xl"
    >
      <div className="relative aspect-[4/3] bg-zinc-100">
        {hero ? (
          <Image
            src={hero.url}
            alt={listing.title}
            fill
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : null}
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-zinc-950">
          {listing.transactionType === "rent" ? "For rent" : "For sale"}
        </span>
      </div>
      <div className="p-4">
        <p className="flex items-center gap-1.5 truncate text-xs font-medium text-zinc-500">
          <MapPin className="size-4 shrink-0" />
          {listing.location}
        </p>
        <h3 className="mt-2 line-clamp-2 text-lg font-semibold leading-snug tracking-tight">
          {listing.title}
        </h3>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-lg font-semibold">{priceFor(listing)}</p>
            <p className="text-xs text-zinc-500">{listing.freshnessStatus}</p>
          </div>
          <span className="grid size-10 place-items-center rounded-full bg-zinc-950 text-white">
            <ArrowRight className="size-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-r border-white/15 px-2 py-3 last:border-r-0">
      <p className="text-xl font-semibold">{value}</p>
      <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-zinc-300">{label}</p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/10 p-3">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="mt-1 truncate font-semibold">{value}</p>
    </div>
  );
}

function TrustCue({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof BadgeCheck;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-emerald-700" />
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-zinc-600">{body}</p>
      </div>
    </div>
  );
}

function scoreListing(listing: Listing) {
  return Number(new Date(listing.publishedAt ?? listing.updatedAt)) + listing.views + listing.leads * 10;
}

function priceFor(listing: Listing) {
  if (!listing.price) return "Price on request";
  return listing.transactionType === "rent" ? `${formatRupees(listing.price)}/mo` : formatRupees(listing.price);
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function phoneForContact(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}
