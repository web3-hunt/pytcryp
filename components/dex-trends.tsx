"use client"

import { useMemo } from "react"
import { useRealtimeLaunches } from "@/lib/hooks/use-realtime-launches"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, ResponsiveContainer, PieChart, Pie } from "recharts"
import { dnaClassLabel } from "@/lib/metrics"

const DNA_COLORS: Record<string, string> = {
  strong_alpha: "var(--color-chart-1)",
  promising: "var(--color-chart-5)",
  neutral: "var(--color-muted-foreground)",
  risky: "var(--color-chart-2)",
  rug_risk: "var(--color-chart-3)",
}

export function DexTrends() {
  const { data } = useRealtimeLaunches({ limit: 500 })

  const { byDna, volumeTop } = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const l of data || []) {
      const k = l.dna_class || "unclassified"
      counts[k] = (counts[k] || 0) + 1
    }
    const byDna = Object.entries(counts).map(([name, value]) => ({
      name: dnaClassLabel(name),
      key: name,
      value,
    }))
    const volumeTop = [...(data || [])]
      .filter((l) => (l.volume_1h_usd || 0) > 0)
      .sort((a, b) => (b.volume_1h_usd || 0) - (a.volume_1h_usd || 0))
      .slice(0, 12)
      .map((l) => ({
        symbol: l.symbol || l.mint.slice(0, 6),
        volume: Math.round(l.volume_1h_usd || 0),
        dna: l.dna_class || "neutral",
      }))
    return { byDna, volumeTop }
  }, [data])

  const chartConfig: ChartConfig = {
    volume: { label: "1h Volume", color: "var(--color-chart-1)" },
  }

  return (
    <section className="p-4 md:p-6 grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>DNA Distribution</CardTitle>
          <CardDescription>How the tracked pool is classified right now.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-72 w-full">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byDna} dataKey="value" nameKey="name" outerRadius={90} innerRadius={55} paddingAngle={2}>
                  {byDna.map((d) => (
                    <Cell key={d.key} fill={DNA_COLORS[d.key] || "var(--color-muted-foreground)"} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
          <div className="flex flex-wrap gap-3 mt-3 text-xs font-mono text-muted-foreground">
            {byDna.map((d) => (
              <div key={d.key} className="flex items-center gap-1.5">
                <span
                  className="size-2 rounded-sm"
                  style={{ backgroundColor: DNA_COLORS[d.key] || "var(--color-muted-foreground)" }}
                />
                {d.name} · {d.value}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top 1h Volume</CardTitle>
          <CardDescription>Most-traded tracked launches.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-72 w-full">
            <BarChart data={volumeTop} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="symbol"
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
                stroke="var(--color-border)"
              />
              <YAxis
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
                stroke="var(--color-border)"
                tickFormatter={(v: number) =>
                  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}k` : `${v}`
                }
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
                {volumeTop.map((d) => (
                  <Cell key={d.symbol} fill={DNA_COLORS[d.dna] || "var(--color-chart-1)"} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </section>
  )
}
