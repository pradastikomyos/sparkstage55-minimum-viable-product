alter type public.app_role add value if not exists 'owner';

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role::text = 'owner'
  );
$$;

drop policy if exists "Owners read products" on public.products;
create policy "Owners read products"
on public.products
for select
using (public.is_owner());

drop policy if exists "Owners read variants" on public.product_variants;
create policy "Owners read variants"
on public.product_variants
for select
using (public.is_owner());

drop policy if exists "Owners read product images" on public.product_images;
create policy "Owners read product images"
on public.product_images
for select
using (public.is_owner());

drop policy if exists "Owners read orders" on public.orders;
create policy "Owners read orders"
on public.orders
for select
using (public.is_owner());

drop policy if exists "Owners read order items" on public.order_items;
create policy "Owners read order items"
on public.order_items
for select
using (public.is_owner());

drop policy if exists "Owners read payment attempts" on public.payment_attempts;
create policy "Owners read payment attempts"
on public.payment_attempts
for select
using (public.is_owner());

drop policy if exists "Owners read payment events" on public.payment_events;
create policy "Owners read payment events"
on public.payment_events
for select
using (public.is_owner());

drop policy if exists "Owners read pickup codes" on public.pickup_codes;
create policy "Owners read pickup codes"
on public.pickup_codes
for select
using (public.is_owner());

drop policy if exists "Owners read inventory reservations" on public.inventory_reservations;
create policy "Owners read inventory reservations"
on public.inventory_reservations
for select
using (public.is_owner());

drop policy if exists "Owners read banners" on public.banners;
create policy "Owners read banners"
on public.banners
for select
using (public.is_owner());

drop policy if exists "Owners read product categories" on public.product_categories;
create policy "Owners read product categories"
on public.product_categories
for select
using (public.is_owner());

drop policy if exists "Owners read site assets" on public.site_assets;
create policy "Owners read site assets"
on public.site_assets
for select
using (public.is_owner());
