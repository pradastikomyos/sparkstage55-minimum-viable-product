-- Sprint B: Banner management and product categories

-- Banners table: admin-managed promotional banners per page slot
create table public.banners (
  id uuid primary key default gen_random_uuid(),
  page text not null check (page in ('home', 'women', 'men', 'login')),
  label text not null,
  image_url text not null,
  link_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.banners enable row level security;

create policy "Admins manage banners"
  on public.banners for all
  using (is_admin())
  with check (is_admin());

create policy "Public read active banners"
  on public.banners for select
  using (is_active = true);

-- Product categories table: replaces hardcoded CLOTHING/SHOES/BAGS/ACCESSORIES
create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.product_categories enable row level security;

create policy "Admins manage product categories"
  on public.product_categories for all
  using (is_admin())
  with check (is_admin());

create policy "Public read active categories"
  on public.product_categories for select
  using (is_active = true);

-- Seed default categories
insert into public.product_categories (name, slug, sort_order) values
  ('CLOTHING', 'clothing', 1),
  ('SHOES', 'shoes', 2),
  ('BAGS', 'bags', 3),
  ('ACCESSORIES', 'accessories', 4);

-- Seed sample banners for homepage
insert into public.banners (page, label, image_url, link_url, is_active, sort_order) values
  ('home', 'Spring Summer Women', '/assets/reference/prada/home/mosaic/spring-summer-women-landscape.avif', '/women', true, 1),
  ('home', 'Spring Summer Men', '/assets/reference/prada/home/mosaic/spring-summer-men-landscape.avif', '/men', true, 2);
