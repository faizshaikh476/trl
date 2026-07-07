import type { AIResult, ListingExtractionInput } from "./ai-provider";
import type { ListingExtraction } from "@/lib/listings/listing.schema";
import { getAIProvider, listConfiguredProviderNames } from "./ai-router";
import { normalizeExtractionPriceFromSource } from "./price-normalization";

export class AIListingService {
  async extractListing(input: ListingExtractionInput) {
    const provider = getAIProvider();
    try {
      return normalizeAIExtractionResult(await provider.extractListing(input), input);
    } catch (error) {
      if (process.env.NODE_ENV === "production") {
        const fallbackNames = listConfiguredProviderNames().filter(
          (name) => name !== provider.name && name !== "mock",
        );
        for (const fallbackName of fallbackNames) {
          try {
            return normalizeAIExtractionResult(await getAIProvider(fallbackName).extractListing(input), input);
          } catch {
            // Keep trying configured real providers; surface the original failure if all fail.
          }
        }
        throw error;
      }
      const fallback = getAIProvider("mock");
      if (provider.name !== fallback.name) {
        return normalizeAIExtractionResult(await fallback.extractListing(input), input);
      }
      throw error;
    }
  }
}

export const aiListingService = new AIListingService();

function normalizeAIExtractionResult(
  result: AIResult<ListingExtraction>,
  input: ListingExtractionInput,
) {
  return {
    ...result,
    data: normalizeExtractionPriceFromSource(result.data, input.text),
  };
}
