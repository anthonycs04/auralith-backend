create table if not exists public.subcategories (
  id text primary key,
  category_id text not null references public.categories(id) on delete cascade,
  slug text not null,
  name text not null,
  description text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  seo jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, slug)
);

alter table public.intentions
  add column if not exists image_url text;

create table if not exists public.product_subcategories (
  product_id text not null references public.products(id) on delete cascade,
  subcategory_id text not null references public.subcategories(id) on delete cascade,
  primary key (product_id, subcategory_id)
);

create index if not exists subcategories_category_idx
  on public.subcategories(category_id, sort_order);

create index if not exists product_subcategories_subcategory_idx
  on public.product_subcategories(subcategory_id);

alter table public.subcategories enable row level security;
alter table public.product_subcategories enable row level security;

drop policy if exists "Public reads active subcategories" on public.subcategories;
create policy "Public reads active subcategories" on public.subcategories
  for select using (active);

drop policy if exists "Public reads product subcategories" on public.product_subcategories;
create policy "Public reads product subcategories" on public.product_subcategories
  for select using (true);

drop trigger if exists set_updated_at on public.subcategories;
create trigger set_updated_at
  before update on public.subcategories
  for each row execute function public.set_updated_at();
