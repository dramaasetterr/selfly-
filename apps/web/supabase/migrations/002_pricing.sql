-- Create pricing_results table
create table public.pricing_results (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  address text not null,
  sqft integer not null,
  bedrooms integer not null,
  bathrooms integer not null,
  year_built integer not null,
  condition text not null
    check (condition in ('Excellent', 'Good', 'Fair', 'Needs Work')),
  recommended_price numeric not null,
  sell_fast_price numeric not null,
  maximize_price numeric not null,
  reasoning jsonb not null default '[]'::jsonb,
  selected_price_type text
    check (selected_price_type in ('sell_fast', 'recommended', 'maximize')),
  selected_price numeric,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable Row Level Security
alter table public.pricing_results enable row level security;

-- Users can read their own pricing results
create policy "Users can read own pricing results"
  on public.pricing_results for select
  using (auth.uid() = user_id);

-- Users can insert their own pricing results
create policy "Users can insert own pricing results"
  on public.pricing_results for insert
  with check (auth.uid() = user_id);

-- Users can update their own pricing results
create policy "Users can update own pricing results"
  on public.pricing_results for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-update updated_at on row change
create trigger pricing_results_updated_at
  before update on public.pricing_results
  for each row execute function public.update_updated_at();
