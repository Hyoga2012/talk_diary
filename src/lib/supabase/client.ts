import { createBrowserClient } from "@supabase/ssr";
import { normalizeSupabaseUrl } from "./url";

export function createClient() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    return null;
  }

  return createBrowserClient(url, key);
}

export function isSupabaseConfigured() {
  return Boolean(
    normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
