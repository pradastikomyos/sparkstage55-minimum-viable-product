revoke execute on function public.is_pimpinan() from public;
revoke execute on function public.is_pimpinan() from anon;
grant execute on function public.is_pimpinan() to authenticated;
