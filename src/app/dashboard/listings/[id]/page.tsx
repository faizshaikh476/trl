import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Eye,
  IndianRupee,
  MapPin,
  Save,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { ListingForm } from "@/components/listings/listing-form";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { formatRupees } from "@/lib/format";
import { listingService } from "@/lib/listings/listing-service";
import { mediaService } from "@/lib/media/media-service";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { requireWorkspacePermission } from "@/lib/rbac/require-permission";
import { updateManualListingAction } from "@/server-actions/listing-actions";
import type { Listing } from "@/types/domain";

const EDIT_FORM_ID = "listing-studio-form";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const listing = await listingService.findByWorkspaceId(user.workspaceId!, id);

  if (!listing) notFound();
  requireWorkspacePermission(user, listing.workspaceId, PERMISSIONS.LISTINGS_EDIT);

  const media = await mediaService.listByListing(listing.workspaceId, listing.id);
  const hero = media.find((asset) => asset.isHero) ?? media[0] ?? null;
  const improvementItems = [...listing.missingFields, ...listing.riskFlags];

  return (
    <AppShell active="Listings" tone="light">
      <div className="space-y-6 pb-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm" className="text-stone-600 hover:bg-stone-100 hover:text-stone-950">
            <Link href="/dashboard/listings">
              <ArrowLeft className="size-4" />
              Back to listings
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            {listing.status === "published" ? (
              <Button asChild variant="outline" className="border-stone-200 bg-white text-stone-950 hover:bg-stone-100">
                <Link href={`/l/${listing.slug}`}>
                  <Eye className="size-4" />
                  Preview
                </Link>
              </Button>
            ) : null}
            <Button type="submit" form={EDIT_FORM_ID} className="bg-stone-950 text-white hover:bg-stone-800">
              <Save className="size-4" />
              Save changes
            </Button>
          </div>
        </div>

        <section className="overflow-hidden rounded-[2rem] bg-white shadow-sm shadow-stone-200/70 ring-1 ring-stone-200">
          <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="flex min-h-[23rem] flex-col justify-between p-6 sm:p-8 lg:p-10">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
                  <Sparkles className="size-4" />
                  Listing studio
                </div>
                <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.02] tracking-tight text-stone-950 sm:text-5xl">
                  {listing.title}
                </h1>
                <p className="mt-4 flex max-w-2xl items-start gap-2 text-base leading-7 text-stone-500">
                  <MapPin className="mt-1 size-4 shrink-0 text-stone-400" />
                  {listing.location}
                </p>
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <Metric icon={BadgeCheck} label="Status" value={listing.status.replaceAll("_", " ")} />
                <Metric icon={WandSparkles} label="Quality" value={`${listing.qualityScore}/100`} />
                <Metric icon={IndianRupee} label="Price" value={formatRupees(listing.price)} />
              </div>
            </div>
            <div className="relative min-h-[21rem] bg-stone-100">
              {hero?.type === "image" ? (
                <Image
                  src={hero.url}
                  alt=""
                  fill
                  priority
                  sizes="(min-width: 1024px) 42vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full min-h-[21rem] items-center justify-center bg-stone-100 text-stone-400">
                  <Sparkles className="size-10" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950/55 to-transparent p-5">
                <p className="max-w-md text-sm font-medium text-white">
                  This is the first impression buyers see before they decide to enquire.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-5">
            {improvementItems.length > 0 ? (
              <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-amber-700">
                    <WandSparkles className="size-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-stone-950">Improve this listing</h2>
                    <p className="mt-1 text-sm leading-6 text-stone-600">
                      Complete these details to make the share page feel more trustworthy.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {improvementItems.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-stone-700"
                        >
                          {formatChecklistItem(item)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            <ListingForm
              listing={listing}
              action={updateManualListingAction.bind(null, listing.id)}
              submitLabel="Save changes"
              appearance="studio"
              formId={EDIT_FORM_ID}
            />
          </div>

          <ListingPreview listing={listing} heroUrl={hero?.type === "image" ? hero.url : null} mediaCount={media.length} />
        </div>
      </div>
    </AppShell>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof BadgeCheck; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-stone-500">
        <Icon className="size-4" />
        {label}
      </div>
      <p className="mt-2 text-lg font-semibold capitalize text-stone-950">{value}</p>
    </div>
  );
}

function ListingPreview({
  listing,
  heroUrl,
  mediaCount,
}: {
  listing: Listing;
  heroUrl: string | null;
  mediaCount: number;
}) {
  return (
    <aside className="sticky top-5 hidden space-y-4 xl:block">
      <div className="overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white shadow-sm shadow-stone-200/60">
        <div className="relative aspect-[4/3] bg-stone-100">
          {heroUrl ? (
            <Image src={heroUrl} alt="" fill sizes="24rem" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-stone-400">
              <Sparkles className="size-9" />
            </div>
          )}
          <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-stone-950 shadow-sm">
            {mediaCount} photos
          </div>
        </div>
        <div className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Public preview</p>
          <h2 className="mt-2 text-xl font-semibold leading-tight text-stone-950">{listing.title}</h2>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-500">{listing.location}</p>
          <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4">
            <div>
              <p className="text-xs text-stone-500">{listing.transactionType === "rent" ? "Monthly rent" : "Asking price"}</p>
              <p className="text-lg font-semibold text-stone-950">{formatRupees(listing.price)}</p>
            </div>
            <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
              <Link href={`/l/${listing.slug}`}>
                <Eye className="size-4" />
                View
              </Link>
            </Button>
          </div>
        </div>
      </div>
      <div className="rounded-[1.25rem] border border-stone-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-stone-950">Share-ready checklist</h3>
        <div className="mt-4 space-y-3 text-sm text-stone-600">
          <ChecklistRow done={listing.status === "published"} label="Published link is live" />
          <ChecklistRow done={listing.qualityScore >= 75} label="Quality score above 75" />
          <ChecklistRow done={Boolean(heroUrl)} label="Hero image available" />
          <ChecklistRow done={Boolean(listing.whatsappShareText)} label="WhatsApp share text ready" />
        </div>
      </div>
    </aside>
  );
}

function ChecklistRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={done ? "text-emerald-600" : "text-stone-300"}>
        <BadgeCheck className="size-4" />
      </span>
      <span>{label}</span>
    </div>
  );
}

function formatChecklistItem(item: string) {
  return item
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^missing\s+/i, "Missing ");
}
