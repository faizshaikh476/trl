import type { AIProvider, AIResult, ListingExtractionInput } from "@/lib/ai/ai-provider";
import { listingExtractionSchema, type ListingExtraction } from "@/lib/listings/listing.schema";
import { ZodError } from "zod";

interface DeepSeekChatCompletion {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    prompt_cache_hit_tokens?: number;
    prompt_cache_miss_tokens?: number;
    completion_tokens?: number;
  };
}

function requireDeepSeekKey() {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY is not configured.");
  return key;
}

function buildPrompt(input: ListingExtractionInput) {
  const mediaSummary = input.media.length
    ? input.media.map((item, index) => `${index + 1}. ${item.type}: ${item.url}`).join("\n")
    : "No media attached.";

  return `
Extract a broker-ready Indian real-estate listing from this WhatsApp conversation.

Rules:
- Return only valid JSON.
- Return the exact object shape shown below. Do not wrap it in "data", "listing", "property", or markdown.
- Keep the public copy confident, sales-oriented, and useful for a broker property showcase.
- Do not write legal warning sections. Put uncertainty into riskFlags, missingFields, and confirmationQuestions.
- Use numeric INR price values, e.g. 9000000 for 90 lacs.
- Preserve broker terms such as brokerage, taxes, location, society, area, bedrooms, bathrooms, floor, and availability.
- Use null for missing numeric nullable fields. Use empty strings for missing string fields.
- listingQualityScore must be a number from 0 to 100. confidenceScore must be a number from 0 to 1.

Required JSON shape:
{
  "title": "2 BHK Apartment for Rent in Example Society, Example Locality",
  "transactionType": "rent",
  "propertyType": "apartment",
  "location": "Example Society, Example Locality, Pune",
  "city": "Pune",
  "locality": "Example Locality",
  "societyName": "Example Society",
  "googleMapsUrl": "",
  "price": 45000,
  "deposit": null,
  "brokerage": "",
  "taxes": "",
  "bhk": 2,
  "bedrooms": 2,
  "bathrooms": null,
  "carpetArea": null,
  "builtUpArea": null,
  "plotArea": null,
  "openArea": null,
  "furnishedStatus": null,
  "parkingCount": 1,
  "floor": null,
  "totalFloors": null,
  "availability": null,
  "preferredTenant": null,
  "highlights": ["Real highlight from the message"],
  "amenities": ["Real amenity from the message"],
  "descriptionShort": "Short broker-facing summary.",
  "descriptionLong": "Detailed broker-facing description based only on the message.",
  "seoTitle": "SEO title based on the property",
  "seoDescription": "SEO description based on the property",
  "whatsappShareText": "Short share text",
  "instagramCaption": "Short social caption",
  "missingFields": ["missing field name"],
  "riskFlags": [],
  "confirmationQuestions": ["Question to ask the broker"],
  "listingQualityScore": 75,
  "confidenceScore": 0.8
}

WhatsApp text:
${input.text}

Attached media:
${mediaSummary}
`;
}

function parseJsonObject(content: string) {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  return JSON.parse(fenced ?? trimmed);
}

function unwrapExtractionPayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  return record.listing ?? record.property ?? record.data ?? record.extraction ?? value;
}

function validationMessage(error: unknown) {
  if (error instanceof ZodError) return JSON.stringify(error.issues);
  return error instanceof Error ? error.message : "Unknown validation error";
}

function estimateCost(usage: DeepSeekChatCompletion["usage"]) {
  if (!usage) return 0;
  const cacheHitInput = ((usage.prompt_cache_hit_tokens ?? 0) / 1_000_000) * 0.0028;
  const cacheMissInput =
    ((usage.prompt_cache_miss_tokens ?? usage.prompt_tokens ?? 0) / 1_000_000) * 0.14;
  const output = ((usage.completion_tokens ?? 0) / 1_000_000) * 0.28;
  return Number((cacheHitInput + cacheMissInput + output).toFixed(6));
}

export class DeepSeekProvider implements AIProvider {
  name = "deepseek";
  private model = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";

  async extractListing(input: ListingExtractionInput): Promise<AIResult<ListingExtraction>> {
    const completion = await this.createCompletion([
      {
        role: "system",
        content:
          "You extract structured real-estate listing data for therealestatelink. Return one valid JSON object matching the requested fields exactly.",
      },
      {
        role: "user",
        content: buildPrompt(input),
      },
    ]);

    const content = completion.choices?.[0]?.message?.content;
    if (!content) throw new Error("DeepSeek extraction returned no content.");

    const parsed = await this.parseOrRepairExtraction(content, input);
    return {
      provider: this.name,
      model: this.model,
      taskType: "extract_listing",
      data: parsed,
      confidenceScore: parsed.confidenceScore,
      costEstimate: estimateCost(completion.usage),
    };
  }

  private async createCompletion(messages: Array<{ role: "system" | "user"; content: string }>) {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${requireDeepSeekKey()}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        thinking: { type: "disabled" },
        max_tokens: 2200,
        messages,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`DeepSeek extraction failed: ${response.status} ${details}`);
    }

    return (await response.json()) as DeepSeekChatCompletion;
  }

  private async parseOrRepairExtraction(content: string, input: ListingExtractionInput) {
    try {
      return listingExtractionSchema.parse(unwrapExtractionPayload(parseJsonObject(content)));
    } catch (error) {
      const repair = await this.createCompletion([
        {
          role: "system",
          content:
            "You repair invalid JSON into the exact therealestatelink listing extraction schema. Return only one valid JSON object.",
        },
        {
          role: "user",
          content: `${buildPrompt(input)}

The previous JSON was invalid for this reason:
${validationMessage(error)}

Previous JSON:
${content}

Return the corrected JSON object only.`,
        },
      ]);
      const repaired = repair.choices?.[0]?.message?.content;
      if (!repaired) throw error;
      return listingExtractionSchema.parse(unwrapExtractionPayload(parseJsonObject(repaired)));
    }
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
