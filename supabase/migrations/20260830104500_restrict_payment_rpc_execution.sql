-- Payment state changes are only invoked by Edge Functions using service_role.
-- Direct PostgREST access would bypass their authentication and ownership checks.
revoke all on function public.activate_paid_order(text, jsonb) from public, anon, authenticated;
revoke all on function public.create_pending_doku_order(uuid, text, text, text, text, jsonb, integer, timestamptz) from public, anon, authenticated;
revoke all on function public.finalize_inventory_for_order(uuid) from public, anon, authenticated;
revoke all on function public.process_doku_payment_event(text, text, public.payment_status, jsonb, jsonb, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.release_expired_inventory_reservations() from public, anon, authenticated;
revoke all on function public.release_inventory_reservations_for_order(uuid) from public, anon, authenticated;

grant execute on function public.activate_paid_order(text, jsonb) to service_role;
grant execute on function public.create_pending_doku_order(uuid, text, text, text, text, jsonb, integer, timestamptz) to service_role;
grant execute on function public.finalize_inventory_for_order(uuid) to service_role;
grant execute on function public.process_doku_payment_event(text, text, public.payment_status, jsonb, jsonb, text, text, text, integer) to service_role;
grant execute on function public.release_expired_inventory_reservations() to service_role;
grant execute on function public.release_inventory_reservations_for_order(uuid) to service_role;
