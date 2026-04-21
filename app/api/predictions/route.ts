import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500)
  const horizon = url.searchParams.get("horizon")

  const supabase = await createServerClient()
  let q = supabase
    .from("predictions")
    .select("*, launches(symbol, name, mint, source)")
    .order("created_at", { ascending: false })
    .limit(limit)
  if (horizon) q = q.eq("horizon_minutes", Number(horizon))

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ predictions: data ?? [] })
}
