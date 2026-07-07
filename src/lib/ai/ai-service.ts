import type { ListingExtractionInput } from "./ai-provider";
import { getAIProvider, listConfiguredProviderNames } from "./ai-router";

export class AIListingService {
  async extractListing(input: ListingExtractionInput) {
    const provider = getAIProvider();
    try {
      return await provider.extractListing(input);
    } catch (error) {
      if (process.env.NODE_ENV === "production") {
        const fallbackNames = listConfiguredProviderNames().filter(
          (name) => name !== provider.name && name !== "mock",
        );
        for (const fallbackName of fallbackNames) {
          try {
            return await getAIProvider(fallbackName).extractListing(input);
          } catch {
            // Keep trying configured real providers; surface the original failure if all fail.
          }
        }
        throw error;
      }
      const fallback = getAIProvider("mock");
      if (provider.name !== fallback.name) return fallback.extractListing(input);
      throw error;
    }
  }
}

export const aiListingService = new AIListingService();
