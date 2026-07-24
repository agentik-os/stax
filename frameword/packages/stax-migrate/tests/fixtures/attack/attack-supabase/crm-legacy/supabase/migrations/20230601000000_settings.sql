create table public.site_settings (
  id integer primary key,
  company_name text not null,
  timezone text not null default 'UTC',
  updated_at timestamptz not null default now()
);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  amount_cents bigint not null,
  stage text not null default 'lead'
);
