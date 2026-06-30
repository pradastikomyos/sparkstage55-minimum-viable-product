-- ============================================================
-- Migration: product_reviews
-- Tabel review produk dengan rating 1-5 dan ulasan teks.
-- UNIQUE(user_id, product_id) — 1 review per user per produk.
-- Status default 'approved' (langsung tampil tanpa moderasi).
-- ============================================================

do $$
begin
  create type public.review_status as enum ('pending', 'approved', 'rejected');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text,
  status public.review_status not null default 'approved',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_item_id),
  unique (user_id, product_id)
);

create index if not exists idx_product_reviews_product_id on public.product_reviews(product_id);
create index if not exists idx_product_reviews_user_id on public.product_reviews(user_id);
create index if not exists idx_product_reviews_status on public.product_reviews(status);

-- ── updated_at trigger ───────────────────────────────────────

drop trigger if exists set_product_reviews_updated_at on public.product_reviews;
create trigger set_product_reviews_updated_at
before update on public.product_reviews
for each row execute function public.set_updated_at();

-- ── Aggregat view ────────────────────────────────────────────

drop view if exists public.product_review_summary;
create view public.product_review_summary as
select
  product_id,
  round(avg(rating)::numeric, 1) as avg_rating,
  count(*)::integer as review_count
from public.product_reviews
where status = 'approved'
group by product_id;

-- ── RLS ──────────────────────────────────────────────────────

alter table public.product_reviews enable row level security;

-- Public: SELECT hanya review yang approved
drop policy if exists "Public can read approved reviews" on public.product_reviews;
create policy "Public can read approved reviews"
on public.product_reviews
for select
using (status = 'approved' or public.is_admin());

-- Customer: INSERT hanya untuk order_item milik sendiri yang sudah picked_up
drop policy if exists "customer_insert_own_review" on public.product_reviews;
create policy "customer_insert_own_review"
on public.product_reviews
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.id = order_item_id
      and o.user_id = auth.uid()
      and o.status = 'picked_up'
  )
);

-- Customer: UPDATE hanya review milik sendiri, dalam 30 hari
drop policy if exists "customer_update_own_review" on public.product_reviews;
create policy "customer_update_own_review"
on public.product_reviews
for update
using (
  auth.uid() = user_id
  and (now() - created_at) < interval '30 days'
)
with check (
  auth.uid() = user_id
  and (now() - created_at) < interval '30 days'
);

-- Admin: full akses
drop policy if exists "admin_manage_reviews" on public.product_reviews;
create policy "admin_manage_reviews"
on public.product_reviews
for all
using (public.is_admin())
with check (public.is_admin());

-- ── Fungsi helper: cek apakah user sudah review produk ───────

create or replace function public.has_reviewed_product(target_user_id uuid, target_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.product_reviews
    where user_id = target_user_id
      and product_id = target_product_id
  );
$$;
