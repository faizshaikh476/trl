import { z } from "zod";

export const listingExtractionSchema = z.object({
  title: z.string().min(8),
  transactionType: z.enum(["sale", "rent"]),
  propertyType: z.string().min(2),
  location: z.string().min(2),
  city: z.string().min(2),
  locality: z.string().default(""),
  societyName: z.string().default(""),
  googleMapsUrl: z.string().default(""),
  price: z.number().nonnegative(),
  deposit: z.number().nullable().default(null),
  brokerage: z.string().default(""),
  taxes: z.string().default(""),
  bhk: z.number().nullable().default(null),
  bedrooms: z.number().nullable().default(null),
  bathrooms: z.number().nullable().default(null),
  carpetArea: z.number().nullable().default(null),
  builtUpArea: z.number().nullable().default(null),
  plotArea: z.number().nullable().default(null),
  openArea: z.number().nullable().default(null),
  furnishedStatus: z.string().nullable().default(null),
  parkingCount: z.number().nullable().default(null),
  floor: z.string().nullable().default(null),
  totalFloors: z.number().nullable().default(null),
  availability: z.string().nullable().default(null),
  preferredTenant: z.string().nullable().default(null),
  highlights: z.array(z.string()).default([]),
  amenities: z.array(z.string()).default([]),
  descriptionShort: z.string().default(""),
  descriptionLong: z.string().default(""),
  seoTitle: z.string().default(""),
  seoDescription: z.string().default(""),
  whatsappShareText: z.string().default(""),
  instagramCaption: z.string().default(""),
  missingFields: z.array(z.string()).default([]),
  riskFlags: z.array(z.string()).default([]),
  confirmationQuestions: z.array(z.string()).default([]),
  listingQualityScore: z.number().min(0).max(100),
  confidenceScore: z.number().min(0).max(1),
});

export type ListingExtraction = z.infer<typeof listingExtractionSchema>;

const genericTitlePatterns = [
  /^premium property listing draft$/i,
  /^property listing draft$/i,
  /^listing draft$/i,
  /^premium property listing$/i,
];

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function compactPlaceParts(parts: Array<string | null | undefined>) {
  const seen = new Set<string>();
  return parts
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .filter((part) => {
      const key = part.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

const mobileNumberWithOptionalCountryCodePattern =
  /(^|[^\d])((?:\+?91[\s.-]*)?(?:0[\s.-]*)?[6-9](?:[\s.-]*\d){9})(?!\d)/g;
const labelledMobileNumberPattern =
  /\b(?:call|contact|mobile|phone|whatsapp|wa|number|no\.?)\s*:?\s*(?:\+?91[\s.-]*)?(?:0[\s.-]*)?[6-9](?:[\s.-]*\d){9}(?!\d)/gi;
const emptyContactLabelPattern =
  /\b(?:call|contact|mobile|phone|whatsapp|wa|number|no\.?)\s*:?\s*(?=\.|,|$)/gi;

export function sanitizeListingPublicText(value: string) {
  return value
    .replace(labelledMobileNumberPattern, "")
    .replace(mobileNumberWithOptionalCountryCodePattern, "$1")
    .replace(emptyContactLabelPattern, "")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

function sanitizeListingPublicTextList(items: string[]) {
  return items.map((item) => sanitizeListingPublicText(item)).filter(Boolean);
}

export function isGenericListingTitle(title: string) {
  const normalized = title.trim();
  return genericTitlePatterns.some((pattern) => pattern.test(normalized));
}

export function buildListingTitleFromExtraction(extraction: ListingExtraction) {
  const propertyType = extraction.propertyType
    ? titleCase(extraction.propertyType.replaceAll("_", " "))
    : "Property";
  const configuration = extraction.bhk
    ? `${extraction.bhk} BHK`
    : extraction.bedrooms
      ? `${extraction.bedrooms} Bedroom`
      : "";
  const floorPrefix = extraction.floor && /ground/i.test(extraction.floor) ? "Ground Floor" : "";
  const place = compactPlaceParts([
    extraction.societyName,
    extraction.locality,
    extraction.city || extraction.location,
  ]).join(", ");
  const base = compactPlaceParts([configuration, floorPrefix, propertyType]).join(" ");
  const transaction = extraction.transactionType === "rent" ? "for Rent" : "for Sale";
  const placeSuffix = place ? ` in ${place}` : "";

  return `${base || "Property"} ${transaction}${placeSuffix}`;
}

export function normalizeListingExtractionTitle(extraction: ListingExtraction) {
  const titledExtraction = isGenericListingTitle(extraction.title)
    ? {
        ...extraction,
        title: buildListingTitleFromExtraction(extraction),
      }
    : extraction;

  return {
    ...titledExtraction,
    title: sanitizeListingPublicText(titledExtraction.title),
    descriptionShort: sanitizeListingPublicText(titledExtraction.descriptionShort),
    descriptionLong: sanitizeListingPublicText(titledExtraction.descriptionLong),
    seoTitle: sanitizeListingPublicText(titledExtraction.seoTitle),
    seoDescription: sanitizeListingPublicText(titledExtraction.seoDescription),
    whatsappShareText: sanitizeListingPublicText(titledExtraction.whatsappShareText),
    instagramCaption: sanitizeListingPublicText(titledExtraction.instagramCaption),
    highlights: sanitizeListingPublicTextList(titledExtraction.highlights),
    amenities: sanitizeListingPublicTextList(titledExtraction.amenities),
    riskFlags: sanitizeListingPublicTextList(titledExtraction.riskFlags),
    confirmationQuestions: sanitizeListingPublicTextList(titledExtraction.confirmationQuestions),
  };
}

export function normalizeManualListingInput<
  T extends {
    title: string;
    descriptionShort: string;
    descriptionLong: string;
    seoTitle: string;
    seoDescription: string;
    whatsappShareText: string;
    instagramCaption: string;
    highlightsText: string[];
    amenitiesText: string[];
  },
>(input: T): T {
  return {
    ...input,
    title: sanitizeListingPublicText(input.title),
    descriptionShort: sanitizeListingPublicText(input.descriptionShort),
    descriptionLong: sanitizeListingPublicText(input.descriptionLong),
    seoTitle: sanitizeListingPublicText(input.seoTitle),
    seoDescription: sanitizeListingPublicText(input.seoDescription),
    whatsappShareText: sanitizeListingPublicText(input.whatsappShareText),
    instagramCaption: sanitizeListingPublicText(input.instagramCaption),
    highlightsText: sanitizeListingPublicTextList(input.highlightsText),
    amenitiesText: sanitizeListingPublicTextList(input.amenitiesText),
  };
}

const optionalNumberFromForm = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return null;
  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? value : numberValue;
}, z.number().nonnegative().nullable());

function splitList(value: string | undefined | null) {
  return String(value ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const manualListingSchema = z.object({
  title: z.string().trim().min(8),
  transactionType: z.enum(["sale", "rent"]),
  propertyType: z.string().trim().min(2),
  location: z.string().trim().min(2),
  city: z.string().trim().min(2),
  locality: z.string().trim().default(""),
  societyName: z.string().trim().default(""),
  googleMapsUrl: z.string().trim().default(""),
  price: z.coerce.number().nonnegative(),
  deposit: optionalNumberFromForm.default(null),
  brokerage: z.string().trim().default(""),
  taxes: z.string().trim().default(""),
  bhk: optionalNumberFromForm.default(null),
  bedrooms: optionalNumberFromForm.default(null),
  bathrooms: optionalNumberFromForm.default(null),
  carpetArea: optionalNumberFromForm.default(null),
  builtUpArea: optionalNumberFromForm.default(null),
  plotArea: optionalNumberFromForm.default(null),
  openArea: optionalNumberFromForm.default(null),
  furnishedStatus: z.string().trim().nullable().default(null),
  parkingCount: optionalNumberFromForm.default(null),
  floor: z.string().trim().nullable().default(null),
  totalFloors: optionalNumberFromForm.default(null),
  availability: z.string().trim().nullable().default(null),
  preferredTenant: z.string().trim().nullable().default(null),
  descriptionShort: z.string().trim().default(""),
  descriptionLong: z.string().trim().default(""),
  highlightsText: z.string().optional().transform(splitList),
  amenitiesText: z.string().optional().transform(splitList),
  seoTitle: z.string().trim().default(""),
  seoDescription: z.string().trim().default(""),
  whatsappShareText: z.string().trim().default(""),
  instagramCaption: z.string().trim().default(""),
}).transform(normalizeManualListingInput);

export type ManualListingInput = z.infer<typeof manualListingSchema>;

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
