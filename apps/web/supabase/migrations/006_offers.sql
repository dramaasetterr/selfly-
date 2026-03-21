-- Offers table for storing analyzed buyer offers
create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  listing_id uuid references listings not null,
  offered_price numeric not null,
  financing_type text not null check (financing_type in ('cash', 'conventional', 'fha', 'va')),
  down_payment_pct numeric,
  inspection_contingency boolean default true,
  appraisal_contingency boolean default true,
  closing_date date,
  seller_concessions text,
  notes text,
  score integer,
  score_label text,
  summary text,
  red_flags jsonb default '[]'::jsonb,
  counter_suggested_price numeric,
  counter_suggested_changes jsonb default '[]'::jsonb,
  counter_reasoning text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table offers enable row level security;

create policy "Users can view own offers"
  on offers for select
  using (auth.uid() = user_id);

create policy "Users can insert own offers"
  on offers for insert
  with check (auth.uid() = user_id);

create policy "Users can update own offers"
  on offers for update
  using (auth.uid() = user_id);

create policy "Users can delete own offers"
  on offers for delete
  using (auth.uid() = user_id);

-- Updated_at trigger for offers
create or replace function update_offers_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger offers_updated_at
  before update on offers
  for each row
  execute function update_offers_updated_at();
