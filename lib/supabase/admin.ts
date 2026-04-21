import { createClient } from "@supabase/supabase-js"

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) {
    throw new Error("Supabase admin env vars missing (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)")
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
