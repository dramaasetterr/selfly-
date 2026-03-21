/** Pipeline stages for the seller journey */
export const PIPELINE_STAGES = [
  "prep_your_home",
  "price_it",
  "create_listing",
  "manage_showings",
  "review_offers",
  "close_the_deal",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  prep_your_home: "Prep Your Home",
  price_it: "Price It",
  create_listing: "Create Your Listing",
  manage_showings: "Manage Showings",
  review_offers: "Review Offers",
  close_the_deal: "Close the Deal",
};

/** User profile */
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
  current_stage: PipelineStage;
  created_at: string;
  updated_at: string;
}

/** Property listing */
export interface PropertyListing {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  price: number;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  lot_size?: number;
  year_built?: number;
  property_type: PropertyType;
  status: ListingStatus;
  images: string[];
  created_at: string;
  updated_at: string;
}

export const PROPERTY_TYPES = [
  "single_family",
  "condo",
  "townhouse",
  "multi_family",
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  single_family: "Single Family",
  condo: "Condo",
  townhouse: "Townhouse",
  multi_family: "Multi-Family",
};

export type ListingStatus = "draft" | "active" | "pending" | "sold";

export interface ListingInput {
  address: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  year_built: number;
  property_type: PropertyType;
  hoa: boolean;
  hoa_fee?: number;
  title: string;
  description: string;
  photos: string[];
  price?: number;
}

export interface Listing {
  id: string;
  user_id: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  year_built: number;
  property_type: PropertyType;
  hoa: boolean;
  hoa_fee?: number;
  title: string;
  description: string;
  photos: string[];
  price: number;
  status: ListingStatus;
  created_at: string;
  updated_at: string;
}

/** Document types */
export const DOCUMENT_TYPES = [
  "sellers_disclosure",
  "purchase_agreement",
  "counter_offer",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  sellers_disclosure: "Seller's Disclosure Form",
  purchase_agreement: "Purchase Agreement Template",
  counter_offer: "Counter-Offer Template",
};

export const DOCUMENT_TYPE_DESCRIPTIONS: Record<DocumentType, string> = {
  sellers_disclosure:
    "Disclose known property conditions as required by state law",
  purchase_agreement:
    "Standard purchase agreement customized for your property",
  counter_offer: "Respond to buyer offers with your terms",
};

export const SUPPORTED_STATES = [
  { value: "NY", label: "New York" },
  { value: "NJ", label: "New Jersey" },
  { value: "CT", label: "Connecticut" },
  { value: "FL", label: "Florida" },
  { value: "TX", label: "Texas" },
  { value: "CA", label: "California" },
] as const;

export type SupportedState = (typeof SUPPORTED_STATES)[number]["value"];

export interface Document {
  id: string;
  user_id: string;
  listing_id: string | null;
  document_type: DocumentType;
  state: string;
  title: string;
  content: string;
  html_content: string;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

/** Pricing types */
export type PropertyCondition = "Excellent" | "Good" | "Fair" | "Needs Work";
export type PriceType = "sell_fast" | "recommended" | "maximize";

export interface PricingInput {
  address: string;
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  year_built: number;
  condition: PropertyCondition;
}

export interface PricingResult {
  recommended_price: number;
  sell_fast_price: number;
  maximize_price: number;
  reasoning: string[];
}
