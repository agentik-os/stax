-- Prisma-managed naming carried over: quoted CamelCase identifiers
create table "public"."UserProfiles" (
  "id" uuid primary key,
  "fullName" text,
  "orgId" uuid
);

alter table "public"."UserProfiles" enable row level security;

create policy "read own profile"
  on "public"."UserProfiles"
  for all
  using (auth.uid() = "id");
