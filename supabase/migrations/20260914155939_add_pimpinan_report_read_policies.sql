create or replace function public.is_pimpinan()
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
      and role::text = 'pimpinan'
  );
$$;

revoke execute on function public.is_pimpinan() from anon;
grant execute on function public.is_pimpinan() to authenticated;

drop policy if exists "Pimpinan read orders" on public.orders;
create policy "Pimpinan read orders"
on public.orders
for select
to authenticated
using (public.is_pimpinan());

drop policy if exists "Pimpinan read order items" on public.order_items;
create policy "Pimpinan read order items"
on public.order_items
for select
to authenticated
using (public.is_pimpinan());
