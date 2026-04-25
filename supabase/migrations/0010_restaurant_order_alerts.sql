alter table public.restaurants
  add column if not exists order_notification_preference text not null default 'dashboard';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'restaurants_order_notification_preference_check'
  ) then
    alter table public.restaurants
      add constraint restaurants_order_notification_preference_check
      check (
        order_notification_preference in ('dashboard', 'email', 'sms', 'email_and_sms')
      );
  end if;
end $$;

alter table public.orders
  add column if not exists restaurant_notified_at timestamptz;
