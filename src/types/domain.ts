export type UserRole =
  | "super_admin"
  | "platform_admin"
  | "broker_owner"
  | "broker_manager"
  | "listing_executive"
  | "photographer"
  | "sales_executive"
  | "viewer";

export type ListingStatus =
  | "intake"
  | "draft"
  | "needs_review"
  | "ready_to_publish"
  | "published"
  | "unpublished"
  | "expired"
  | "rented"
  | "sold"
  | "archived"
  | "rejected";

export type LeadStatus =
  | "new"
  | "contacted"
  | "visit_scheduled"
  | "visited"
  | "negotiation"
  | "closed"
  | "lost"
  | "spam";

export type TimestampString = string;

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  city: string;
  ownerId: string;
  logoURL: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  websiteTheme: "premium" | "minimal" | "editorial";
  customDomain: string | null;
  planId: "starter" | "pro" | "agency";
  status: "active" | "suspended";
  createdAt: TimestampString;
  updatedAt: TimestampString;
}

export interface Listing {
  id: string;
  workspaceId: string;
  title: string;
  slug: string;
  status: ListingStatus;
  transactionType: "sale" | "rent";
  propertyType: string;
  location: string;
  city: string;
  locality: string;
  societyName: string;
  googleMapsUrl: string;
  price: number;
  deposit: number | null;
  brokerage: string;
  taxes: string;
  bhk: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  carpetArea: number | null;
  builtUpArea: number | null;
  plotArea: number | null;
  openArea: number | null;
  furnishedStatus: string | null;
  parkingCount: number | null;
  floor: string | null;
  totalFloors: number | null;
  availability: string | null;
  preferredTenant: string | null;
  descriptionShort: string;
  descriptionLong: string;
  highlights: string[];
  amenities: string[];
  missingFields: string[];
  riskFlags: string[];
  confirmationQuestions: string[];
  qualityScore: number;
  confidenceScore: number;
  views: number;
  leads: number;
  whatsappClicks: number;
  callClicks: number;
  assignedTo: string | null;
  createdBy: string;
  publishedAt: TimestampString | null;
  expiresAt: TimestampString | null;
  lastConfirmedAt: TimestampString | null;
  freshnessStatus: string;
  seoTitle: string;
  seoDescription: string;
  whatsappShareText: string;
  instagramCaption: string;
  ownerProfileId?: string | null;
  ownerPhone?: string | null;
  ownerClaimStatus?: "unclaimed" | "claim_sent" | "claimed";
  ownerClaimedAt?: TimestampString | null;
  createdAt: TimestampString;
  updatedAt: TimestampString;
}

export interface OwnerProfile {
  id: string;
  workspaceId: string;
  phone: string;
  displayPhone: string;
  name: string;
  occupation: string;
  email: string;
  status: "unverified" | "verified";
  source: "whatsapp";
  createdFromListingId: string;
  claimedListingIds: string[];
  verifiedAt: TimestampString | null;
  consent?: {
    brokerVerification: boolean;
    whatsappTransactional: boolean;
    termsAccepted: boolean;
    version: string;
    acceptedAt: TimestampString;
  };
  createdAt: TimestampString;
  updatedAt: TimestampString;
}

export interface OwnerClaimToken {
  id: string;
  workspaceId: string;
  listingId: string;
  ownerProfileId: string;
  phone: string;
  status: "pending" | "claimed" | "expired";
  expiresAt: TimestampString;
  claimedAt: TimestampString | null;
  createdAt: TimestampString;
  updatedAt: TimestampString;
}

export interface MediaAsset {
  id: string;
  workspaceId: string;
  listingId: string;
  intakeSessionId: string | null;
  url: string;
  thumbnailUrl: string;
  storagePath: string;
  type: "image" | "video" | "document";
  order: number;
  roomType: string;
  qualityScore: number;
  isHero: boolean;
  caption: string;
  uploadedBy: string;
  source: "whatsapp" | "dashboard";
  createdAt: TimestampString;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  message: string;
  preferredVisitDate?: string;
  budget?: number;
  contactConsent: boolean;
  marketingConsent?: boolean;
  consentVersion: string;
  consentedAt: TimestampString;
  source: string;
  listingId: string;
  workspaceId: string;
  assignedTo: string | null;
  status: LeadStatus;
  notes: string[];
  followUpAt: TimestampString | null;
  createdAt: TimestampString;
  updatedAt: TimestampString;
}

export interface IntakeSession {
  id: string;
  workspaceId: string;
  brokerPhone: string;
  status: "collecting" | "processing" | "draft_ready" | "cancelled" | "failed";
  listingId: string | null;
  rawText: string;
  mediaIds: string[];
  createdAt: TimestampString;
  updatedAt: TimestampString;
}

export interface AnalyticsEvent {
  id: string;
  workspaceId: string;
  listingId?: string;
  type:
    | "listing_view"
    | "broker_profile_view"
    | "whatsapp_click"
    | "call_click"
    | "enquiry_submit"
    | "share_click"
    | "listing_publish"
    | "listing_unpublish"
    | "listing_expired"
    | "ai_generation"
    | "whatsapp_intake_started"
    | "whatsapp_intake_completed";
  createdAt: TimestampString;
}

export interface AuditLog {
  id: string;
  workspaceId: string;
  actorId: string;
  action: string;
  targetId?: string;
  createdAt: TimestampString;
}
