-- reporting surface used by the dashboard
create view public.product_stats as
  select id, name, price_cents
  from public.products
  where price_cents > 0;
