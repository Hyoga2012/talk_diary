/** Normalize project URL: strip /rest/v1, /storage/v1, trailing slashes */
export function normalizeSupabaseUrl(raw?: string | null): string | null {
  if (!raw) return null;
  let url = raw.trim().replace(/\/+$/, "");
  url = url.replace(/\/rest\/v1$/i, "");
  url = url.replace(/\/storage\/v1$/i, "");
  url = url.replace(/\/auth\/v1$/i, "");
  url = url.replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(url)) return null;
  return url;
}
