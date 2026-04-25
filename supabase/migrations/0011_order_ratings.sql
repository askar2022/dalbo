alter table public.drivers
  add column if not exists rating_average numeric(3, 2) not null default 0,
  add column if not exists rating_count integer not null default 0;

alter table public.restaurants
  add column if not exists rating_average numeric(3, 2) not null default 0,
  add column if not exists rating_count integer not null default 0;

create table if not exists public.order_ratings (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  rater_user_id uuid not null references public.profiles(id) on delete cascade,
  rater_role text not null check (rater_role in ('customer', 'food_place')),
  target_type text not null check (target_type in ('driver', 'restaurant')),
  target_id uuid not null,
  stars integer not null check (stars between 1 and 5),
  review text,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists order_ratings_unique_per_target
on public.order_ratings (order_id, rater_user_id, target_type, target_id);

create or replace function public.refresh_target_rating_summary(target_kind text, target_uuid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  summary_average numeric(3, 2);
  summary_count integer;
begin
  select
    coalesce(avg(stars)::numeric(3, 2), 0),
    count(*)::integer
  into summary_average, summary_count
  from public.order_ratings
  where target_type = target_kind
    and target_id = target_uuid;

  if target_kind = 'driver' then
    update public.drivers
    set
      rating_average = summary_average,
      rating_count = summary_count
    where user_id = target_uuid;
  elsif target_kind = 'restaurant' then
    update public.restaurants
    set
      rating_average = summary_average,
      rating_count = summary_count
    where id = target_uuid;
  end if;
end;
$$;

create or replace function public.sync_order_rating_summary()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_target_rating_summary(old.target_type, old.target_id);
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_target_rating_summary(new.target_type, new.target_id);
    return new;
  end if;

  return old;
end;
$$;

drop trigger if exists order_ratings_sync_summary on public.order_ratings;

create trigger order_ratings_sync_summary
after insert or update or delete on public.order_ratings
for each row
execute function public.sync_order_rating_summary();

alter table public.order_ratings enable row level security;

drop policy if exists "order_ratings_select_authenticated" on public.order_ratings;
create policy "order_ratings_select_authenticated"
on public.order_ratings
for select
to authenticated
using (true);

drop policy if exists "order_ratings_insert_valid" on public.order_ratings;
create policy "order_ratings_insert_valid"
on public.order_ratings
for insert
to authenticated
with check (
  rater_user_id = auth.uid()
  and exists (
    select 1
    from public.orders o
    join public.profiles p
      on p.id = auth.uid()
    where o.id = public.order_ratings.order_id
      and p.role = public.order_ratings.rater_role
      and o.status = 'delivered'
      and (
        (
          public.order_ratings.rater_role = 'customer'
          and o.customer_id = auth.uid()
          and (
            (
              public.order_ratings.target_type = 'driver'
              and o.driver_id is not null
              and public.order_ratings.target_id = o.driver_id
            )
            or (
              public.order_ratings.target_type = 'restaurant'
              and public.order_ratings.target_id = o.restaurant_id
            )
          )
        )
        or (
          public.order_ratings.rater_role = 'food_place'
          and public.order_ratings.target_type = 'driver'
          and o.driver_id is not null
          and public.order_ratings.target_id = o.driver_id
          and exists (
            select 1
            from public.restaurants r
            where r.id = o.restaurant_id
              and r.owner_id = auth.uid()
          )
        )
      )
  )
);

drop policy if exists "order_ratings_update_own" on public.order_ratings;
create policy "order_ratings_update_own"
on public.order_ratings
for update
to authenticated
using (rater_user_id = auth.uid())
with check (
  rater_user_id = auth.uid()
  and exists (
    select 1
    from public.orders o
    join public.profiles p
      on p.id = auth.uid()
    where o.id = public.order_ratings.order_id
      and p.role = public.order_ratings.rater_role
      and o.status = 'delivered'
      and (
        (
          public.order_ratings.rater_role = 'customer'
          and o.customer_id = auth.uid()
          and (
            (
              public.order_ratings.target_type = 'driver'
              and o.driver_id is not null
              and public.order_ratings.target_id = o.driver_id
            )
            or (
              public.order_ratings.target_type = 'restaurant'
              and public.order_ratings.target_id = o.restaurant_id
            )
          )
        )
        or (
          public.order_ratings.rater_role = 'food_place'
          and public.order_ratings.target_type = 'driver'
          and o.driver_id is not null
          and public.order_ratings.target_id = o.driver_id
          and exists (
            select 1
            from public.restaurants r
            where r.id = o.restaurant_id
              and r.owner_id = auth.uid()
          )
        )
      )
  )
);
