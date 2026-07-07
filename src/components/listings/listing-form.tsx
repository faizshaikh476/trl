import { BadgeIndianRupee, Home, ListChecks, MapPin, Save, Share2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Listing } from "@/types/domain";

function listValue(items: string[] | undefined) {
  return items?.join("\n") ?? "";
}

export function ListingForm({
  listing,
  action,
  extraFields,
  submitLabel = "Save listing",
  appearance = "dark",
  formId,
}: {
  listing?: Listing;
  action: (formData: FormData) => void | Promise<void>;
  extraFields?: React.ReactNode;
  submitLabel?: string;
  appearance?: "dark" | "studio";
  formId?: string;
}) {
  const studio = appearance === "studio";
  return (
    <form id={formId} action={action} className={cn("space-y-5", studio && "text-stone-950")}>
      {extraFields}
      <FormSection
        title="Essentials"
        description="Set the headline, address, and market basics buyers see first."
        icon={MapPin}
        studio={studio}
        className="md:grid-cols-2"
      >
        <div className="md:col-span-2">
          <FieldLabel htmlFor="title" studio={studio}>Title</FieldLabel>
          <Input id="title" name="title" required defaultValue={listing?.title} className={inputClass(studio)} />
        </div>
        <div>
          <FieldLabel htmlFor="transactionType" studio={studio}>Transaction</FieldLabel>
          <select
            id="transactionType"
            name="transactionType"
            defaultValue={listing?.transactionType ?? "sale"}
            className={selectClass(studio)}
          >
            <option value="sale">Sale</option>
            <option value="rent">Rent</option>
          </select>
        </div>
        <Field name="propertyType" label="Property type" defaultValue={listing?.propertyType ?? "apartment"} studio={studio} />
        <Field name="location" label="Location" defaultValue={listing?.location} required studio={studio} />
        <Field name="city" label="City" defaultValue={listing?.city ?? "Pune"} required studio={studio} />
        <Field name="locality" label="Locality" defaultValue={listing?.locality} studio={studio} />
        <Field name="societyName" label="Society name" defaultValue={listing?.societyName} studio={studio} />
        <Field name="googleMapsUrl" label="Google Maps URL" defaultValue={listing?.googleMapsUrl} className="md:col-span-2" studio={studio} />
      </FormSection>

      <FormSection
        title="Pricing"
        description="Keep the offer clear and ready for WhatsApp enquiries."
        icon={BadgeIndianRupee}
        studio={studio}
        className="md:grid-cols-4"
      >
        <Field name="price" label="Price" type="number" defaultValue={listing?.price} required studio={studio} />
        <Field name="deposit" label="Deposit" type="number" defaultValue={listing?.deposit ?? ""} studio={studio} />
        <Field name="brokerage" label="Brokerage" defaultValue={listing?.brokerage} studio={studio} />
        <Field name="taxes" label="Taxes" defaultValue={listing?.taxes} studio={studio} />
      </FormSection>

      <FormSection
        title="Property Details"
        description="Add the facts buyers compare across every property."
        icon={Home}
        studio={studio}
        className="md:grid-cols-4"
      >
        <Field name="bhk" label="BHK" type="number" defaultValue={listing?.bhk ?? ""} studio={studio} />
        <Field name="bedrooms" label="Bedrooms" type="number" defaultValue={listing?.bedrooms ?? ""} studio={studio} />
        <Field name="bathrooms" label="Bathrooms" type="number" defaultValue={listing?.bathrooms ?? ""} studio={studio} />
        <Field name="parkingCount" label="Parking" type="number" defaultValue={listing?.parkingCount ?? ""} studio={studio} />
        <Field name="carpetArea" label="Carpet area" type="number" defaultValue={listing?.carpetArea ?? ""} studio={studio} />
        <Field name="builtUpArea" label="Built-up area" type="number" defaultValue={listing?.builtUpArea ?? ""} studio={studio} />
        <Field name="plotArea" label="Plot area" type="number" defaultValue={listing?.plotArea ?? ""} studio={studio} />
        <Field name="openArea" label="Open area" type="number" defaultValue={listing?.openArea ?? ""} studio={studio} />
        <Field name="furnishedStatus" label="Furnished status" defaultValue={listing?.furnishedStatus ?? ""} studio={studio} />
        <Field name="floor" label="Floor" defaultValue={listing?.floor ?? ""} studio={studio} />
        <Field name="totalFloors" label="Total floors" type="number" defaultValue={listing?.totalFloors ?? ""} studio={studio} />
        <Field name="availability" label="Availability" defaultValue={listing?.availability ?? ""} studio={studio} />
        <Field name="preferredTenant" label="Preferred tenant" defaultValue={listing?.preferredTenant ?? ""} className="md:col-span-2" studio={studio} />
      </FormSection>

      <FormSection
        title="Listing Story"
        description="Shape the page so it feels useful, premium, and easy to share."
        icon={Sparkles}
        studio={studio}
      >
        <TextField name="descriptionShort" label="Short description" defaultValue={listing?.descriptionShort} studio={studio} />
        <TextField name="descriptionLong" label="Long description" defaultValue={listing?.descriptionLong} rows={5} studio={studio} />
        <TextField name="highlightsText" label="Highlights, one per line" defaultValue={listValue(listing?.highlights)} rows={4} studio={studio} />
        <TextField name="amenitiesText" label="Amenities, one per line" defaultValue={listValue(listing?.amenities)} rows={4} studio={studio} />
      </FormSection>

      <FormSection
        title="Share Copy"
        description="Tune the preview text brokers and buyers see outside the page."
        icon={Share2}
        studio={studio}
        className="md:grid-cols-2"
      >
        <Field name="seoTitle" label="SEO title" defaultValue={listing?.seoTitle} studio={studio} />
        <Field name="seoDescription" label="SEO description" defaultValue={listing?.seoDescription} studio={studio} />
        <TextField name="whatsappShareText" label="WhatsApp share text" defaultValue={listing?.whatsappShareText} studio={studio} />
        <TextField name="instagramCaption" label="Instagram caption" defaultValue={listing?.instagramCaption} studio={studio} />
      </FormSection>

      <Button
        type="submit"
        className={cn(
          "h-11",
          studio ? "bg-stone-950 px-5 text-white hover:bg-stone-800" : "bg-emerald-400 text-zinc-950 hover:bg-emerald-300",
        )}
      >
        <Save className="size-4" />
        {submitLabel}
      </Button>
    </form>
  );
}

function FormSection({
  title,
  description,
  icon: Icon,
  studio,
  className,
  children,
}: {
  title: string;
  description: string;
  icon: typeof ListChecks;
  studio: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        studio
          ? "rounded-2xl border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/50"
          : "rounded-lg border border-white/10 bg-white/[0.04] p-5",
      )}
    >
      {studio ? (
        <div className="mb-5 flex items-start gap-3 border-b border-stone-100 pb-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <Icon className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-stone-950">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-stone-500">{description}</p>
          </div>
        </div>
      ) : null}
      <div className={cn("grid gap-4", className)}>{children}</div>
    </section>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
  required,
  className,
  studio = false,
}: {
  name: string;
  label: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
  className?: string;
  studio?: boolean;
}) {
  return (
    <div className={className}>
      <FieldLabel htmlFor={name} studio={studio}>{label}</FieldLabel>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        className={inputClass(studio)}
      />
    </div>
  );
}

function TextField({
  name,
  label,
  defaultValue,
  rows = 3,
  studio = false,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  rows?: number;
  studio?: boolean;
}) {
  return (
    <div>
      <FieldLabel htmlFor={name} studio={studio}>{label}</FieldLabel>
      <Textarea
        id={name}
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? ""}
        className={textareaClass(studio)}
      />
    </div>
  );
}

function FieldLabel({
  htmlFor,
  studio,
  children,
}: {
  htmlFor: string;
  studio: boolean;
  children: React.ReactNode;
}) {
  return (
    <Label htmlFor={htmlFor} className={studio ? "text-sm font-semibold text-stone-700" : undefined}>
      {children}
    </Label>
  );
}

function inputClass(studio: boolean) {
  return cn(
    "mt-2 h-11",
    studio
      ? "border-stone-200 bg-stone-50 px-3 text-stone-950 placeholder:text-stone-400 focus-visible:border-stone-950 focus-visible:ring-stone-950/10"
      : "bg-zinc-950 text-white",
  );
}

function textareaClass(studio: boolean) {
  return cn(
    "mt-2",
    studio
      ? "min-h-28 border-stone-200 bg-stone-50 px-3 text-stone-950 placeholder:text-stone-400 focus-visible:border-stone-950 focus-visible:ring-stone-950/10"
      : "bg-zinc-950 text-white",
  );
}

function selectClass(studio: boolean) {
  return cn(
    "mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none transition focus-visible:ring-3",
    studio
      ? "border-stone-200 bg-stone-50 text-stone-950 focus-visible:border-stone-950 focus-visible:ring-stone-950/10"
      : "border-white/10 bg-zinc-950 text-white",
  );
}
