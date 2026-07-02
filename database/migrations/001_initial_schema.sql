create extension if not exists pgcrypto;

create table if not exists public.schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null,
  role text not null default 'editor' check (role in ('admin', 'editor')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id text primary key,
  slug text not null unique,
  name text not null,
  short_name text not null,
  description text not null default '',
  hero_copy text not null default '',
  image_url text,
  accent_color text not null default '#C9A86A',
  featured boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  seo jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.intentions (
  id text primary key,
  slug text not null unique,
  name text not null,
  affirmation text not null default '',
  description text not null default '',
  ritual_prompt text not null default '',
  icon text not null default 'sparkles',
  color text not null default '#8FA58C',
  benefits text[] not null default '{}',
  active boolean not null default true,
  sort_order integer not null default 0,
  seo jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.category_intentions (
  category_id text not null references public.categories(id) on delete cascade,
  intention_id text not null references public.intentions(id) on delete cascade,
  primary key (category_id, intention_id)
);

create table if not exists public.products (
  id text primary key,
  category_id text not null references public.categories(id),
  sku text not null unique,
  slug text not null unique,
  name text not null,
  subtitle text not null default '',
  short_description text not null default '',
  description text not null default '',
  price numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= 0),
  currency text not null default 'PEN' check (currency = 'PEN'),
  stock integer not null default 0 check (stock >= 0),
  status text not null default 'available'
    check (status in ('available', 'low-stock', 'sold-out', 'preorder', 'draft', 'hidden')),
  featured boolean not null default false,
  bestseller boolean not null default false,
  is_new boolean not null default false,
  tags text[] not null default '{}',
  materials text[] not null default '{}',
  ingredients text[] not null default '{}',
  care_instructions text[] not null default '{}',
  chakras text[] not null default '{}',
  energetic_properties text[] not null default '{}',
  zodiac_signs text[] not null default '{}',
  dimensions jsonb not null default '{}'::jsonb,
  origin jsonb not null default '{}'::jsonb,
  ritual jsonb not null default '{}'::jsonb,
  sustainability jsonb not null default '{}'::jsonb,
  seo jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete cascade,
  storage_path text,
  public_url text not null,
  alt_text text not null default '',
  width integer,
  height integer,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists product_images_one_primary
  on public.product_images(product_id) where is_primary;

create table if not exists public.product_intentions (
  product_id text not null references public.products(id) on delete cascade,
  intention_id text not null references public.intentions(id) on delete cascade,
  primary key (product_id, intention_id)
);

create sequence if not exists public.web_order_seq start with 1001;
create sequence if not exists public.tiktok_order_seq start with 2001;
create sequence if not exists public.store_order_seq start with 301;

create or replace function public.next_order_code(order_source text)
returns text
language plpgsql
as $$
begin
  if order_source = 'web' then
    return 'AUR-' || lpad(nextval('public.web_order_seq')::text, 4, '0');
  elsif order_source = 'tiktok' then
    return 'TT-' || lpad(nextval('public.tiktok_order_seq')::text, 4, '0');
  elsif order_source = 'store' then
    return 'POS-' || lpad(nextval('public.store_order_seq')::text, 4, '0');
  end if;

  raise exception 'Origen de pedido invalido: %', order_source;
end;
$$;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  source text not null check (source in ('web', 'tiktok', 'store')),
  status text not null default 'new'
    check (status in ('new', 'contacted', 'confirmed', 'preparing', 'delivered', 'cancelled')),
  customer_name text not null,
  document_number text,
  whatsapp text not null default '',
  email text,
  city text not null default '',
  address text,
  shipping_method text not null
    check (shipping_method in ('Flores', 'Shalom', 'Olva Courier', 'Marvisur', 'Recojo en tienda')),
  note text,
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  currency text not null default 'PEN' check (currency = 'PEN'),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null references public.products(id),
  product_name text not null,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id),
  order_id uuid references public.orders(id) on delete set null,
  movement_type text not null
    check (movement_type in ('sale', 'restock', 'adjustment', 'return', 'order_edit', 'cancellation')),
  quantity_delta integer not null check (quantity_delta <> 0),
  stock_before integer not null check (stock_before >= 0),
  stock_after integer not null check (stock_after >= 0),
  reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.site_content (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type text not null check (type in ('queja', 'reclamo')),
  name text not null,
  document text not null,
  email text not null,
  phone text not null,
  address text,
  order_code text,
  detail text not null,
  request text not null,
  status text not null default 'received'
    check (status in ('received', 'in_review', 'resolved', 'closed')),
  response text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_status_idx on public.products(status);
create index if not exists products_featured_idx on public.products(featured) where featured;
create index if not exists product_intentions_intention_idx on public.product_intentions(intention_id);
create index if not exists orders_source_created_idx on public.orders(source, created_at desc);
create index if not exists orders_status_created_idx on public.orders(status, created_at desc);
create index if not exists inventory_product_created_idx on public.inventory_movements(product_id, created_at desc);
create index if not exists complaints_status_created_idx on public.complaints(status, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'categories', 'intentions', 'products', 'orders', 'faqs', 'complaints'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', table_name);
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name
    );
  end loop;
end;
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.intentions enable row level security;
alter table public.category_intentions enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_intentions enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.site_content enable row level security;
alter table public.faqs enable row level security;
alter table public.complaints enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "Public reads active categories" on public.categories;
create policy "Public reads active categories" on public.categories
  for select using (active);

drop policy if exists "Public reads active intentions" on public.intentions;
create policy "Public reads active intentions" on public.intentions
  for select using (active);

drop policy if exists "Public reads category intentions" on public.category_intentions;
create policy "Public reads category intentions" on public.category_intentions
  for select using (true);

drop policy if exists "Public reads visible products" on public.products;
create policy "Public reads visible products" on public.products
  for select using (status in ('available', 'low-stock', 'sold-out', 'preorder'));

drop policy if exists "Public reads product images" on public.product_images;
create policy "Public reads product images" on public.product_images
  for select using (true);

drop policy if exists "Public reads product intentions" on public.product_intentions;
create policy "Public reads product intentions" on public.product_intentions
  for select using (true);

drop policy if exists "Public reads site content" on public.site_content;
create policy "Public reads site content" on public.site_content
  for select using (true);

drop policy if exists "Public reads active faqs" on public.faqs;
create policy "Public reads active faqs" on public.faqs
  for select using (active);

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "Public reads product image objects" on storage.objects;
create policy "Public reads product image objects" on storage.objects
  for select using (bucket_id = 'product-images');
