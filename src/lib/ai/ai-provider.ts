import type { ListingExtraction } from "@/lib/listings/listing.schema";

export type AITaskType =
  | "extract_listing"
  | "listing_copy"
  | "risk_detection"
  | "missing_questions"
  | "marketing_assets"
  | "image_classification";

export interface AIResult<T> {
  provider: string;
  model: string;
  taskType: AITaskType;
  data: T;
  confidenceScore: number;
  costEstimate: number;
}

export interface ListingExtractionInput {
  workspaceId: string;
  intakeSessionId?: string;
  text: string;
  media: Array<{ id: string; url: string; type: "image" | "video" | "document" }>;
}

export interface AIProvider {
  name: string;
  extractListing(input: ListingExtractionInput): Promise<AIResult<ListingExtraction>>;
  generateListingCopy(input: ListingExtraction): Promise<AIResult<Partial<ListingExtraction>>>;
  detectRiskFlags(input: ListingExtractionInput): Promise<AIResult<string[]>>;
  generateMissingQuestions(input: ListingExtraction): Promise<AIResult<string[]>>;
  generateMarketingAssets(input: ListingExtraction): Promise<AIResult<Partial<ListingExtraction>>>;
  classifyPropertyImages(input: ListingExtractionInput): Promise<AIResult<Array<{ mediaId: string; roomType: string }>>>;
}
