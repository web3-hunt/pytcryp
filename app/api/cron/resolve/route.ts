import { NextResponse } from "next/server"
import { verifyCron } from "@/lib/cron-auth"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import type { Prediction } from "@/lib/types"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// Resolves predictions whose horizon has elapsed by comparing recorded price
// at prediction time (features.price_usd surrogate via pct snapshots) with latest price.
export async function GET(req: Request) {
  const deny = verifyCron(req)
  if (deny) return deny

  const sb = getSupabaseAdmin()
  const nowMs = Date.now()

  const { data } = await sb
    .from("predictions")
    .select("*")
    .is("resolved_at", null)
    .order("created_at", { ascending: true })
    .limit(200)
  const preds = (data || []) as Prediction[]

  let resolved = 0
  for (const p of preds) {
    const due = new Date(p.created_at).getTime() + p.horizon_minutes * 60 * 1000
    if (due > nowMs) continue

    // We need a baseline price at prediction time. Since we don't store it in features,
    // approximate actual_pct using the current pct_change_1h delta relative to when created.
    // This is a pragmatic signal rather than perfect oracle.
    const { data: launch } = await sb.from("launches").select("pct_change_1h").eq("mint", p.mint).maybeSingle()
    const actualPct = (launch?.pct_change_1h as number | null) ?? 0
    const correct =
      (p.predicted_pct > 0 && actualPct > 0) ||
      (p.predicted_pct < 0 && actualPct < 0) ||
      (Math.abs(p.predicted_pct) < 3 && Math.abs(actualPct) < 3)

    await sb
      .from("predictions")
      .update({
        resolved_at: new Date().toISOString(),
        actual_pct: actualPct,
        correct,
      })
      .eq("id", p.id)
    resolved++
  }

  return NextResponse.json({ ok: true, resolved })
}
