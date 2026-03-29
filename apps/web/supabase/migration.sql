-- ============================================================================
-- Chiavo FSBO Platform — Comprehensive Database Migration
-- ============================================================================
-- This migration is idempotent: safe to run multiple times.
-- It creates all tables, RLS policies, indexes, triggers, storage buckets,
-- and the auto-profile creation function.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 0. Extensions
-- --------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------------
-- 1. Helper Functions
-- --------------------------------------------------------------------------

-- Auto-update updated_at timestamp on row modification
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-create a profile row when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------------------------------------
-- 2. Tables
-- --------------------------------------------------------------------------

-- ── profiles ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email       text NOT NULL,
  full_name   text NOT NULL DEFAULT '',
  avatar_url  text,
  phone       text,
  current_stage text NOT NULL DEFAULT 'prep_your_home'
    CHECK (current_stage IN (
      'prep_your_home','price_it','create_listing',
      'manage_showings','review_offers','close_the_deal'
    )),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── listings ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.listings (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  address       text NOT NULL,
  city          text,
  state         text,
  zip_code      text,
  bedrooms      int NOT NULL DEFAULT 0,
  bathrooms     numeric(4,1) NOT NULL DEFAULT 0,
  sqft          int NOT NULL DEFAULT 0,
  year_built    int,
  property_type text CHECK (property_type IN (
    'single_family','condo','townhouse','multi_family'
  )),
  hoa           boolean NOT NULL DEFAULT false,
  hoa_fee       numeric(10,2),
  title         text NOT NULL DEFAULT '',
  description   text NOT NULL DEFAULT '',
  photos        text[] DEFAULT '{}',
  price         numeric(14,2),
  status        text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','pending','sold')),
  lot_size      numeric(12,2),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ── pricing_results ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pricing_results (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  listing_id         uuid REFERENCES public.listings (id) ON DELETE SET NULL,
  address            text,
  sqft               int,
  bedrooms           int,
  bathrooms          numeric(4,1),
  year_built         int,
  condition          text,
  recommended_price  numeric(14,2),
  sell_fast_price    numeric(14,2),
  maximize_price     numeric(14,2),
  reasoning          text[],
  selected_price_type text,
  selected_price     numeric(14,2),
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- ── documents ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.documents (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  listing_id     uuid REFERENCES public.listings (id) ON DELETE SET NULL,
  document_type  text NOT NULL CHECK (document_type IN (
    'sellers_disclosure','purchase_agreement','counter_offer'
  )),
  state          text,
  title          text NOT NULL DEFAULT '',
  content        text NOT NULL DEFAULT '',
  html_content   text NOT NULL DEFAULT '',
  pdf_url        text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ── home_prep_checklist ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.home_prep_checklist (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  items      jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT home_prep_checklist_user_unique UNIQUE (user_id)
);

-- ── showing_availability ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.showing_availability (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings (id) ON DELETE CASCADE,
  date       date NOT NULL,
  start_time text NOT NULL,
  end_time   text NOT NULL,
  is_booked  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── showings ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.showings (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id          uuid NOT NULL REFERENCES public.listings (id) ON DELETE CASCADE,
  seller_id           uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  availability_id     uuid REFERENCES public.showing_availability (id) ON DELETE SET NULL,
  buyer_name          text NOT NULL,
  buyer_email         text NOT NULL,
  buyer_phone         text,
  showing_date        date NOT NULL,
  showing_time_start  text NOT NULL,
  showing_time_end    text NOT NULL,
  status              text NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed','cancelled','completed')),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ── offers ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.offers (
  id                       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                  uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  listing_id               uuid NOT NULL REFERENCES public.listings (id) ON DELETE CASCADE,
  offered_price            numeric(14,2) NOT NULL,
  financing_type           text NOT NULL CHECK (financing_type IN (
    'cash','conventional','fha','va'
  )),
  down_payment_pct         numeric(5,2),
  inspection_contingency   boolean NOT NULL DEFAULT true,
  appraisal_contingency    boolean NOT NULL DEFAULT true,
  closing_date             text,
  seller_concessions       text,
  notes                    text,
  score                    numeric(4,1),
  score_label              text,
  summary                  text,
  red_flags                text[],
  counter_suggested_price  numeric(14,2),
  counter_suggested_changes text[],
  counter_reasoning        text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- ── closing_checklist ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.closing_checklist (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  listing_id   uuid NOT NULL REFERENCES public.listings (id) ON DELETE CASCADE,
  step_key     text NOT NULL,
  step_label   text NOT NULL,
  completed    boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  step_order   int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── closing_calculator ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.closing_calculator (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  listing_id         uuid NOT NULL REFERENCES public.listings (id) ON DELETE CASCADE,
  sale_price         numeric(14,2) NOT NULL DEFAULT 0,
  attorney_fees      numeric(10,2) NOT NULL DEFAULT 0,
  title_fees         numeric(10,2) NOT NULL DEFAULT 0,
  transfer_tax_pct   numeric(5,2) NOT NULL DEFAULT 0,
  recording_fees     numeric(10,2) NOT NULL DEFAULT 0,
  seller_concessions numeric(10,2) NOT NULL DEFAULT 0,
  custom_costs       jsonb NOT NULL DEFAULT '[]',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ── closing_guides ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.closing_guides (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  listing_id    uuid NOT NULL REFERENCES public.listings (id) ON DELETE CASCADE,
  state         text,
  guide_content jsonb NOT NULL DEFAULT '[]',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── messages ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id   uuid NOT NULL REFERENCES public.listings (id) ON DELETE CASCADE,
  sender_id    uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  sender_name  text NOT NULL,
  sender_email text NOT NULL,
  message      text NOT NULL,
  is_read      boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── favorites ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.favorites (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT favorites_user_listing_unique UNIQUE (user_id, listing_id)
);

-- --------------------------------------------------------------------------
-- 2b. Add missing columns to existing tables (safe if they already exist)
-- --------------------------------------------------------------------------

DO $$ BEGIN ALTER TABLE public.listings ADD COLUMN city text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.listings ADD COLUMN state text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.listings ADD COLUMN zip_code text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.listings ADD COLUMN lot_size numeric(12,2); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.listings ADD COLUMN hoa boolean NOT NULL DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.listings ADD COLUMN hoa_fee numeric(10,2); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.listings ADD COLUMN features text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.profiles ADD COLUMN full_name text NOT NULL DEFAULT ''; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.profiles ADD COLUMN avatar_url text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.profiles ADD COLUMN phone text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.profiles ADD COLUMN current_stage text NOT NULL DEFAULT 'prep_your_home'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.profiles ADD COLUMN push_token text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- --------------------------------------------------------------------------
-- 3. Indexes
-- --------------------------------------------------------------------------

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email          ON public.profiles (email);

-- listings
CREATE INDEX IF NOT EXISTS idx_listings_user_id        ON public.listings (user_id);
CREATE INDEX IF NOT EXISTS idx_listings_status         ON public.listings (status);
CREATE INDEX IF NOT EXISTS idx_listings_status_created  ON public.listings (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_city_state      ON public.listings (city, state);

-- pricing_results
CREATE INDEX IF NOT EXISTS idx_pricing_results_user_id  ON public.pricing_results (user_id);
CREATE INDEX IF NOT EXISTS idx_pricing_results_created  ON public.pricing_results (user_id, created_at DESC);

-- documents
CREATE INDEX IF NOT EXISTS idx_documents_user_id        ON public.documents (user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_type_state ON public.documents (user_id, document_type, state);

-- home_prep_checklist (unique constraint already covers user_id)

-- showing_availability
CREATE INDEX IF NOT EXISTS idx_showing_avail_listing    ON public.showing_availability (listing_id);
CREATE INDEX IF NOT EXISTS idx_showing_avail_user_listing ON public.showing_availability (user_id, listing_id);
CREATE INDEX IF NOT EXISTS idx_showing_avail_date       ON public.showing_availability (listing_id, date);

-- showings
CREATE INDEX IF NOT EXISTS idx_showings_listing         ON public.showings (listing_id);
CREATE INDEX IF NOT EXISTS idx_showings_seller          ON public.showings (seller_id);
CREATE INDEX IF NOT EXISTS idx_showings_date            ON public.showings (showing_date);

-- offers
CREATE INDEX IF NOT EXISTS idx_offers_user_id           ON public.offers (user_id);
CREATE INDEX IF NOT EXISTS idx_offers_listing           ON public.offers (listing_id);
CREATE INDEX IF NOT EXISTS idx_offers_listing_score     ON public.offers (listing_id, score DESC);

-- closing_checklist
CREATE INDEX IF NOT EXISTS idx_closing_checklist_user_listing ON public.closing_checklist (user_id, listing_id);

-- closing_calculator
CREATE INDEX IF NOT EXISTS idx_closing_calc_user_listing ON public.closing_calculator (user_id, listing_id);

-- closing_guides
CREATE INDEX IF NOT EXISTS idx_closing_guides_user_listing ON public.closing_guides (user_id, listing_id);

-- messages
CREATE INDEX IF NOT EXISTS idx_messages_listing         ON public.messages (listing_id);
CREATE INDEX IF NOT EXISTS idx_messages_listing_read    ON public.messages (listing_id, is_read);

-- favorites
CREATE INDEX IF NOT EXISTS idx_favorites_user           ON public.favorites (user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_listing        ON public.favorites (listing_id);

-- --------------------------------------------------------------------------
-- 4. Triggers
-- --------------------------------------------------------------------------

-- updated_at triggers (only for tables that have an updated_at column)
DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.listings;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.documents;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.home_prep_checklist;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.home_prep_checklist
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.showings;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.showings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.offers;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.closing_calculator;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.closing_calculator
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- --------------------------------------------------------------------------
-- 5. Row Level Security (RLS)
-- --------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_results     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_prep_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showing_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closing_checklist   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closing_calculator  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closing_guides      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites           ENABLE ROW LEVEL SECURITY;

-- ── profiles ──────────────────────────────────────────────────────────────
-- Users can read their own profile
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Public can read full_name (for display in marketplace, showings, etc.)
DROP POLICY IF EXISTS "profiles_select_public_name" ON public.profiles;
CREATE POLICY "profiles_select_public_name" ON public.profiles
  FOR SELECT USING (true);

-- Users can update their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (for the handle_new_user trigger via service role,
-- but also for client-side if needed)
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ── listings ──────────────────────────────────────────────────────────────
-- Everyone can read active listings (marketplace)
DROP POLICY IF EXISTS "listings_select_active" ON public.listings;
CREATE POLICY "listings_select_active" ON public.listings
  FOR SELECT USING (status = 'active' OR auth.uid() = user_id);

-- Owners can insert their own listings
DROP POLICY IF EXISTS "listings_insert_own" ON public.listings;
CREATE POLICY "listings_insert_own" ON public.listings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Owners can update their own listings
DROP POLICY IF EXISTS "listings_update_own" ON public.listings;
CREATE POLICY "listings_update_own" ON public.listings
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Owners can delete their own listings
DROP POLICY IF EXISTS "listings_delete_own" ON public.listings;
CREATE POLICY "listings_delete_own" ON public.listings
  FOR DELETE USING (auth.uid() = user_id);

-- ── pricing_results ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "pricing_results_select_own" ON public.pricing_results;
CREATE POLICY "pricing_results_select_own" ON public.pricing_results
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "pricing_results_insert_own" ON public.pricing_results;
CREATE POLICY "pricing_results_insert_own" ON public.pricing_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "pricing_results_update_own" ON public.pricing_results;
CREATE POLICY "pricing_results_update_own" ON public.pricing_results
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "pricing_results_delete_own" ON public.pricing_results;
CREATE POLICY "pricing_results_delete_own" ON public.pricing_results
  FOR DELETE USING (auth.uid() = user_id);

-- ── documents ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "documents_select_own" ON public.documents;
CREATE POLICY "documents_select_own" ON public.documents
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "documents_insert_own" ON public.documents;
CREATE POLICY "documents_insert_own" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "documents_update_own" ON public.documents;
CREATE POLICY "documents_update_own" ON public.documents
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "documents_delete_own" ON public.documents;
CREATE POLICY "documents_delete_own" ON public.documents
  FOR DELETE USING (auth.uid() = user_id);

-- ── home_prep_checklist ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "home_prep_select_own" ON public.home_prep_checklist;
CREATE POLICY "home_prep_select_own" ON public.home_prep_checklist
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "home_prep_insert_own" ON public.home_prep_checklist;
CREATE POLICY "home_prep_insert_own" ON public.home_prep_checklist
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "home_prep_update_own" ON public.home_prep_checklist;
CREATE POLICY "home_prep_update_own" ON public.home_prep_checklist
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "home_prep_delete_own" ON public.home_prep_checklist;
CREATE POLICY "home_prep_delete_own" ON public.home_prep_checklist
  FOR DELETE USING (auth.uid() = user_id);

-- ── showing_availability ──────────────────────────────────────────────────
-- Public can read availability (for the booking page)
DROP POLICY IF EXISTS "showing_avail_select_public" ON public.showing_availability;
CREATE POLICY "showing_avail_select_public" ON public.showing_availability
  FOR SELECT USING (true);

-- Owners can insert their own availability
DROP POLICY IF EXISTS "showing_avail_insert_own" ON public.showing_availability;
CREATE POLICY "showing_avail_insert_own" ON public.showing_availability
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Owners can update their own availability
DROP POLICY IF EXISTS "showing_avail_update_own" ON public.showing_availability;
CREATE POLICY "showing_avail_update_own" ON public.showing_availability
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Owners can delete their own availability
DROP POLICY IF EXISTS "showing_avail_delete_own" ON public.showing_availability;
CREATE POLICY "showing_avail_delete_own" ON public.showing_availability
  FOR DELETE USING (auth.uid() = user_id);

-- ── showings ──────────────────────────────────────────────────────────────
-- Public can insert (buyers booking via the web page, no auth required)
DROP POLICY IF EXISTS "showings_insert_public" ON public.showings;
CREATE POLICY "showings_insert_public" ON public.showings
  FOR INSERT WITH CHECK (true);

-- Sellers can read their own showings
DROP POLICY IF EXISTS "showings_select_seller" ON public.showings;
CREATE POLICY "showings_select_seller" ON public.showings
  FOR SELECT USING (auth.uid() = seller_id);

-- Sellers can update their own showings (e.g. cancel, complete)
DROP POLICY IF EXISTS "showings_update_seller" ON public.showings;
CREATE POLICY "showings_update_seller" ON public.showings
  FOR UPDATE USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- Sellers can delete their own showings
DROP POLICY IF EXISTS "showings_delete_seller" ON public.showings;
CREATE POLICY "showings_delete_seller" ON public.showings
  FOR DELETE USING (auth.uid() = seller_id);

-- ── offers ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "offers_select_own" ON public.offers;
CREATE POLICY "offers_select_own" ON public.offers
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "offers_insert_own" ON public.offers;
CREATE POLICY "offers_insert_own" ON public.offers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "offers_update_own" ON public.offers;
CREATE POLICY "offers_update_own" ON public.offers
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "offers_delete_own" ON public.offers;
CREATE POLICY "offers_delete_own" ON public.offers
  FOR DELETE USING (auth.uid() = user_id);

-- ── closing_checklist ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "closing_checklist_select_own" ON public.closing_checklist;
CREATE POLICY "closing_checklist_select_own" ON public.closing_checklist
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "closing_checklist_insert_own" ON public.closing_checklist;
CREATE POLICY "closing_checklist_insert_own" ON public.closing_checklist
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "closing_checklist_update_own" ON public.closing_checklist;
CREATE POLICY "closing_checklist_update_own" ON public.closing_checklist
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "closing_checklist_delete_own" ON public.closing_checklist;
CREATE POLICY "closing_checklist_delete_own" ON public.closing_checklist
  FOR DELETE USING (auth.uid() = user_id);

-- ── closing_calculator ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "closing_calc_select_own" ON public.closing_calculator;
CREATE POLICY "closing_calc_select_own" ON public.closing_calculator
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "closing_calc_insert_own" ON public.closing_calculator;
CREATE POLICY "closing_calc_insert_own" ON public.closing_calculator
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "closing_calc_update_own" ON public.closing_calculator;
CREATE POLICY "closing_calc_update_own" ON public.closing_calculator
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "closing_calc_delete_own" ON public.closing_calculator;
CREATE POLICY "closing_calc_delete_own" ON public.closing_calculator
  FOR DELETE USING (auth.uid() = user_id);

-- ── closing_guides ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "closing_guides_select_own" ON public.closing_guides;
CREATE POLICY "closing_guides_select_own" ON public.closing_guides
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "closing_guides_insert_own" ON public.closing_guides;
CREATE POLICY "closing_guides_insert_own" ON public.closing_guides
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "closing_guides_update_own" ON public.closing_guides;
CREATE POLICY "closing_guides_update_own" ON public.closing_guides
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "closing_guides_delete_own" ON public.closing_guides;
CREATE POLICY "closing_guides_delete_own" ON public.closing_guides
  FOR DELETE USING (auth.uid() = user_id);

-- ── messages ──────────────────────────────────────────────────────────────
-- Anyone can insert a message (buyers contacting sellers)
DROP POLICY IF EXISTS "messages_insert_public" ON public.messages;
CREATE POLICY "messages_insert_public" ON public.messages
  FOR INSERT WITH CHECK (true);

-- Listing owner can read all messages for their listings
DROP POLICY IF EXISTS "messages_select_listing_owner" ON public.messages;
CREATE POLICY "messages_select_listing_owner" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_id AND l.user_id = auth.uid()
    )
  );

-- Listing owner can update messages (e.g. mark as read)
DROP POLICY IF EXISTS "messages_update_listing_owner" ON public.messages;
CREATE POLICY "messages_update_listing_owner" ON public.messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_id AND l.user_id = auth.uid()
    )
  );

-- ── favorites ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "favorites_select_own" ON public.favorites;
CREATE POLICY "favorites_select_own" ON public.favorites
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "favorites_insert_own" ON public.favorites;
CREATE POLICY "favorites_insert_own" ON public.favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "favorites_delete_own" ON public.favorites;
CREATE POLICY "favorites_delete_own" ON public.favorites
  FOR DELETE USING (auth.uid() = user_id);

-- --------------------------------------------------------------------------
-- 6. Storage Buckets
-- --------------------------------------------------------------------------

-- Create buckets (idempotent: INSERT ... ON CONFLICT)
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-photos', 'listing-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- ── listing-photos policies ───────────────────────────────────────────────

-- Public can read any listing photo
DROP POLICY IF EXISTS "listing_photos_select_public" ON storage.objects;
CREATE POLICY "listing_photos_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'listing-photos');

-- Authenticated users can upload to their own folder (user_id/*)
DROP POLICY IF EXISTS "listing_photos_insert_own" ON storage.objects;
CREATE POLICY "listing_photos_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'listing-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can update their own photos
DROP POLICY IF EXISTS "listing_photos_update_own" ON storage.objects;
CREATE POLICY "listing_photos_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'listing-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can delete their own photos
DROP POLICY IF EXISTS "listing_photos_delete_own" ON storage.objects;
CREATE POLICY "listing_photos_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'listing-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── documents bucket policies ─────────────────────────────────────────────

-- Authenticated users can read their own documents
DROP POLICY IF EXISTS "documents_storage_select_own" ON storage.objects;
CREATE POLICY "documents_storage_select_own" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can upload to their own folder
DROP POLICY IF EXISTS "documents_storage_insert_own" ON storage.objects;
CREATE POLICY "documents_storage_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can update their own documents
DROP POLICY IF EXISTS "documents_storage_update_own" ON storage.objects;
CREATE POLICY "documents_storage_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can delete their own documents
DROP POLICY IF EXISTS "documents_storage_delete_own" ON storage.objects;
CREATE POLICY "documents_storage_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- --------------------------------------------------------------------------
-- Done!
-- --------------------------------------------------------------------------
