import type { ListingExtraction } from "@/lib/listings/listing.schema";

type PriceUnit = "crore" | "lakh" | "thousand";

interface SourcePrice {
  amount: number;
  display: string;
  unit: PriceUnit;
}

const pricePattern =
  /(\s*)(?:₹|rs\.?|inr)?\s*(\d+(?:[.,]\d+)?)\s*(cr|crore|crores|lakh|lakhs|lac|lacs|l|k)\b/gi;

export function normalizeExtractionPriceFromSource(
  extraction: ListingExtraction,
  sourceText: string,
): ListingExtraction {
  const sourcePrice = findSourcePrice(sourceText);
  if (!sourcePrice) return extraction;

  return {
    ...extraction,
    price: sourcePrice.amount,
    title: replaceMainPriceMention(extraction.title, sourcePrice),
    seoTitle: replaceMainPriceMention(extraction.seoTitle, sourcePrice),
    whatsappShareText: replaceMainPriceMention(extraction.whatsappShareText, sourcePrice),
    instagramCaption: replaceMainPriceMention(extraction.instagramCaption, sourcePrice),
  };
}

export function findSourcePrice(sourceText: string): SourcePrice | null {
  const candidates = [...sourceText.matchAll(pricePattern)]
    .map((match) => toSourcePrice(match[2], match[3]))
    .filter((price): price is SourcePrice => Boolean(price));

  return candidates[0] ?? null;
}

function toSourcePrice(rawNumber: string, rawUnit: string): SourcePrice | null {
  const value = Number(rawNumber.replace(/,/g, ""));
  if (!Number.isFinite(value)) return null;

  const unit = rawUnit.toLowerCase();
  if (unit === "cr" || unit.startsWith("crore")) {
    return {
      amount: Math.round(value * 10_000_000),
      display: `₹${formatDecimal(value)} Cr`,
      unit: "crore",
    };
  }

  if (unit === "l" || unit.startsWith("lac") || unit.startsWith("lakh")) {
    return {
      amount: Math.round(value * 100_000),
      display: `₹${formatDecimal(value)} L`,
      unit: "lakh",
    };
  }

  if (unit === "k") {
    return {
      amount: Math.round(value * 1_000),
      display: `₹${formatIndianNumber(Math.round(value * 1_000))}`,
      unit: "thousand",
    };
  }

  return null;
}

function replaceMainPriceMention(value: string, sourcePrice: SourcePrice) {
  if (!value) return value;
  return value.replace(pricePattern, (match, leading: string, _amount: string, unit: string) => {
    if (unitMatchesSource(unit, sourcePrice.unit)) return `${leading}${sourcePrice.display}`;
    return match;
  });
}

function unitMatchesSource(rawUnit: string, sourceUnit: PriceUnit) {
  const unit = rawUnit.toLowerCase();
  if (sourceUnit === "crore") return unit === "cr" || unit.startsWith("crore");
  if (sourceUnit === "lakh") return unit === "l" || unit.startsWith("lac") || unit.startsWith("lakh");
  return unit === "k";
}

function formatDecimal(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function formatIndianNumber(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
}
