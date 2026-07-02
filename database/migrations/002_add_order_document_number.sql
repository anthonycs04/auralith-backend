alter table public.orders
  add column if not exists document_number text;
