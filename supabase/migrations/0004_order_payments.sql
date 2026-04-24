-- Track Stripe payment lifecycle for Dalbo orders.

begin;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'payment_status'
  ) then
    create type public.payment_status as enum ('pending', 'paid', 'failed', 'cancelled');
  end if;
end
$$;

alter table public.orders
  add column if not exists payment_status public.payment_status not null default 'pending';

alter table public.orders
  add column if not exists stripe_checkout_session_id text;

alter table public.orders
  add column if not exists stripe_payment_intent_id text;

alter table public.orders
  add column if not exists paid_at timestamptz;

create index if not exists orders_payment_status_idx on public.orders (payment_status);
create index if not exists orders_stripe_checkout_session_id_idx on public.orders (stripe_checkout_session_id);
create index if not exists orders_stripe_payment_intent_id_idx on public.orders (stripe_payment_intent_id);

update public.orders
set
  payment_status = 'paid',
  paid_at = coalesce(paid_at, placed_at)
where payment_status = 'pending'
  and stripe_checkout_session_id is null
  and stripe_payment_intent_id is null;

commit;
