create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  total numeric not null
);
alter table invoices enable row level security;
create policy "own invoices" on invoices for select using (auth.uid() = owner);

CREATE TABLE public."audit_log" (
  id bigint generated always as identity,
  action text
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- the payments table arrives in a later block, policy declared MULTILINE
create table payments (
  id uuid primary key,
  amount numeric
);
alter table payments enable row level security;
create policy "own payments"
  on payments
  for select using (true);
