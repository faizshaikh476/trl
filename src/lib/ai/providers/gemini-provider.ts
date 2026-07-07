import type { AIProvider, AIResult, ListingExtractionInput } from "@/lib/ai/ai-provider";
import { listingExtractionSchema, type ListingExtraction } from "@/lib/listings/listing.schema";

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

function requireGeminiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured.");
  return key;
}

function buildPrompt(input: ListingExtractionInput) {
  const mediaSummary = input.media.length
    ? input.media.map((item, index) => `${index + 1}. ${item.type}: ${item.url}`).join("\n")
    : "No media attached.";

  return `
Extract a broker-ready Indian real-estate listing from this WhatsApp property message.

Return only valid JSON with these exact fields:
title, transactionType, propertyType, location, city, locality, societyName, googleMapsUrl,
price, deposit, brokerage, taxes, bhk, bedrooms, bathrooms, carpetArea, builtUpArea, plotArea,
openArea, furnishedStatus, parkingCount, floor, totalFloors, availability, preferredTenant,
highlights, amenities, descriptionShort, descriptionLong, seoTitle, seoDescription,
whatsappShareText, instagramCaption, missingFields, riskFlags, confirmationQuestions,
listingQualityScore, confidenceScore.

Rules:
- Never invent a generic placeholder title.
- Build the title from the real facts, e.g. "2 BHK Apartment for Rent in Society, Locality".
- Use "sale" or "rent" for transactionType.
- Use numeric INR price values, e.g. 45000 for 45k rent and 9000000 for 90 lacs.
- Use null when a numeric field is not present.
- Preserve society, locality, BHK, rent/sale price, parking, floor, area, furnishing, and availability.
- Keep public copy useful for a broker showcasing the property.
- Put uncertainty into missingFields, riskFlags, and confirmationQuestions.

WhatsApp message:
${input.text}

Attached media:
${mediaSummary}
`;
}

function estimateCost() {
  return 0;
}

export class GeminiProvider implements AIProvider {
  name = "gemini";
  private model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

  async extractListing(input: ListingExtractionInput): Promise<AIResult<ListingExtraction>> {
    const key = requireGeminiKey();
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
          contents: [
            {
              role: "user",
              parts: [{ text: buildPrompt(input) }],
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Gemini extraction failed: ${response.status} ${details}`);
    }

    const completion = (await response.json()) as GeminiGenerateContentResponse;
    const content = completion.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();
    if (!content) throw new Error("Gemini extraction returned no content.");

    const parsed = listingExtractionSchema.parse(JSON.parse(content));
    return {
      provider: this.name,
      model: this.model,
      taskType: "extract_listing",
      data: parsed,
      confidenceScore: parsed.confidenceScore,
      costEstimate: estimateCost(),
    };
  }

  async generateListingCopy(input: ListingExtraction) {
    return {
      provider: this.name,
      model: this.model,
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
    const result = await this.extractListing(input);
    return {
      provider: this.name,
      model: this.model,
      taskType: "risk_detection" as const,
      data: result.data.riskFlags,
      confidenceScore: result.confidenceScore,
      costEstimate: result.costEstimate,
    };
  }

  async generateMissingQuestions(input: ListingExtraction) {
    return {
      provider: this.name,
      model: this.model,
      taskType: "missing_questions" as const,
      data: input.confirmationQuestions,
      confidenceScore: input.confidenceScore,
      costEstimate: 0,
    };
  }

  async generateMarketingAssets(input: ListingExtraction) {
    return {
      provider: this.name,
      model: this.model,
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
      model: this.model,
      taskType: "image_classification" as const,
      data: input.media.map((media, index) => ({
        mediaId: media.id,
        roomType: index === 0 ? "hero" : "property",
      })),
      confidenceScore: 0.7,
      costEstimate: 0,
    };
  }
}
