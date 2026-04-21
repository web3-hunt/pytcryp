"use client"

import useSWR from "swr"
import { useEffect } from "react"
import { getSupabaseBrowser } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MintPill, formatPct } from "@/components/launch-row"
import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useState } from "react"

type PredRow = {
  id: string
  mint: string
  horizon_minutes: number
  predicted_pct: number
  predicted_class: string | null
  confidence: number | null
  created_at: string
  actual_pct: number | null
  resolved_at: string | null
  correct: boolean | null
  launches?: { symbol: string | null; name: string | null }
}

async function fetchPredictions(horizon: number) {
  const sb = getSupabaseBrowser()
  const { data, error } = await sb
    .from("predictions")
    .select("*, launches(symbol,name)")
    .eq("horizon_minutes", horizon)
    .order("created_at", { ascending: false })
    .limit(40)
  if (error) throw error
  return (data || []) as PredRow[]
}

async function fetchAccuracy() {
  const sb = getSupabaseBrowser()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data } = await sb
    .from("predictions")
    .select("horizon_minutes,correct")
    .gte("created_at", since)
    .not("resolved_at", "is", null)
    .limit(2000)
  const groups: Record<number, { total: number; hit: number }> = {}
  for (const p of data || []) {
    const h = p.horizon_minutes as number
    groups[h] = groups[h] || { total: 0, hit: 0 }
    groups[h].total++
    if (p.correct) groups[h].hit++
  }
  return groups
}

function predClassColor(c: string | null) {
  switch (c) {
    case "moon":
      return "bg-primary/15 text-primary border-primary/30"
    case "bullish":
      return "bg-teal-500/15 text-teal-400 border-teal-500/30"
    case "flat":
      return "bg-zinc-500/15 text-zinc-400 border-zinc-500/30"
    case "bearish":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30"
    case "rug":
      return "bg-destructive/15 text-destructive-foreground border-destructive/30"
    default:
      return "bg-muted text-muted-foreground border-border"
  }
}

export function PredictionsView() {
  const [horizon, setHorizon] = useState("60")
  const { data, mutate } = useSWR(["preds", horizon], () => fetchPredictions(Number(horizon)), {
    refreshInterval: 15_000,
  })
  const { data: acc } = useSWR("pred-accuracy", fetchAccuracy, { refreshInterval: 30_000 })

  useEffect(() => {
    const sb = getSupabaseBrowser()
    const ch = sb
      .channel("rt:predictions")
      .on("postgres_changes", { event: "*", schema: "public", table: "predictions" }, () => mutate())
      .subscribe()
    return () => {
      sb.removeChannel(ch)
    }
  }, [mutate])

  return (
    <section className="p-4 md:p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[15, 60, 240].map((h) => {
          const a = acc?.[h]
          const pct = a && a.total > 0 ? (a.hit / a.total) * 100 : null
          return (
            <Card key={h}>
              <CardHeader className="pb-2">
                <CardDescription className="font-mono text-[10px] uppercase tracking-wider">
                  {h}m horizon · 24h accuracy
                </CardDescription>
                <CardTitle className="text-2xl font-mono">
                  {pct == null ? "—" : `${pct.toFixed(1)}%`}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {a?.total ? `${a.hit} / ${a.total} resolved` : "awaiting resolutions"}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Tabs value={horizon} onValueChange={setHorizon}>
        <TabsList>
          <TabsTrigger value="15">15m</TabsTrigger>
          <TabsTrigger value="60">1h</TabsTrigger>
          <TabsTrigger value="240">4h</TabsTrigger>
        </TabsList>
        <TabsContent value={horizon}>
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] px-4 py-2 text-[10px] uppercase tracking-wider font-mono text-muted-foreground border-b border-border">
              <span>Token</span>
              <span className="text-right">Predicted</span>
              <span className="text-right">Class</span>
              <span className="text-right">Conf.</span>
              <span className="text-right">Actual</span>
              <span className="text-right">Result</span>
            </div>
            {(data || []).length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">No predictions yet.</div>
            ) : (
              (data || []).map((p) => (
                <div
                  key={p.id}
                  className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-2 px-4 py-2.5 text-sm hover:bg-secondary/30"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {p.launches?.symbol || p.launches?.name || "—"}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <MintPill mint={p.mint} />
                    </div>
                  </div>
                  <div
                    className={cn(
                      "md:text-right font-mono",
                      p.predicted_pct > 0 && "text-primary",
                      p.predicted_pct < 0 && "text-destructive",
                    )}
                  >
                    {formatPct(p.predicted_pct)}
                  </div>
                  <div className="md:text-right">
                    <Badge variant="outline" className={cn("font-mono text-[10px]", predClassColor(p.predicted_class))}>
                      {p.predicted_class || "—"}
                    </Badge>
                  </div>
                  <div className="md:text-right font-mono text-xs text-muted-foreground">
                    {p.confidence != null ? `${Math.round(p.confidence * 100)}%` : "—"}
                  </div>
                  <div
                    className={cn(
                      "md:text-right font-mono",
                      (p.actual_pct ?? 0) > 0 && "text-primary",
                      (p.actual_pct ?? 0) < 0 && "text-destructive",
                    )}
                  >
                    {p.actual_pct == null ? "…" : formatPct(p.actual_pct)}
                  </div>
                  <div className="md:text-right text-xs font-mono">
                    {p.correct == null ? (
                      <span className="text-muted-foreground">pending</span>
                    ) : p.correct ? (
                      <span className="text-primary">hit</span>
                    ) : (
                      <span className="text-destructive">miss</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </section>
  )
}
