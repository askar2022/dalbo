alter table public.drivers
  add column if not exists car_photo_path text,
  add column if not exists plate_photo_path text;
