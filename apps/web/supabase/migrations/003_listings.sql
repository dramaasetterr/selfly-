-- Create listings table
create table public.listings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  address text not null,
  bedrooms integer,
  bathrooms numeric,
  sqft integer,
  year_built integer,
  property_type text check (property_type in ('single_family', 'condo', 'townhouse', 'multi_family')),
  hoa boolean default false,
  hoa_fee numeric,
  title text,
  description text,
  photos jsonb default '[]'::jsonb,
  price numeric,
  status text default 'draft' check (status in ('draft', 'active', 'pending', 'sold')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable Row Level Security
alter table public.listings enable row level security;

-- Users can read their own listings
create policy "Users can read own listings"
  on public.listings for select
  using (auth.uid() = user_id);

-- Users can insert their own listings
create policy "Users can insert own listings"
  on public.listings for insert
  with check (auth.uid() = user_id);

-- Users can update their own listings
create policy "Users can update own listings"
  on public.listings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can delete their own listings
create policy "Users can delete own listings"
  on public.listings for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at on row change
create trigger listings_updated_at
  before update on public.listings
  for each row execute function public.update_updated_at();

-- Storage bucket: listing-photos
-- Create via Supabase dashboard or CLI:
--   insert into storage.buckets (id, name, public) values ('listing-photos', 'listing-photos', true);
--
-- RLS policies for listing-photos bucket:
--   - Authenticated users can upload to their own folder (user_id/*):
--     create policy "Users can upload own listing photos"
--       on storage.objects for insert
--       with check (bucket_id = 'listing-photos' and auth.uid()::text = (storage.foldername(name))[1]);
--
--   - Authenticated users can read any listing photo (public bucket):
--     create policy "Anyone can read listing photos"
--       on storage.objects for select
--       using (bucket_id = 'listing-photos');
--
--   - Authenticated users can delete their own photos:
--     create policy "Users can delete own listing photos"
--       on storage.objects for delete
--       using (bucket_id = 'listing-photos' and auth.uid()::text = (storage.foldername(name))[1]);
