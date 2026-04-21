import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500)
  const sort = url.searchParams.get("sort") ?? "created_at"
  const minScore = Number(url.searchParams.get("minScore") ?? 0)
  const source = url.searchParams.get("source")

  const supabase = await createServerClient()
  let q = supabase.from("launches").select("*").limit(limit)
  if (source) q = q.eq("source", source)
  if (minScore > 0) q = q.gte("dna_score", minScore)

  if (sort === "dna_score") q = q.order("dna_score", { ascending: false, nullsFirst: false })
  else if (sort === "pct_1h") q = q.order("pct_change_1h", { ascending: false, nullsFirst: false })
  else if (sort === "volume_1h") q = q.order("volume_1h_usd", { ascending: false, nullsFirst: false })
  else q = q.order("created_at", { ascending: false })

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ launches: data ?? [] })
}
