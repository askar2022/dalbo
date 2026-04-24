-- Add platform pricing fields for Dalbo's commission model.
-- Restaurant commission: 10%
-- Customer service fee: flat 1.99

begin;

alter table public.orders
  add column if not exists service_fee numeric(10,2) not null default 0 check (service_fee >= 0);

alter table public.orders
  add column if not exists commission_amount numeric(10,2) not null default 0 check (commission_amount >= 0);

alter table public.orders
  drop column if exists total;

alter table public.orders
  add column total numeric(10,2)
  generated always as (subtotal + delivery_fee + service_fee) stored;

update public.orders
set commission_amount = round(subtotal * 0.10, 2)
where commission_amount is distinct from round(subtotal * 0.10, 2);

commit;
