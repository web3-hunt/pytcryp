import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export async function GET() {
  const sb = getSupabaseAdmin()
  const { data } = await sb.from("settings").select("value").eq("key", "global").maybeSingle()
  return NextResponse.json({ value: data?.value || {} })
}

export async function PUT(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: "body required" }, { status: 400 })
  const sb = getSupabaseAdmin()
  const { data: existing } = await sb.from("settings").select("value").eq("key", "global").maybeSingle()
  const merged = { ...(existing?.value as Record<string, unknown> | null), ...body }
  const { error } = await sb
    .from("settings")
    .upsert({ key: "global", value: merged, updated_at: new Date().toISOString() })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, value: merged })
}
