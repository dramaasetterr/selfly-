-- Documents table for generated legal documents
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  listing_id uuid references listings on delete set null,
  document_type text not null check (document_type in ('sellers_disclosure', 'purchase_agreement', 'counter_offer')),
  state text not null,
  title text,
  content text,
  html_content text,
  pdf_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS policies
alter table documents enable row level security;

create policy "Users can view own documents"
  on documents for select
  using (auth.uid() = user_id);

create policy "Users can insert own documents"
  on documents for insert
  with check (auth.uid() = user_id);

create policy "Users can update own documents"
  on documents for update
  using (auth.uid() = user_id);

create policy "Users can delete own documents"
  on documents for delete
  using (auth.uid() = user_id);

-- Updated_at trigger
create or replace function update_documents_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger documents_updated_at
  before update on documents
  for each row
  execute function update_documents_updated_at();

-- Note: Create a Supabase Storage bucket named 'documents' via the dashboard
-- with public access disabled. Files stored under: {user_id}/{document_id}.pdf
