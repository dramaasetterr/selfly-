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

export type PropertyType =
  | "single_family"
  | "condo"
  | "townhouse"
  | "multi_family"
  | "land"
  | "other";

export type ListingStatus =
  | "draft"
  | "active"
  | "pending"
  | "sold"
  | "withdrawn";

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
