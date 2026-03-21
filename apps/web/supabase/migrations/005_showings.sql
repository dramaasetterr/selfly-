-- Showing availability slots set by sellers
create table if not exists showing_availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  listing_id uuid references listings not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  is_booked boolean default false,
  created_at timestamptz default now()
);

alter table showing_availability enable row level security;

create policy "Users can view own availability"
  on showing_availability for select
  using (auth.uid() = user_id);

create policy "Users can insert own availability"
  on showing_availability for insert
  with check (auth.uid() = user_id);

create policy "Users can update own availability"
  on showing_availability for update
  using (auth.uid() = user_id);

create policy "Users can delete own availability"
  on showing_availability for delete
  using (auth.uid() = user_id);

create policy "Anon can view availability"
  on showing_availability for select
  using (true);

-- Booked showings
create table if not exists showings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings not null,
  seller_id uuid references auth.users not null,
  availability_id uuid references showing_availability not null,
  buyer_name text not null,
  buyer_email text not null,
  buyer_phone text,
  showing_date date not null,
  showing_time_start time not null,
  showing_time_end time not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'completed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table showings enable row level security;

create policy "Sellers can view own showings"
  on showings for select
  using (auth.uid() = seller_id);

create policy "Sellers can update own showings"
  on showings for update
  using (auth.uid() = seller_id);

create policy "Anon can insert showings"
  on showings for insert
  with check (true);

-- Updated_at trigger for showings
create or replace function update_showings_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger showings_updated_at
  before update on showings
  for each row
  execute function update_showings_updated_at();
