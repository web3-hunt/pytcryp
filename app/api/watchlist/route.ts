import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export async function GET() {
  const sb = getSupabaseAdmin()
  const { data, error } = await sb.from("watchlist").select("*").order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data || [] })
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    kind?: "wallet" | "mint" | "creator"
    target?: string
    label?: string
    note?: string
  } | null
  if (!body?.kind || !body?.target) {
    return NextResponse.json({ error: "kind + target required" }, { status: 400 })
  }
  const sb = getSupabaseAdmin()
  const { data, error } = await sb
    .from("watchlist")
    .upsert(
      { kind: body.kind, target: body.target, label: body.label || null, note: body.note || null },
      { onConflict: "kind,target" },
    )
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function DELETE(req: Request) {
  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  const sb = getSupabaseAdmin()
  const { error } = await sb.from("watchlist").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
