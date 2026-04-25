export const FOOD_MEDIA_BUCKET = "food-place-media";

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
