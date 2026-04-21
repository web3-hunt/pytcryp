"use client"

import { useMemo, useState } from "react"
import { useRealtimeLaunches } from "@/lib/hooks/use-realtime-launches"
import { LaunchRow, LaunchRowHeader } from "@/components/launch-row"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Empty, EmptyTitle, EmptyDescription, EmptyHeader } from "@/components/ui/empty"
import { Flame } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { computeAlphaSignal } from "@/lib/scoring"

type Mode = "alpha" | "dna" | "gain" | "volume"

export function HallOfFame() {
  const { data, isLoading } = useRealtimeLaunches({ limit: 120 })
  const [mode, setMode] = useState<Mode>("alpha")

  const ranked = useMemo(() => {
    if (!data) return []
    const withScore = data.map((l) => ({ ...l, _alpha: computeAlphaSignal(l).score }))
    switch (mode) {
      case "dna":
        return [...withScore].sort((a, b) => (b.dna_score ?? 0) - (a.dna_score ?? 0)).slice(0, 50)
      case "gain":
        return [...withScore]
          .sort((a, b) => (b.pct_change_1h ?? -Infinity) - (a.pct_change_1h ?? -Infinity))
          .slice(0, 50)
      case "volume":
        return [...withScore].sort((a, b) => (b.volume_1h_usd ?? 0) - (a.volume_1h_usd ?? 0)).slice(0, 50)
      default:
        return [...withScore].sort((a, b) => b._alpha - a._alpha).slice(0, 50)
    }
  }, [data, mode])

  return (
    <section className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-3">
        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList>
            <TabsTrigger value="alpha">Alpha Score</TabsTrigger>
            <TabsTrigger value="dna">DNA</TabsTrigger>
            <TabsTrigger value="gain">1h Gain</TabsTrigger>
            <TabsTrigger value="volume">Volume</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <LaunchRowHeader />
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : ranked.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <Flame className="size-6 text-muted-foreground" />
              <EmptyTitle>No launches yet</EmptyTitle>
              <EmptyDescription>
                Trigger a scan from the sidebar or wait for the next cron tick.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          ranked.map((l, i) => <LaunchRow key={l.mint} launch={l} rank={i + 1} />)
        )}
      </div>
    </section>
  )
}
