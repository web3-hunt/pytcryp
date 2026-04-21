"use client"

import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function Num({ v }: { v: number | null | undefined }) {
  if (v === null || v === undefined) return <span className="text-muted-foreground">—</span>
  return <span className="tabular-nums">{typeof v === "number" ? v.toLocaleString() : v}</span>
}

export function DailyReport() {
  const { data, isLoading } = useSWR<{ reports: any[] }>("/api/reports", fetcher, { refreshInterval: 30_000 })

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Spinner /> Loading reports...
      </div>
    )
  }

  const reports = data?.reports ?? []

  if (reports.length === 0) {
    return (
      <Empty>
        <EmptyTitle>No reports yet</EmptyTitle>
        <EmptyDescription>
          Reports are generated once per day by the cron job. Click &quot;Generate now&quot; above to build today&apos;s
          report immediately.
        </EmptyDescription>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {reports.map((r) => (
        <Card key={r.report_date} className="bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-4">
              <span className="font-mono text-lg">{r.report_date}</span>
              <span className="text-xs text-muted-foreground font-normal">
                generated {new Date(r.generated_at).toLocaleString()}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat label="Total launches" value={r.total_launches} />
              <Stat label="Alpha candidates" value={r.alpha_candidates} />
              <Stat label="Strong alphas" value={r.strong_alphas} />
              <Stat
                label="Prediction accuracy"
                value={r.prediction_accuracy != null ? `${(r.prediction_accuracy * 100).toFixed(1)}%` : "—"}
              />
            </div>

            {r.narration && (
              <div className="rounded-md border border-border/60 bg-background/40 p-4 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                {r.narration}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ListBlock title="Top gainers" items={r.top_gainers} kind="launch" />
              <ListBlock title="Wallet leaders" items={r.wallet_leaders} kind="wallet" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xl font-mono mt-1">
        <Num v={value} />
      </div>
    </div>
  )
}

function ListBlock({ title, items, kind }: { title: string; items: any; kind: "launch" | "wallet" }) {
  const list = Array.isArray(items) ? items : []
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">{title}</div>
      {list.length === 0 ? (
        <div className="text-sm text-muted-foreground">No data</div>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.slice(0, 8).map((it: any, i: number) => (
            <li key={i} className="flex items-center justify-between gap-2 text-sm font-mono">
              <span className="truncate">{kind === "launch" ? (it.symbol ?? it.mint) : (it.label ?? it.address)}</span>
              <span className="tabular-nums text-muted-foreground">
                {kind === "launch"
                  ? it.pct_change_1h != null
                    ? `${Number(it.pct_change_1h).toFixed(1)}%`
                    : "—"
                  : it.alpha_score != null
                    ? Number(it.alpha_score).toFixed(1)
                    : "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
