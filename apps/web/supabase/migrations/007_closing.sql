-- Phase 7: Closing checklist, calculator, and AI closing guide

-- Closing checklist items
create table closing_checklist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  listing_id uuid references listings(id) not null,
  step_key text not null,
  step_label text not null,
  completed boolean not null default false,
  completed_at timestamptz,
  step_order integer not null,
  created_at timestamptz default now(),
  unique (user_id, listing_id, step_key)
);

alter table closing_checklist enable row level security;

create policy "Users can view own checklist"
  on closing_checklist for select using (auth.uid() = user_id);
create policy "Users can insert own checklist"
  on closing_checklist for insert with check (auth.uid() = user_id);
create policy "Users can update own checklist"
  on closing_checklist for update using (auth.uid() = user_id);
create policy "Users can delete own checklist"
  on closing_checklist for delete using (auth.uid() = user_id);

-- Closing calculator
create table closing_calculator (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  listing_id uuid references listings(id) not null,
  sale_price numeric,
  attorney_fees numeric default 1500,
  title_fees numeric default 1000,
  transfer_tax_pct numeric default 1.0,
  recording_fees numeric default 250,
  seller_concessions numeric default 0,
  custom_costs jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, listing_id)
);

alter table closing_calculator enable row level security;

create policy "Users can view own calculator"
  on closing_calculator for select using (auth.uid() = user_id);
create policy "Users can insert own calculator"
  on closing_calculator for insert with check (auth.uid() = user_id);
create policy "Users can update own calculator"
  on closing_calculator for update using (auth.uid() = user_id);
create policy "Users can delete own calculator"
  on closing_calculator for delete using (auth.uid() = user_id);

-- Updated_at trigger for closing_calculator
create or replace function update_closing_calculator_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger closing_calculator_updated_at
  before update on closing_calculator
  for each row execute function update_closing_calculator_updated_at();

-- Closing guides (AI-generated, cached)
create table closing_guides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  listing_id uuid references listings(id) not null,
  state text,
  guide_content jsonb,
  created_at timestamptz default now(),
  unique (user_id, listing_id)
);

alter table closing_guides enable row level security;

create policy "Users can view own guides"
  on closing_guides for select using (auth.uid() = user_id);
create policy "Users can insert own guides"
  on closing_guides for insert with check (auth.uid() = user_id);
create policy "Users can update own guides"
  on closing_guides for update using (auth.uid() = user_id);
create policy "Users can delete own guides"
  on closing_guides for delete using (auth.uid() = user_id);
