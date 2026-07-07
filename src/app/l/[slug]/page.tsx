import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import {
  BadgeCheck,
  CalendarClock,
  Car,
  Check,
  Compass,
  IndianRupee,
  Home,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
  Ruler,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { OwnerVerificationModal } from "@/components/public/owner-verification-modal";
import { LeadForm } from "@/components/public/lead-form";
import { PropertyCarousel } from "@/components/public/property-carousel";
import { getAuthenticatedUser } from "@/lib/auth/current-user";
import { getPublicBaseUrl, ownerClaimService, type OwnerClaimLookup } from "@/lib/claims/owner-claim-service";
import { formatNumber, formatRupees } from "@/lib/format";
import { listingService } from "@/lib/listings/listing-service";
import { mediaService } from "@/lib/media/media-service";
import { ownerProfileService } from "@/lib/owners/owner-profile-service";
import { getPlatformBranding } from "@/lib/platform/branding";
import { workspaceService } from "@/lib/workspaces/workspace-service";
import type { Listing } from "@/types/domain";

type QuickFact = {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
};

export default async function PublicListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ claim?: string; verified?: string; verification?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const branding = await getPlatformBranding();
  const listing = await listingService.findShareableBySlug(slug);
  if (!listing) notFound();

  const workspace = await workspaceService.findById(listing.workspaceId);
  if (!workspace) notFound();
  const media = await mediaService.listByListing(listing.workspaceId, listing.id);
  const user = await getAuthenticatedUser();
  const brokerCanEdit = Boolean(user?.workspaceId === listing.workspaceId);
  const claimLookup = query.claim ? await ownerClaimService.lookup(query.claim) : null;
  const claimMatchesListing = claimLookup?.status === "ready" && claimLookup.listing.id === listing.id;
  const showVerificationModal = Boolean(claimMatchesListing);
  const verifiedOwnerProfile =
    listing.ownerProfileId
      ? await ownerProfileService.findById(listing.workspaceId, listing.ownerProfileId)
      : null;
  const isBrokerVerified =
    listing.ownerClaimStatus === "claimed" || verifiedOwnerProfile?.status === "verified";
  const pendingClaimLookup = !isBrokerVerified
    ? claimMatchesListing
      ? claimLookup
      : await ownerClaimService.findPendingForListing(listing.workspaceId, listing.id)
    : null;
  const verificationLookup = pendingClaimLookup?.status === "ready" ? pendingClaimLookup : null;
  if (!isBrokerVerified) {
    return (
      <UnverifiedListingGate
        branding={branding}
        listing={listing}
        brokerCanEdit={brokerCanEdit}
        verificationLookup={verificationLookup}
      />
    );
  }
  const verifiedContactPhone =
    isBrokerVerified && (listing.ownerPhone || verifiedOwnerProfile?.phone)
      ? phoneForContact(listing.ownerPhone || verifiedOwnerProfile?.phone || "")
      : "";
  const hasVerifiedContact = Boolean(isBrokerVerified && verifiedContactPhone);
  const brokerName = verifiedOwnerProfile?.name?.trim() || "Verified broker";
  const brokerSubtitle = [verifiedOwnerProfile?.occupation, listing.city].filter(Boolean).join(" · ");
  const whatsappHref = hasVerifiedContact
    ? `https://wa.me/${verifiedContactPhone}?text=${encodeURIComponent(`Hi, I am interested in ${listing.title}`)}`
    : "";
  const actionLabel = listing.transactionType === "rent" ? "Rent" : "Buy";
  const priceLabel =
    listing.transactionType === "rent" ? `${formatRupees(listing.price)}/mo` : formatRupees(listing.price);
  const mobileContext = listing.societyName || listing.locality || listing.city;
  const isCommercial = /commercial|office|shop|retail|warehouse|showroom/i.test(
    listing.propertyType,
  );
  const monthlyIncome = extractMonthlyIncome([
    listing.descriptionLong,
    listing.descriptionShort,
    listing.whatsappShareText,
    ...listing.highlights,
  ]);
  const leaseStatus = /pre[-\s]?leased|leased/i.test(
    `${listing.title} ${listing.descriptionLong} ${listing.highlights.join(" ")}`,
  )
    ? "Pre-leased"
    : listing.transactionType === "rent"
      ? "Available for lease"
      : "Vacant possession";

  const commercialQuickFacts: Array<QuickFact | null> = [
        { label: "Property type", value: titleCase(listing.propertyType), icon: Store },
        listing.carpetArea
          ? { label: "Carpet area", value: `${formatNumber(listing.carpetArea)} sqft`, icon: Ruler }
          : null,
        monthlyIncome
          ? { label: "Monthly income", value: monthlyIncome, icon: IndianRupee }
          : { label: "Lease status", value: leaseStatus, icon: BadgeCheck },
        listing.parkingCount
          ? { label: "Parking", value: `${listing.parkingCount} reserved`, icon: Car }
          : null,
      ];
  const residentialQuickFacts: Array<QuickFact | null> = [
        listing.bhk ? { label: "Configuration", value: `${listing.bhk} BHK`, icon: Home } : null,
        listing.carpetArea
          ? { label: "Carpet area", value: `${formatNumber(listing.carpetArea)} sqft`, icon: Ruler }
          : null,
        listing.openArea
          ? { label: "Open area", value: `${formatNumber(listing.openArea)} sqft`, icon: Store }
          : null,
        listing.parkingCount
          ? { label: "Parking", value: `${listing.parkingCount} reserved`, icon: Car }
          : null,
      ];
  const quickFacts = (isCommercial ? commercialQuickFacts : residentialQuickFacts).filter(
    (fact): fact is QuickFact => Boolean(fact),
  );

  const areaRows = [
    ["Carpet area", listing.carpetArea ? `${formatNumber(listing.carpetArea)} sqft` : null],
    ["Built-up area", listing.builtUpArea ? `${formatNumber(listing.builtUpArea)} sqft` : null],
    ["Plot reference", listing.plotArea ? `${formatNumber(listing.plotArea)} sqft` : null],
    [isCommercial ? "Usable open area" : "Attached open area", listing.openArea ? `${formatNumber(listing.openArea)} sqft` : null],
    ["Floor", listing.floor],
    ["Total floors", listing.totalFloors ? `${listing.totalFloors}` : null],
    ["Furnishing", listing.furnishedStatus],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  return (
    <main className="min-h-screen bg-[#fbfaf7] pb-36 text-zinc-950 sm:pb-0">
      <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-[#fbfaf7]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <Link href="/" className="text-sm font-semibold tracking-tight sm:text-base">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt={branding.brandName} className="h-8 w-auto max-w-[160px] object-contain" />
            ) : (
              branding.brandName
            )}
          </Link>
          <div className="flex items-center gap-2">
            {isBrokerVerified && verifiedOwnerProfile?.name ? (
              <span className="hidden text-sm font-medium text-zinc-700 sm:inline">
                {verifiedOwnerProfile.name}
              </span>
            ) : null}
            {hasVerifiedContact ? (
              <Button asChild size="sm" className="hidden bg-emerald-600 text-white hover:bg-emerald-700 sm:inline-flex">
                <a href={whatsappHref}>
                  <MessageCircle className="size-4" />
                  WhatsApp
                </a>
              </Button>
            ) : null}
            {brokerCanEdit ? (
              <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                <Link href={`/dashboard/listings/${listing.id}`}>Edit</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      {query.verified === "1" ? (
        <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-900">
          Broker details verified. You can edit this listing from your dashboard.
        </div>
      ) : null}

      <PropertyCarousel
        media={media}
        title={listing.title}
        freshnessStatus={listing.freshnessStatus}
      />

      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-10 lg:px-8">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12">
          <article>
            <div className="border-b border-zinc-200 pb-5 sm:pb-8">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-600 sm:text-sm">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-4" />
                  {listing.location}
                </span>
                <span className="hidden text-zinc-300 sm:inline">/</span>
                <span>{listing.societyName}</span>
              </div>
              <h1 className="mt-3 max-w-4xl text-balance text-[2rem] font-semibold leading-[1.02] tracking-tight sm:mt-4 sm:text-5xl lg:text-6xl">
                {listing.title}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-2.5 sm:mt-5 sm:gap-4">
                <p className="mr-1 inline-flex items-baseline gap-1 text-3xl font-semibold tracking-tight sm:text-4xl">
                  {formatRupees(listing.price)}
                  {listing.transactionType === "rent" ? (
                    <span className="text-base font-medium text-zinc-500 sm:text-lg">/month</span>
                  ) : null}
                </p>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">
                  <Home className="size-4" />
                  {listing.transactionType === "sale" ? "For sale" : "For rent"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-700">
                  <IndianRupee className="size-4" />
                  Brokerage {listing.brokerage || "on request"}
                </span>
              </div>
            </div>

            {quickFacts.length ? (
            <section className="grid grid-cols-2 gap-3 border-b border-zinc-200 py-5 sm:grid-cols-2 sm:gap-4 sm:py-8 lg:grid-cols-4">
              {quickFacts.map((fact) => {
                const Icon = fact.icon;
                return (
                  <div key={fact.label} className="min-w-0 rounded-lg border border-zinc-200 bg-white px-3 py-4 shadow-sm sm:px-4">
                    <Icon className="size-5 text-emerald-700" />
                    <p className="mt-3 text-xs text-zinc-500 sm:text-sm">{fact.label}</p>
                    <p className="mt-1 text-base font-semibold leading-snug sm:text-lg">{fact.value}</p>
                  </div>
                );
              })}
            </section>
            ) : null}

            <section className="border-b border-zinc-200 py-7 sm:py-10">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 sm:text-sm">
                {isCommercial ? "Investment highlight" : "Signature highlight"}
              </p>
              <div className="mt-4 grid gap-6 lg:grid-cols-[.85fr_1.15fr] lg:gap-8">
                <div>
                  <h2 className="text-2xl font-semibold leading-tight tracking-tight sm:text-4xl">
                    {listing.descriptionShort || titleForHighlight(listing.propertyType)}
                  </h2>
                  <p className="mt-3 text-[0.95rem] leading-7 text-zinc-700 sm:mt-4 sm:text-base sm:leading-8">{listing.descriptionLong}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {listing.highlights.map((item) => (
                    <div key={item} className="flex gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                      <Check className="mt-0.5 size-5 shrink-0 text-emerald-700" />
                      <p className="text-sm font-medium leading-6">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid gap-7 border-b border-zinc-200 py-7 sm:py-10 lg:grid-cols-2 lg:gap-10">
              {areaRows.length ? (
              <div>
                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Area breakdown</h2>
                <div className="mt-5 overflow-hidden rounded-lg border border-zinc-200 bg-white">
                  {areaRows.map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-4 border-b border-zinc-100 px-4 py-3 last:border-0"
                    >
                      <span className="text-zinc-600">{label}</span>
                      <span className="text-right font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              ) : null}
              {listing.amenities.length ? (
              <div>
                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Amenities</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {listing.amenities.map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <BadgeCheck className="size-5 text-zinc-500" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              ) : null}
            </section>

            <section className="py-7 sm:py-10">
              <div className="rounded-lg bg-zinc-950 p-5 text-white sm:p-8">
                <p className="text-sm font-medium text-emerald-300">Property brief</p>
                <h2 className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight">
                  The key details, ready for a serious buyer.
                </h2>
                <p className="mt-3 max-w-3xl leading-7 text-zinc-300">
                  Photos, pricing, highlights, location notes, and broker contact stay together
                  in one clean link.
                </p>
              </div>
            </section>
          </article>

          <aside id="enquire" className="lg:sticky lg:top-24 lg:self-start">
            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-[0_20px_70px_rgba(24,24,27,0.12)]">
              {isBrokerVerified ? (
                <div className="border-b border-zinc-100 p-5 sm:p-6">
                  <p className="text-sm text-zinc-500">Listed by</p>
                  <h2 className="mt-1 text-2xl font-semibold">{brokerName}</h2>
                  {brokerSubtitle ? (
                    <p className="mt-1 text-sm text-zinc-500">{brokerSubtitle}</p>
                  ) : null}
                  {hasVerifiedContact ? (
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <Button asChild className="h-11 bg-emerald-600 text-white hover:bg-emerald-700">
                        <a href={whatsappHref}>
                          <MessageCircle className="size-4" />
                          WhatsApp
                        </a>
                      </Button>
                      <Button asChild variant="outline" className="h-11">
                        <a href={`tel:+${verifiedContactPhone}`}>
                          <Phone className="size-4" />
                          Call
                        </a>
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="border-b border-zinc-100 p-5 sm:p-6">
                  <p className="text-sm text-zinc-500">Broker verification</p>
                  <h2 className="mt-1 text-2xl font-semibold">Pending verification</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    Contact details will appear here after the broker verifies this listing from
                    their WhatsApp number.
                  </p>
                </div>
              )}

                <div className="grid grid-cols-2 border-b border-zinc-100 text-sm">
                  <div className="border-r border-zinc-100 p-4">
                    <CalendarClock className="size-4 text-zinc-500" />
                    <p className="mt-2 text-zinc-500">Availability</p>
                    <p className="font-medium">{listing.availability || "Ask broker"}</p>
                  </div>
                  <div className="p-4">
                    <Compass className="size-4 text-zinc-500" />
                    <p className="mt-2 text-zinc-500">Freshness</p>
                    <p className="font-medium">{listing.freshnessStatus}</p>
                  </div>
                </div>

              {isBrokerVerified ? (
                <div className="p-5 sm:p-6">
                  <h3 className="text-lg font-semibold">Request a private visit</h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    Your enquiry goes directly into the broker CRM.
                  </p>
                  <div className="mt-5">
                    <LeadForm listingId={listing.id} />
                  </div>
                </div>
              ) : (
                <div className="p-5 sm:p-6">
                  <h3 className="text-lg font-semibold">Enquiries unlock after verification</h3>
                  <p className="mt-1 text-sm leading-6 text-zinc-500">
                    The property page is shareable, but broker contact and lead capture stay hidden
                    until the WhatsApp sender verifies their profile.
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </section>
      {isBrokerVerified && hasVerifiedContact ? (
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-[#fbfaf7]/95 px-3 py-3 shadow-[0_-12px_40px_rgba(24,24,27,0.12)] backdrop-blur sm:hidden">
        <div className="grid gap-2">
          <div className="min-w-0">
            <p className="flex max-w-full items-center gap-1.5 text-base font-semibold leading-tight">
              <IndianRupee className="size-4 shrink-0 text-emerald-700" />
              <span className="min-w-0 break-words">
                {actionLabel} · {priceLabel}
              </span>
            </p>
            <p className="truncate text-xs text-zinc-500">{mobileContext}</p>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_44px_44px] gap-2">
            <Button asChild className="h-11 min-w-0 bg-emerald-600 px-4 text-white hover:bg-emerald-700">
              <a href={whatsappHref}>
                <MessageCircle className="size-4" />
                WhatsApp
              </a>
            </Button>
            <Button asChild variant="outline" size="icon" className="h-11 w-11 bg-white">
              <a href={`tel:+${verifiedContactPhone}`} aria-label="Call broker">
                <Phone className="size-4" />
              </a>
            </Button>
            <Button asChild className="h-11 w-11 bg-zinc-950 text-white hover:bg-zinc-800">
              <a href="#enquire" aria-label="Open enquiry form">
                <Share2 className="size-4" />
              </a>
            </Button>
          </div>
        </div>
      </div>
      ) : null}
      {showVerificationModal && claimLookup?.status === "ready" ? (
        <OwnerVerificationModal
          token={claimLookup.token.id}
          ownerProfile={claimLookup.ownerProfile}
        />
      ) : null}
    </main>
  );
}

function UnverifiedListingGate({
  branding,
  listing,
  brokerCanEdit,
  verificationLookup,
}: {
  branding: Awaited<ReturnType<typeof getPlatformBranding>>;
  listing: Listing;
  brokerCanEdit: boolean;
  verificationLookup: Extract<OwnerClaimLookup, { status: "ready" }> | null;
}) {
  return (
    <main className="min-h-screen bg-[#fbfaf7] text-zinc-950">
      <header className="border-b border-zinc-200/70 bg-[#fbfaf7]/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/" className="text-sm font-semibold tracking-tight sm:text-base">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt={branding.brandName} className="h-8 w-auto max-w-[160px] object-contain" />
            ) : (
              branding.brandName
            )}
          </Link>
          {brokerCanEdit ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/listings/${listing.id}`}>Edit</Link>
            </Button>
          ) : null}
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-65px)] max-w-5xl items-center px-4 py-10 sm:px-6">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">
              <LockKeyholeIcon />
              Broker verification
            </p>
            <h1 className="mt-5 max-w-3xl text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Verify this listing before it goes public.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
              This link is ready, but the property details stay private until the WhatsApp sender
              verifies their broker profile with a one-time OTP.
            </p>
            <div className="mt-7 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="text-sm font-medium text-zinc-500">Listing waiting for verification</p>
              <p className="mt-2 text-xl font-semibold leading-snug">{listing.title}</p>
              <p className="mt-2 text-sm text-zinc-500">{listing.location || listing.city}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_24px_80px_rgba(24,24,27,0.12)] sm:p-6">
            <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <BadgeCheck className="size-6" />
            </div>
            <h2 className="mt-5 text-2xl font-semibold">One quick step</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Add your name, occupation, email, and password. We send the OTP only to the
              original WhatsApp number that created this listing.
            </p>
            {verificationLookup ? (
              <p className="mt-5 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                The verification form is open. Complete it once and future listings from this
                WhatsApp number will publish under the same broker account.
              </p>
            ) : (
              <p className="mt-5 rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                Verification is being prepared. Send DONE again on WhatsApp if this listing was
                created before the claim step finished.
              </p>
            )}
          </div>
        </div>
      </section>

      {verificationLookup ? (
        <OwnerVerificationModal
          token={verificationLookup.token.id}
          ownerProfile={verificationLookup.ownerProfile}
        />
      ) : null}
    </main>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const branding = await getPlatformBranding();
  const listing = await listingService.findShareableBySlug(slug);
  if (!listing) {
    return {
      title: `Property not found | ${branding.brandName}`,
    };
  }

  const media = await mediaService.listByListing(listing.workspaceId, listing.id);
  const image = media[0]?.url;
  const title = listing.seoTitle || listing.title;
  const description =
    listing.seoDescription ||
    `${formatRupees(listing.price)} · ${listing.location || listing.city} · ${listing.descriptionShort}`;
  const url = `${getPublicBaseUrl()}/l/${listing.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      images: image ? [{ url: image, alt: listing.title }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function extractMonthlyIncome(values: string[]) {
  const text = values.join(" ");
  const match = text.match(/(?:rent|income|leased\s+at|rental)\D{0,20}(₹?\s*\d[\d,]*(?:\.\d+)?\s*(?:k|thousand|l|lac|lakh)?)(?:\s*\/?\s*(?:month|mo|pm))?/i);
  if (!match?.[1]) return null;

  const raw = match[1].replace(/\s+/g, " ").trim();
  const number = Number(raw.replace(/[₹,\s]/g, "").replace(/k|thousand|l|lac|lakh/gi, ""));
  if (!Number.isFinite(number)) return raw;

  if (/k|thousand/i.test(raw)) return `${formatRupees(number * 1000)}/month`;
  if (/l|lac|lakh/i.test(raw)) return `${formatRupees(number * 100000)}/month`;
  return `${formatRupees(number)}/month`;
}

function phoneForContact(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function titleForHighlight(propertyType: Listing["propertyType"]) {
  if (/commercial|office|shop|retail|warehouse|showroom/i.test(propertyType)) {
    return "The commercial facts that matter, up front.";
  }
  return "A clean property brief with the details buyers need first.";
}

function LockKeyholeIcon() {
  return <BadgeCheck className="size-3.5" />;
}
