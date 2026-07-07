import type { AIProvider, AIResult, ListingExtractionInput } from "@/lib/ai/ai-provider";
import { listingExtractionSchema, type ListingExtraction } from "@/lib/listings/listing.schema";

interface OpenAIChatCompletion {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

function requireOpenAIKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured.");
  return key;
}

function buildPrompt(input: ListingExtractionInput) {
  const mediaSummary = input.media.length
    ? input.media.map((item, index) => `${index + 1}. ${item.type}: ${item.url}`).join("\n")
    : "No media attached.";

  return `
Extract a broker-ready Indian real-estate listing from the WhatsApp conversation.

Rules:
- Return only valid JSON.
- Keep buyer-facing copy confident and sales-oriented.
- Do not write legal warning sections. Put uncertainty into riskFlags, missingFields, and confirmationQuestions.
- Use INR numeric price values, e.g. 9000000 for 90 lacs.
- Preserve broker terms such as brokerage, taxes, location, society, area, bedrooms, bathrooms, floor, and availability.
- Keep descriptions useful for a public property showcase.

WhatsApp text:
${input.text}

Attached media:
${mediaSummary}
`;
}

function estimateCost(usage: OpenAIChatCompletion["usage"]) {
  if (!usage) return 0;
  const inputCost = ((usage.prompt_tokens ?? 0) / 1_000_000) * 0.4;
  const outputCost = ((usage.completion_tokens ?? 0) / 1_000_000) * 1.6;
  return Number((inputCost + outputCost).toFixed(6));
}

export class OpenAIProvider implements AIProvider {
  name = "openai";
  private model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  async extractListing(input: ListingExtractionInput): Promise<AIResult<ListingExtraction>> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${requireOpenAIKey()}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You extract structured real-estate listing data for therealestatelink. Return JSON matching the requested fields exactly.",
          },
          {
            role: "user",
            content: buildPrompt(input),
          },
        ],
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`OpenAI extraction failed: ${response.status} ${details}`);
    }

    const completion = (await response.json()) as OpenAIChatCompletion;
    const content = completion.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenAI extraction returned no content.");

    const parsed = listingExtractionSchema.parse(JSON.parse(content));
    return {
      provider: this.name,
      model: this.model,
      taskType: "extract_listing",
      data: parsed,
      confidenceScore: parsed.confidenceScore,
      costEstimate: estimateCost(completion.usage),
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
