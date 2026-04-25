export const FOOD_MEDIA_BUCKET = "food-place-media";
export const DRIVER_MEDIA_BUCKET = "driver-media";
export const CUSTOMER_MEDIA_BUCKET = "customer-media";

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in the web app environment.");
  }

  return url.replace(/\/$/, "");
}

function encodeStoragePath(path: string) {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function getFoodMediaPublicUrl(path: string | null | undefined) {
  if (!path) {
    return null;
  }

  return `${getSupabaseUrl()}/storage/v1/object/public/${FOOD_MEDIA_BUCKET}/${encodeStoragePath(path)}`;
}

export function getDriverMediaPublicUrl(path: string | null | undefined) {
  if (!path) {
    return null;
  }

  return `${getSupabaseUrl()}/storage/v1/object/public/${DRIVER_MEDIA_BUCKET}/${encodeStoragePath(path)}`;
}

export function getCustomerMediaPublicUrl(path: string | null | undefined) {
  if (!path) {
    return null;
  }

  return `${getSupabaseUrl()}/storage/v1/object/public/${CUSTOMER_MEDIA_BUCKET}/${encodeStoragePath(path)}`;
}
