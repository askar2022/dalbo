drop policy if exists "profiles_select_assigned_driver" on public.profiles;

create policy "profiles_select_assigned_driver"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.customer_id = public.profiles.id
      and o.driver_id = auth.uid()
  )
);
