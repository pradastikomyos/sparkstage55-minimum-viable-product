-- Make BOPIS pickup verification failure modes explicit for demo reliability.

create or replace function public.verify_pickup_code(input_code text)
returns table(order_id uuid, invoice_number text, status public.order_status, verified_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  found_order_id uuid;
  found_invoice_number text;
  found_order_status public.order_status;
  found_payment_status public.payment_status;
  found_verified_at timestamptz;
  normalized_code text := upper(trim(input_code));
begin
  if not public.is_admin() then
    raise exception 'Admin role required';
  end if;

  if normalized_code = '' then
    raise exception 'Pickup code is required';
  end if;

  select pc.order_id, o.invoice_number, o.status, o.payment_status, pc.verified_at
  into found_order_id, found_invoice_number, found_order_status, found_payment_status, found_verified_at
  from public.pickup_codes pc
  join public.orders o on o.id = pc.order_id
  where pc.code = normalized_code
  for update;

  if found_order_id is null then
    raise exception 'Pickup code was not found';
  end if;

  if found_verified_at is not null or found_order_status = 'picked_up' then
    raise exception 'Order % has already been picked up', found_invoice_number;
  end if;

  if found_payment_status <> 'paid' then
    raise exception 'Order % is not paid yet', found_invoice_number;
  end if;

  if found_order_status <> 'pending_pickup' then
    raise exception 'Order % is not ready for pickup (status: %)', found_invoice_number, found_order_status;
  end if;

  update public.pickup_codes
  set verified_at = now(), verified_by = auth.uid()
  where pickup_codes.order_id = found_order_id;

  update public.orders
  set status = 'picked_up', picked_up_at = now(), updated_at = now()
  where id = found_order_id;

  return query
    select o.id, o.invoice_number, o.status, pc.code
    from public.orders o
    join public.pickup_codes pc on pc.order_id = o.id
    where o.id = found_order_id;
end;
$$;
