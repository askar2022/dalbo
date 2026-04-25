alter table public.drivers
  add column if not exists profile_photo_path text,
  add column if not exists vehicle_make text,
  add column if not exists vehicle_model text,
  add column if not exists vehicle_color text,
  add column if not exists license_plate text,
  add column if not exists insurance_provider text,
  add column if not exists insurance_policy_number text,
  add column if not exists insurance_expires_on date;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'driver-media',
  'driver-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
