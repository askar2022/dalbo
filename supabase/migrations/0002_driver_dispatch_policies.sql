-- Driver dispatch access for marketplace-style delivery claiming.
-- Paste this into the Supabase SQL editor if the driver dashboard
-- cannot load available jobs or claim deliveries.

create policy "orders_select_driver_marketplace"
on public.orders
for select
to authenticated
using (
  driver_id = auth.uid()
  or (
    driver_id is null
    and status = 'ready'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'driver'
    )
  )
);

create policy "orders_update_driver_marketplace"
on public.orders
for update
to authenticated
using (
  driver_id = auth.uid()
  or (
    driver_id is null
    and status = 'ready'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'driver'
    )
  )
)
with check (
  driver_id = auth.uid()
);

create policy "order_items_select_driver_marketplace"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = public.order_items.order_id
      and (
        o.driver_id = auth.uid()
        or (
          o.driver_id is null
          and o.status = 'ready'
          and exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and p.role = 'driver'
          )
        )
      )
  )
);

create policy "customer_addresses_select_assigned_driver"
on public.customer_addresses
for select
to authenticated
using (
  customer_id = auth.uid()
  or exists (
    select 1
    from public.orders o
    where o.delivery_address_id = public.customer_addresses.id
      and o.driver_id = auth.uid()
  )
);

create policy "driver_assignments_select_own"
on public.driver_assignments
for select
to authenticated
using (
  driver_id = auth.uid()
);

create policy "driver_assignments_insert_own"
on public.driver_assignments
for insert
to authenticated
with check (
  driver_id = auth.uid()
  and exists (
    select 1
    from public.orders o
    where o.id = public.driver_assignments.order_id
      and o.driver_id = auth.uid()
  )
);

create policy "driver_assignments_update_own"
on public.driver_assignments
for update
to authenticated
using (
  driver_id = auth.uid()
)
with check (
  driver_id = auth.uid()
);
