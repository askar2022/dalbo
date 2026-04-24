# Supabase

Use this folder for Dalbo database work:

- SQL migrations
- row-level security policies
- seed data
- storage setup
- edge functions if needed later

## Recommended first tables

- `profiles`
- `restaurants`
- `restaurant_members`
- `drivers`
- `addresses`
- `menu_categories`
- `menu_items`
- `orders`
- `order_items`
- `driver_assignments`

## Recommended role values

- `customer`
- `driver`
- `food_place`
- `admin`

## Current manual SQL

- `migrations/0002_driver_dispatch_policies.sql` adds the extra RLS rules the driver dashboard needs for:
  - viewing ready jobs
  - claiming a delivery
  - seeing assigned delivery addresses
  - updating assignment status
