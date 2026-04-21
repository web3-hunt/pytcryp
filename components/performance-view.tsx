"use client"

import useSWR from "swr"
import { getSupabaseBrowser } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Line, LineChart, ResponsiveContainer } from "recharts"

async function fetchSeries() {
  const sb = getSupabaseBrowser()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const [launches, candidates, preds] = await Promise.all([
    sb.from("launches").select("first_seen_at").gte("first_seen_at", since).limit(5000),
    sb.from("alpha_candidates").select("detected_at,score").gte("detected_at", since).limit(5000),
    sb
      .from("predictions")
      .select("created_at,correct,resolved_at")
      .gte("created_at", since)
      .not("resolved_at", "is", null)
      .limit(5000),
  ])

  const buckets = 24
  const stepMs = (24 * 60 * 60 * 1000) / buckets
  const nowMs = Date.now()

  const series: Array<{
    t: string
    launches: number
    candidates: number
    strong: number
    accuracy: number | null
  }> = []

  for (let i = buckets - 1; i >= 0; i--) {
    const end = nowMs - i * stepMs
    const start = end - stepMs
    const label = new Date(end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    const lc = (launches.data || []).filter((r) => {
      const t = new Date(r.first_seen_at as string).getTime()
      return t >= start && t < end
    }).length
    const cnd = (candidates.data || []).filter((r) => {
      const t = new Date(r.detected_at as string).getTime()
      return t >= start && t < end
    })
    const strong = cnd.filter((c) => (c.score as number) >= 75).length
    const resolvedInWindow = (preds.data || []).filter((r) => {
      const t = new Date(r.resolved_at as string).getTime()
      return t >= start && t < end
    })
    const acc =
      resolvedInWindow.length > 0
        ? resolvedInWindow.filter((p) => p.correct).length / resolvedInWindow.length
        : null
    series.push({ t: label, launches: lc, candidates: cnd.length, strong, accuracy: acc })
  }
  return series
}

export function PerformanceView() {
  const { data } = useSWR("performance-series", fetchSeries, { refreshInterval: 30_000 })

  const config: ChartConfig = {
    launches: { label: "Launches", color: "var(--color-chart-1)" },
    candidates: { label: "Candidates", color: "var(--color-chart-2)" },
    strong: { label: "Strong", color: "var(--color-chart-4)" },
    accuracy: { label: "Accuracy", color: "var(--color-chart-5)" },
  }

  return (
    <section className="p-4 md:p-6 grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Launch Flow</CardTitle>
          <CardDescription>New launches per hour (last 24h).</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={config} className="h-72 w-full">
            <ResponsiveContainer>
              <AreaChart data={data || []}>
                <defs>
                  <linearGradient id="gLaunches" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="t" tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} />
                <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="launches"
                  stroke="var(--color-chart-1)"
                  fill="url(#gLaunches)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alpha Candidates</CardTitle>
          <CardDescription>All vs. strong (score ≥ 75) per hour.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={config} className="h-72 w-full">
            <ResponsiveContainer>
              <LineChart data={data || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="t" tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} />
                <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="candidates" stroke="var(--color-chart-2)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="strong" stroke="var(--color-chart-4)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Hourly Accuracy</CardTitle>
          <CardDescription>Share of resolved predictions that landed correctly.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={config} className="h-72 w-full">
            <ResponsiveContainer>
              <LineChart data={data || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="t" tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} />
                <YAxis
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
                  tickFormatter={(v: number | null) => (v == null ? "" : `${Math.round(v * 100)}%`)}
                  domain={[0, 1]}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke="var(--color-chart-5)"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </section>
  )
}
