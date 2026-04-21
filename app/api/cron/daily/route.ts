import { NextResponse } from "next/server"
import { verifyCron } from "@/lib/cron-auth"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { generateText } from "ai"
import { sendTelegram } from "@/lib/telegram"

export const dynamic = "force-dynamic"
export const maxDuration = 60

function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10)
}

export async function GET(req: Request) {
  const deny = verifyCron(req)
  if (deny) return deny

  const sb = getSupabaseAdmin()
  const today = dayKey()
  const startIso = new Date(today + "T00:00:00.000Z").toISOString()

  const [launchesRes, candidatesRes, predsRes] = await Promise.all([
    sb.from("launches").select("*").gte("first_seen_at", startIso),
    sb.from("alpha_candidates").select("*").gte("detected_at", startIso),
    sb.from("predictions").select("correct").gte("created_at", startIso).not("resolved_at", "is", null),
  ])
  const launches = launchesRes.data || []
  const candidates = candidatesRes.data || []
  const preds = predsRes.data || []

  const sorted = [...launches].sort(
    (a, b) => ((b.pct_change_1h as number) || 0) - ((a.pct_change_1h as number) || 0),
  )
  const top_gainers = sorted.slice(0, 5).map((l) => ({
    mint: l.mint,
    symbol: l.symbol,
    pct: l.pct_change_1h,
    dna: l.dna_score,
  }))
  const top_losers = sorted
    .slice(-5)
    .reverse()
    .map((l) => ({ mint: l.mint, symbol: l.symbol, pct: l.pct_change_1h, dna: l.dna_score }))

  const strong = candidates.filter((c) => (c.score as number) >= 75).length
  const accuracy = preds.length ? preds.filter((p) => p.correct).length / preds.length : null

  const { data: walletRows } = await sb
    .from("wallets")
    .select("address,label,alpha_score,hit_rate,total_launches_hit")
    .order("alpha_score", { ascending: false, nullsFirst: false })
    .limit(5)

  let narration = ""
  try {
    const prompt = [
      "You are an analyst writing a plain-English daily summary for a Solana launch-scanner.",
      "Be concise (4-6 sentences), concrete, and avoid hype.",
      `Date: ${today}`,
      `Launches indexed today: ${launches.length}`,
      `Alpha candidates: ${candidates.length} (${strong} strong).`,
      accuracy != null ? `Prediction accuracy: ${(accuracy * 100).toFixed(1)}%.` : "Prediction accuracy: n/a.",
      `Top gainers: ${top_gainers.map((t) => `${t.symbol || t.mint.slice(0, 6)} (${(t.pct as number)?.toFixed?.(1) ?? "—"}%)`).join(", ")}.`,
      `Wallet leaders: ${(walletRows || []).map((w) => w.label || (w.address as string).slice(0, 6)).join(", ") || "none tracked yet"}.`,
      "Summarize what the day felt like and what deserves attention tomorrow.",
    ].join("\n")
    const { text } = await generateText({
      model: "openai/gpt-5-mini",
      prompt,
    })
    narration = text
  } catch (e) {
    narration = `Today saw ${launches.length} launches and ${candidates.length} alpha candidates (${strong} strong). ${
      accuracy != null ? `Prediction accuracy: ${(accuracy * 100).toFixed(1)}%.` : ""
    } (AI narration unavailable: ${e instanceof Error ? e.message : String(e)})`
  }

  await sb.from("daily_reports").upsert({
    report_date: today,
    total_launches: launches.length,
    alpha_candidates: candidates.length,
    strong_alphas: strong,
    top_gainers,
    top_losers,
    wallet_leaders: walletRows || [],
    prediction_accuracy: accuracy,
    narration,
    stats: { avg_dna: avg(launches.map((l) => l.dna_score as number)) },
  })

  // Send to telegram
  await sendTelegram(
    [
      `<b>Daily Alpha Report — ${today}</b>`,
      `Launches: <b>${launches.length}</b> · Candidates: <b>${candidates.length}</b> · Strong: <b>${strong}</b>`,
      accuracy != null ? `Accuracy: <b>${(accuracy * 100).toFixed(1)}%</b>` : "",
      "",
      narration,
    ]
      .filter(Boolean)
      .join("\n"),
  )

  return NextResponse.json({ ok: true, date: today, launches: launches.length })
}

function avg(xs: Array<number | null | undefined>): number | null {
  const clean = xs.filter((x): x is number => typeof x === "number" && Number.isFinite(x))
  if (!clean.length) return null
  return Math.round((clean.reduce((s, x) => s + x, 0) / clean.length) * 10) / 10
}
