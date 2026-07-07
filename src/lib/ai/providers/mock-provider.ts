import type { AIProvider, AIResult, ListingExtractionInput } from "@/lib/ai/ai-provider";
import {
  buildListingTitleFromExtraction,
  listingExtractionSchema,
  type ListingExtraction,
} from "@/lib/listings/listing.schema";

function parsePrice(text: string) {
  const lower = text.toLowerCase();
  const crore = lower.match(/(\d+(?:\.\d+)?)\s*(cr|crore|crores)/);
  if (crore) return Math.round(Number(crore[1]) * 10000000);
  const lakh = lower.match(/(\d+(?:\.\d+)?)\s*(l|lac|lacs|lakh|lakhs)/);
  if (lakh) return Math.round(Number(lakh[1]) * 100000);
  const thousand = lower.match(/(\d+(?:\.\d+)?)\s*(k|thousand)/);
  if (thousand) return Math.round(Number(thousand[1]) * 1000);
  const rent = lower.match(/(?:rent|rental|monthly)\D+(\d{2,6})/);
  if (rent) return Number(rent[1]);
  const raw = lower.match(/price\D+(\d{6,})/);
  if (raw) return Number(raw[1]);
  const numeric = lower.match(/(?:₹|rs\.?|inr)\s*(\d[\d,]*)/);
  return numeric ? Number(numeric[1].replaceAll(",", "")) : 0;
}

function detectRiskFlags(text: string) {
  const lower = text.toLowerCase();
  const flags = new Set<string>();
  if (lower.includes("open plot") || lower.includes("attached") || lower.includes("garden")) {
    flags.add("attached_open_area");
  }
  if (lower.includes("construct") || lower.includes("expansion") || lower.includes("additional")) {
    flags.add("future_expansion");
  }
  if (lower.includes("separate entry") || lower.includes("entry & exit")) {
    flags.add("separate_entry_exit");
  }
  if (lower.includes("exclusive")) flags.add("exclusive_use");
  return Array.from(flags);
}

function buildExtraction(input: ListingExtractionInput): ListingExtraction {
  const text = input.text;
  const lower = text.toLowerCase();
  const price = parsePrice(text);
  const riskFlags = detectRiskFlags(text);
  const hasGarden = /1200|garden|open plot/i.test(text);
  const bhk = Number(lower.match(/(\d+)\s*(bhk|bed|bedroom)/)?.[1] ?? "") || null;
  const bathrooms = Number(lower.match(/(\d+)\s*(bath|bathroom)/)?.[1] ?? "") || null;
  const parkingCount = /parking/i.test(text)
    ? Number(lower.match(/(\d+)\s*(car\s*)?parking/)?.[1] ?? "1")
    : null;
  const carpetArea =
    Number(lower.match(/(\d+)\s*(sq\.?\s*ft|sqft|sft).{0,20}(carpet|built)/)?.[1] ?? "") ||
    Number(lower.match(/carpet\D+(\d+)/)?.[1] ?? "") ||
    (/515/.test(text) ? 515 : null);
  const openArea =
    Number(lower.match(/(\d+)\s*(sq\.?\s*ft|sqft|sft).{0,20}(open|garden|plot)/)?.[1] ?? "") ||
    (/1200/.test(text) ? 1200 : null);
  const societyName = /parmar/i.test(text) ? "Parmar Residency" : "";
  const locality = /salunke/i.test(text) ? "Salunke Vihar Road" : "";
  const propertyType = /villa|bungalow/i.test(text) ? "villa" : "apartment";

  const extraction = listingExtractionSchema.parse({
    title: hasGarden
      ? "Rare Corner Ground Floor Flat with 1200 Sqft Attached Garden"
      : "Premium Property Listing Draft",
    transactionType: /rent/i.test(text) ? "rent" : "sale",
    propertyType,
    location: /parmar/i.test(text)
      ? "Parmar Residency, near Salunke Vihar Road, Pune"
      : "Pune",
    city: /pune/i.test(text) ? "Pune" : "Pune",
    locality,
    societyName,
    googleMapsUrl: "",
    price,
    deposit: null,
    brokerage: /2%/.test(text) ? "2%" : "",
    taxes: /tax/i.test(text) ? "extra" : "",
    bhk,
    bedrooms: bhk,
    bathrooms,
    carpetArea,
    builtUpArea: null,
    plotArea: /1700/.test(text) ? 1700 : null,
    openArea,
    furnishedStatus: null,
    parkingCount,
    floor: /ground/i.test(text) ? "ground" : null,
    totalFloors: null,
    availability: null,
    preferredTenant: null,
    highlights: [
      "Corner flat with three-side openness",
      "Attached open garden area",
      "Independent house-like feel",
      "Reserved car parking",
    ],
    amenities: ["Natural light", "Ventilation", "Car parking", "Garden access"],
    descriptionShort:
      "A rare ground floor corner home in Pune with a large attached open area and strong family-living appeal.",
    descriptionLong:
      "This ground floor corner flat pairs compact constructed space with a substantial attached open garden area. The attached open area may offer future expansion potential, subject to society rules, municipal permissions, and applicable approvals. Buyers should verify ownership, usage rights, and documents independently.",
    seoTitle: "Rare Ground Floor Garden Flat in Pune | therealestatelink",
    seoDescription:
      "View a rare corner ground floor flat near Salunke Vihar Road with attached garden area, parking, and broker verified details.",
    whatsappShareText:
      "Rare corner ground floor flat with 1200 sqft attached garden in Pune. View details on therealestatelink.",
    instagramCaption:
      "Rare Pune find: ground floor corner flat with a large attached garden area. Details subject to verification.",
    missingFields: ["maintenance", "property age", "garden ownership confirmation"],
    riskFlags,
    confirmationQuestions: [
      "Is the 1200 sqft open area legally owned, exclusive-use, or society-allotted?",
      "Is the attached open area mentioned in the sale deed or Index 2?",
      "Is future construction allowed by society and municipal authorities?",
    ],
    listingQualityScore: 82,
    confidenceScore: 0.88,
  });

  return {
    ...extraction,
    title: hasGarden ? extraction.title : buildListingTitleFromExtraction(extraction),
  };
}

export class MockAIProvider implements AIProvider {
  name = "mock";

  async extractListing(input: ListingExtractionInput): Promise<AIResult<ListingExtraction>> {
    const data = buildExtraction(input);
    return {
      provider: this.name,
      model: "mock-indian-real-estate-v1",
      taskType: "extract_listing",
      data,
      confidenceScore: data.confidenceScore,
      costEstimate: 0,
    };
  }

  async generateListingCopy(input: ListingExtraction) {
    return {
      provider: this.name,
      model: "mock-copy-v1",
      taskType: "listing_copy" as const,
      data: {
        descriptionShort: input.descriptionShort,
        descriptionLong: input.descriptionLong,
      },
      confidenceScore: input.confidenceScore,
      costEstimate: 0,
    };
  }

  async detectRiskFlags(input: ListingExtractionInput) {
    return {
      provider: this.name,
      model: "mock-risk-v1",
      taskType: "risk_detection" as const,
      data: detectRiskFlags(input.text),
      confidenceScore: 0.9,
      costEstimate: 0,
    };
  }

  async generateMissingQuestions(input: ListingExtraction) {
    return {
      provider: this.name,
      model: "mock-questions-v1",
      taskType: "missing_questions" as const,
      data: input.confirmationQuestions,
      confidenceScore: input.confidenceScore,
      costEstimate: 0,
    };
  }

  async generateMarketingAssets(input: ListingExtraction) {
    return {
      provider: this.name,
      model: "mock-marketing-v1",
      taskType: "marketing_assets" as const,
      data: {
        seoTitle: input.seoTitle,
        seoDescription: input.seoDescription,
        whatsappShareText: input.whatsappShareText,
        instagramCaption: input.instagramCaption,
      },
      confidenceScore: input.confidenceScore,
      costEstimate: 0,
    };
  }

  async classifyPropertyImages(input: ListingExtractionInput) {
    return {
      provider: this.name,
      model: "mock-vision-v1",
      taskType: "image_classification" as const,
      data: input.media.map((media, index) => ({
        mediaId: media.id,
        roomType: index === 0 ? "living room" : "other",
      })),
      confidenceScore: 0.7,
      costEstimate: 0,
    };
  }
}
