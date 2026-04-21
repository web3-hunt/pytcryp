import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// Runs scan + refresh + predict in sequence. Useful for manual kickstart from the UI.
export async function POST(req: Request) {
  const origin = new URL(req.url).origin
  const secret = process.env.CRON_SECRET
  const headers: Record<string, string> = {}
  if (secret) headers.authorization = `Bearer ${secret}`

  const results: Record<string, unknown> = {}
  for (const step of ["scan", "refresh", "predict"]) {
    try {
      const r = await fetch(`${origin}/api/cron/${step}`, { headers, cache: "no-store" })
      results[step] = await r.json().catch(() => ({ status: r.status }))
    } catch (e) {
      results[step] = { error: e instanceof Error ? e.message : String(e) }
    }
  }
  return NextResponse.json({ ok: true, results })
}
