# Dalbo

Dalbo is a food delivery platform with three core experiences:

- Customer
- Driver
- Food Place

## Monorepo layout

- `apps/web` - Next.js website, restaurant dashboard, future admin
- `apps/customer-mobile` - Expo app for customers
- `apps/driver-mobile` - Expo app for drivers
- `packages/ui` - shared UI primitives and theme tokens
- `packages/types` - shared TypeScript types
- `packages/utils` - shared utility helpers
- `supabase` - database migrations and backend notes

## Environment variables

### Web

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### Expo apps

Create `apps/customer-mobile/.env` and `apps/driver-mobile/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Do not expose `SUPABASE_SERVICE_ROLE_KEY` in mobile apps.
