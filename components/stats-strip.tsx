"use client"

import useSWR from "swr"
import { getSupabaseBrowser } from "@/lib/supabase/client"
import { useEffect } from "react"

async function fetchStats() {
  const sb = getSupabaseBrowser()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const [launches, candidates, strong, preds] = await Promise.all([
    sb.from("launches").select("mint", { count: "exact", head: true }).gte("first_seen_at", since),
    sb.from("alpha_candidates").select("id", { count: "exact", head: true }).gte("detected_at", since),
    sb.from("alpha_candidates").select("id", { count: "exact", head: true }).gte("score", 75).gte("detected_at", since),
    sb.from("predictions").select("correct").gte("created_at", since).not("resolved_at", "is", null).limit(1000),
  ])
  const predData = (preds.data || []) as Array<{ correct: boolean | null }>
  const accuracy =
    predData.length > 0 ? predData.filter((p) => p.correct).length / predData.length : null
  return {
    launches: launches.count || 0,
    candidates: candidates.count || 0,
    strong: strong.count || 0,
    accuracy,
  }
}

export function StatsStrip() {
  const { data, mutate } = useSWR("stats-strip", fetchStats, { refreshInterval: 30_000 })

  useEffect(() => {
    const sb = getSupabaseBrowser()
    const ch = sb
      .channel("rt:stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "launches" }, () => mutate())
      .on("postgres_changes", { event: "*", schema: "public", table: "alpha_candidates" }, () => mutate())
      .subscribe()
    return () => {
      sb.removeChannel(ch)
    }
  }, [mutate])

  const items = [
    { label: "Launches (24h)", value: data?.launches ?? "—" },
    { label: "Alpha Candidates", value: data?.candidates ?? "—" },
    { label: "Strong Alphas", value: data?.strong ?? "—" },
    {
      label: "Prediction Acc.",
      value:
        data?.accuracy == null
          ? "—"
          : `${(data.accuracy * 100).toFixed(1)}%`,
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 md:px-6 py-4 border-b border-border">
      {items.map((it) => (
        <div key={it.label} className="rounded-lg border border-border bg-card p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            {it.label}
          </div>
          <div className="text-xl font-semibold font-mono mt-1">{it.value}</div>
        </div>
      ))}
    </div>
  )
}
