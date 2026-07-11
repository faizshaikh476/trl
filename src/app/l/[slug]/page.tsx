import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache, type ComponentType } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Car,
  Check,
  Compass,
  Eye,
  IndianRupee,
  Home,
  MapPin,
  MessageCircle,
  Phone,
  Ruler,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { OwnerVerificationModal } from "@/components/public/owner-verification-modal";
import { LeadForm } from "@/components/public/lead-form";
import {
  ListingViewTracker,
  ShareListingButton,
  TrackedListingLink,
} from "@/components/public/listing-analytics";
import { PropertyCarousel } from "@/components/public/property-carousel";
import { getPublicBaseUrl, ownerClaimService, type OwnerClaimLookup } from "@/lib/claims/owner-claim-service";
import { formatNumber, formatRupees } from "@/lib/format";
import { ownerProfileService } from "@/lib/owners/owner-profile-service";
import { getPlatformBranding } from "@/lib/platform/branding";
import {
  getCachedPublicBranding,
  getCachedPublicListing,
  getCachedPublicListingHeroMedia,
  getCachedPublicListingMedia,
} from "@/lib/public/public-listing-cache";
import { workspaceService } from "@/lib/workspaces/workspace-service";
import type { Listing } from "@/types/domain";

type QuickFact = {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
};

const CREATE_LISTING_WHATSAPP_URL = "https://wa.me/message/J5AZEENAAMZVK1";

export default async function PublicListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ claim?: string; verified?: string; verification?: string }>;
}) {
  const { slug } = await params;
  const [query, branding, listing] = await Promise.all([
    searchParams,
    getCachedPublicBranding(),
    getCachedPublicListing(slug),
  ]);
  if (!listing) notFound();

  const verifiedOwnerProfilePromise = listing.ownerProfileId
    ? getCachedOwnerProfile(listing.workspaceId, listing.ownerProfileId)
    : Promise.resolve(null);
  const verifiedOwnerProfile = await verifiedOwnerProfilePromise;
  const isBrokerVerified =
    listing.ownerClaimStatus === "claimed" || verifiedOwnerProfile?.status === "verified";
  if (!isBrokerVerified) {
    const claimLookup = query.claim ? await ownerClaimService.lookup(query.claim) : null;
    const claimMatchesListing = claimLookup?.status === "ready" && claimLookup.listing.id === listing.id;
    const pendingClaimLookup = claimMatchesListing
      ? claimLookup
      : await ownerClaimService.findPendingForListing(listing.workspaceId, listing.id);
    const verificationLookup = pendingClaimLookup?.status === "ready" ? pendingClaimLookup : null;

    return (
      <UnverifiedListingGate
        branding={branding}
        listing={listing}
        verificationLookup={verificationLookup}
      />
    );
  }
  const claimLookup = query.claim ? await ownerClaimService.lookup(query.claim) : null;
  const claimMatchesListing = claimLookup?.status === "ready" && claimLookup.listing.id === listing.id;
  const showVerificationModal = Boolean(claimMatchesListing);
  const [media, workspace] = await Promise.all([
    getCachedPublicListingMedia(listing.workspaceId, listing.id),
    workspaceService.findById(listing.workspaceId),
  ]);
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
  const publicListingUrl = `${getPublicBaseUrl()}/l/${listing.slug}`;
  const brokerCatalogueHref = workspace ? `/b/${workspace.slug}` : "";
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
      <ListingViewTracker listingId={listing.id} />
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
            {brokerCatalogueHref ? (
              <Button asChild size="sm" variant="outline" className="hidden bg-white sm:inline-flex">
                <Link href={brokerCatalogueHref}>
                  <Store className="size-4" />
                  Broker catalogue
                </Link>
              </Button>
            ) : null}
            <ShareListingButton
              listingId={listing.id}
              title={listing.title}
              url={publicListingUrl}
              className="hidden bg-white text-zinc-950 ring-1 ring-zinc-200 hover:bg-zinc-100 sm:inline-flex"
            />
            {hasVerifiedContact ? (
              <Button asChild size="sm" className="hidden bg-emerald-600 text-white hover:bg-emerald-700 sm:inline-flex">
                <TrackedListingLink listingId={listing.id} type="whatsapp_click" href={whatsappHref}>
                  <MessageCircle className="size-4" />
                  WhatsApp
                </TrackedListingLink>
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

      <section className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-10 lg:px-8">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-7 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12">
          <article className="min-w-0">
            <div className="border-b border-zinc-200 pb-5 sm:pb-8">
              <div className="flex flex-wrap items-start gap-2 text-xs font-medium text-zinc-600 sm:items-center sm:text-sm">
                <span className="flex min-w-0 max-w-full items-start gap-1.5 break-words">
                  <MapPin className="mt-0.5 size-4 shrink-0" />
                  <span className="min-w-0 leading-5">{listing.location}</span>
                </span>
                <span className="hidden text-zinc-300 sm:inline">/</span>
                <span className="min-w-0 leading-5">{listing.societyName}</span>
              </div>
              <h1 className="mt-3 max-w-4xl text-balance text-[1.9rem] font-semibold leading-[1.04] tracking-tight sm:mt-4 sm:text-5xl lg:text-6xl">
                {listing.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-5 sm:gap-4">
                <p className="mr-1 inline-flex items-baseline gap-1 text-2xl font-semibold tracking-tight sm:text-4xl">
                  {formatRupees(listing.price)}
                  {listing.transactionType === "rent" ? (
                    <span className="text-base font-medium text-zinc-500 sm:text-lg">/month</span>
                  ) : null}
                </p>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800 sm:px-3 sm:text-sm">
                  <Home className="size-4" />
                  {listing.transactionType === "sale" ? "For sale" : "For rent"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 sm:px-3 sm:text-sm">
                  <IndianRupee className="size-4" />
                  Brokerage {listing.brokerage || "on request"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200 sm:px-3 sm:text-sm">
                  <Eye className="size-4" />
                  {formatNumber(listing.views)} views
                </span>
              </div>
              {brokerCatalogueHref ? (
                <Link
                  href={brokerCatalogueHref}
                  className="mt-4 flex min-h-11 max-w-full items-center gap-2 rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-900 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 sm:hidden"
                >
                  <Store className="size-4 text-emerald-700" />
                  <span className="min-w-0 truncate">View more from this broker</span>
                  <ArrowRight className="size-4 shrink-0" />
                </Link>
              ) : null}
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
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 p-5 shadow-[0_16px_50px_rgba(16,185,129,0.10)] sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-7">
                <div>
                  <p className="text-sm font-semibold text-emerald-700">Made with The Realestate Link</p>
                  <h2 className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight text-zinc-950">
                    Want a page like this for your property?
                  </h2>
                  <p className="mt-3 max-w-3xl leading-7 text-zinc-600">
                    Send photos and details on WhatsApp. Get a clean listing link that is ready to share.
                  </p>
                </div>
                <Button
                  asChild
                  className="mt-5 h-12 w-full bg-zinc-950 text-white hover:bg-zinc-800 sm:mt-0 sm:w-auto"
                >
                  <a href={CREATE_LISTING_WHATSAPP_URL} target="_blank" rel="noreferrer">
                    Create your listing
                    <ArrowRight className="size-4" />
                  </a>
                </Button>
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
                        <TrackedListingLink listingId={listing.id} type="whatsapp_click" href={whatsappHref}>
                          <MessageCircle className="size-4" />
                          WhatsApp
                        </TrackedListingLink>
                      </Button>
                      <Button asChild variant="outline" className="h-11">
                        <TrackedListingLink listingId={listing.id} type="call_click" href={`tel:+${verifiedContactPhone}`}>
                          <Phone className="size-4" />
                          Call
                        </TrackedListingLink>
                      </Button>
                    </div>
                  ) : null}
                  {brokerCatalogueHref ? (
                    <Link
                      href={brokerCatalogueHref}
                      className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-[#fbfaf7] p-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm ring-1 ring-zinc-200">
                          <Store className="size-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-zinc-950">
                            Broker catalogue
                          </span>
                          <span className="block truncate text-xs text-zinc-500">
                            More active properties from {brokerName}
                          </span>
                        </span>
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-zinc-500" />
                    </Link>
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
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-[#fbfaf7]/96 px-3 pb-[calc(0.65rem+env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-10px_30px_rgba(24,24,27,0.12)] backdrop-blur sm:hidden">
        <div className="mx-auto grid w-full max-w-lg gap-2">
          <div className="flex min-w-0 items-center justify-between gap-3 px-1">
            <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold leading-tight">
              <IndianRupee className="size-4 shrink-0 text-emerald-700" />
              <span className="truncate">
                {actionLabel} · {priceLabel}
              </span>
            </p>
            <p className="min-w-0 truncate text-right text-xs text-zinc-500">{mobileContext}</p>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_52px_52px] gap-2">
            <Button asChild className="h-[52px] min-w-0 rounded-xl bg-emerald-600 px-4 text-base text-white hover:bg-emerald-700">
              <TrackedListingLink listingId={listing.id} type="whatsapp_click" href={whatsappHref}>
                <MessageCircle className="size-5" />
                WhatsApp
              </TrackedListingLink>
            </Button>
            <Button asChild variant="outline" size="icon" className="size-[52px] rounded-xl bg-white">
              <TrackedListingLink listingId={listing.id} type="call_click" href={`tel:+${verifiedContactPhone}`} ariaLabel="Call broker">
                <Phone className="size-5" />
              </TrackedListingLink>
            </Button>
            <ShareListingButton
              listingId={listing.id}
              title={listing.title}
              url={publicListingUrl}
              iconOnly
              className="size-[52px] rounded-xl bg-zinc-950 text-white hover:bg-zinc-800"
            />
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
  verificationLookup,
}: {
  branding: Awaited<ReturnType<typeof getPlatformBranding>>;
  listing: Listing;
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
              Verify your profile to publish this listing.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
              Confirm the WhatsApp number that sent this property. You only need to do this once.
            </p>
            <div className="mt-7 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="text-sm font-medium text-zinc-500">Property</p>
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
              Add your details and enter the OTP sent to your WhatsApp number.
            </p>
            {verificationLookup ? (
              <p className="mt-5 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                Complete verification to publish this property and open your broker workspace.
              </p>
            ) : (
              <p className="mt-5 rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                Open the latest link from your WhatsApp chat to continue.
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
  const [branding, listing] = await Promise.all([
    getCachedPublicBranding(),
    getCachedPublicListing(slug),
  ]);
  if (!listing) {
    return {
      title: `Property not found | ${branding.brandName}`,
    };
  }

  const heroMedia = await getCachedPublicListingHeroMedia(listing.workspaceId, listing.id);
  const image = heroMedia?.url;
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

const getCachedOwnerProfile = cache((workspaceId: string, ownerProfileId: string) =>
  ownerProfileService.findById(workspaceId, ownerProfileId),
);

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
