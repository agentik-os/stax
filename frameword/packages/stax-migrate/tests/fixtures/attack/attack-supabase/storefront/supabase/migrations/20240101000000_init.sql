-- initial schema
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price_cents integer not null
);

create table public.profiles (
  id uuid primary key references auth.users (id),
  full_name text,
  avatar_url text
);

create table public.beta_signups (
  id bigint generated always as identity primary key,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Enable insert on signup for new users"
  on public.profiles
  for insert
  with check (auth.uid() = id);
