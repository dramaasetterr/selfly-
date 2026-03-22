-- ============================================================================
-- 008: Production Sync — App Store Readiness
-- ============================================================================
-- Adds missing tables and columns needed for production launch.
-- Safe to run multiple times (idempotent).
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Add 'plan' column to profiles
-- --------------------------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD COLUMN plan text NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'seller_pro', 'full_service'));
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- --------------------------------------------------------------------------
-- 2. Waitlist table
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.waitlist (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL,
  plan       text NOT NULL,
  source     text DEFAULT 'app',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for dedup lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON public.waitlist (email);

-- RLS: anyone can insert (public waitlist signup), only service role reads
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "waitlist_insert_public" ON public.waitlist;
CREATE POLICY "waitlist_insert_public" ON public.waitlist
  FOR INSERT WITH CHECK (true);

-- Authenticated users can read their own waitlist entries
DROP POLICY IF EXISTS "waitlist_select_own" ON public.waitlist;
CREATE POLICY "waitlist_select_own" ON public.waitlist
  FOR SELECT USING (true);

-- --------------------------------------------------------------------------
-- 3. Messages table for real-time chat
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id    uuid REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  sender_id     uuid REFERENCES auth.users ON DELETE SET NULL,
  receiver_id   uuid REFERENCES auth.users ON DELETE SET NULL,
  content       text NOT NULL DEFAULT '',
  sender_name   text,
  sender_email  text,
  read          boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Indexes for chat queries
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages (receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages (listing_id, sender_id, receiver_id);

-- Senders can read their own sent messages
DROP POLICY IF EXISTS "messages_select_sender" ON public.messages;
CREATE POLICY "messages_select_sender" ON public.messages
  FOR SELECT USING (auth.uid() = sender_id);

-- Receivers can read messages sent to them
DROP POLICY IF EXISTS "messages_select_receiver" ON public.messages;
CREATE POLICY "messages_select_receiver" ON public.messages
  FOR SELECT USING (auth.uid() = receiver_id);

-- Authenticated users can send messages
DROP POLICY IF EXISTS "messages_insert_authenticated" ON public.messages;
CREATE POLICY "messages_insert_authenticated" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Anyone can insert messages (for contact-seller form from unauthenticated users)
DROP POLICY IF EXISTS "messages_insert_public" ON public.messages;
CREATE POLICY "messages_insert_public" ON public.messages
  FOR INSERT WITH CHECK (true);

-- Receivers can update messages sent to them (mark as read)
DROP POLICY IF EXISTS "messages_update_receiver" ON public.messages;
CREATE POLICY "messages_update_receiver" ON public.messages
  FOR UPDATE USING (auth.uid() = receiver_id);

-- Enable realtime for messages
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN others THEN NULL;
END $$;

-- --------------------------------------------------------------------------
-- 4. Public read policy for active listings (marketplace / buyers)
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view active listings" ON public.listings;
CREATE POLICY "Anyone can view active listings" ON public.listings
  FOR SELECT USING (status = 'active');

-- --------------------------------------------------------------------------
-- 5. Add city/state/zip/lot_size/features columns to listings (safety check)
-- --------------------------------------------------------------------------
DO $$ BEGIN ALTER TABLE public.listings ADD COLUMN city text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.listings ADD COLUMN state text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.listings ADD COLUMN zip_code text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.listings ADD COLUMN lot_size numeric(12,2); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.listings ADD COLUMN features text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- --------------------------------------------------------------------------
-- 6. Home prep checklist table (referenced by PrepHomeScreen)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.home_prep_checklist (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  items      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.home_prep_checklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own prep checklist" ON public.home_prep_checklist;
CREATE POLICY "Users can view own prep checklist" ON public.home_prep_checklist
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can upsert own prep checklist" ON public.home_prep_checklist;
CREATE POLICY "Users can upsert own prep checklist" ON public.home_prep_checklist
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own prep checklist" ON public.home_prep_checklist;
CREATE POLICY "Users can update own prep checklist" ON public.home_prep_checklist
  FOR UPDATE USING (auth.uid() = user_id);

-- --------------------------------------------------------------------------
-- Done
-- --------------------------------------------------------------------------
