"use client"

import Link from "next/link"
import type { Launch } from "@/lib/types"
import { cn } from "@/lib/utils"
import { dnaClassColor, dnaClassLabel } from "@/lib/metrics"
import { Badge } from "@/components/ui/badge"
import { ArrowDownRight, ArrowUpRight, Copy, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { useEffect, useState } from "react"

export function formatUsd(n: number | null | undefined, decimals = 0) {
  if (n == null || !Number.isFinite(n)) return "—"
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}k`
  return `$${n.toFixed(decimals)}`
}

export function formatPct(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—"
  const s = `${n > 0 ? "+" : ""}${n.toFixed(1)}%`
  return s
}

export function formatAge(iso: string | null | undefined) {
  if (!iso) return "—"
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h ${min % 60}m`
  const d = Math.floor(h / 24)
  return `${d}d`
}

export function MintPill({ mint, short = true }: { mint: string; short?: boolean }) {
  const display = short ? `${mint.slice(0, 4)}…${mint.slice(-4)}` : mint
  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        navigator.clipboard?.writeText(mint)
        toast.success("Mint copied")
      }}
      className="inline-flex items-center gap-1 font-mono text-[11px] bg-secondary/60 hover:bg-secondary border border-border rounded px-1.5 py-0.5"
      title={mint}
    >
      {display}
      <Copy className="size-3 opacity-60" />
    </button>
  )
}

export function DnaBadge({ cls, score }: { cls: string | null; score: number | null }) {
  return (
    <Badge variant="outline" className={cn("font-mono text-[10px]", dnaClassColor(cls))}>
      {dnaClassLabel(cls)} {score != null ? `· ${score.toFixed(1)}` : ""}
    </Badge>
  )
}

export function LaunchRow({ launch, rank }: { launch: Launch; rank?: number }) {
  const [flash, setFlash] = useState(false)
  const [flashedKey, setFlashedKey] = useState<string>("")
  const key = `${launch.mint}:${launch.last_refreshed_at ?? ""}`
  useEffect(() => {
    if (flashedKey && flashedKey !== key) {
      setFlash(true)
      const t = setTimeout(() => setFlash(false), 1500)
      return () => clearTimeout(t)
    }
    setFlashedKey(key)
  }, [key, flashedKey])

  const pct = launch.pct_change_1h
  const up = (pct ?? 0) > 0
  const down = (pct ?? 0) < 0

  return (
    <div
      className={cn(
        "grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_2fr_1fr_1fr_1fr_1fr_auto] items-center gap-3 px-3 md:px-4 py-2.5 border-b border-border/70 hover:bg-secondary/30 transition-colors text-sm",
        flash && "row-flash",
      )}
    >
      {rank != null ? (
        <span className="font-mono text-[11px] text-muted-foreground w-6 text-right">#{rank}</span>
      ) : (
        <span className="w-0 hidden md:block" />
      )}

      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold truncate">{launch.symbol || launch.name || "—"}</span>
          <DnaBadge cls={launch.dna_class} score={launch.dna_score} />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <MintPill mint={launch.mint} />
          <span>{formatAge(launch.first_seen_at)}</span>
        </div>
      </div>

      <div className="hidden md:block font-mono text-xs text-right">
        {formatUsd(launch.liquidity_usd)}
      </div>
      <div className="hidden md:block font-mono text-xs text-right">
        {formatUsd(launch.market_cap_usd)}
      </div>
      <div className="hidden md:block font-mono text-xs text-right">{launch.holders ?? "—"}</div>
      <div
        className={cn(
          "font-mono text-xs text-right tabular-nums",
          up && "text-primary",
          down && "text-destructive",
        )}
      >
        <span className="inline-flex items-center gap-0.5 justify-end">
          {up ? <ArrowUpRight className="size-3" /> : down ? <ArrowDownRight className="size-3" /> : null}
          {formatPct(pct)}
        </span>
      </div>

      <Link
        href={`https://dexscreener.com/solana/${launch.mint}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:text-primary"
        aria-label="Open on DexScreener"
      >
        <ExternalLink className="size-4" />
      </Link>
    </div>
  )
}

export function LaunchRowHeader() {
  return (
    <div className="hidden md:grid grid-cols-[auto_2fr_1fr_1fr_1fr_1fr_auto] items-center gap-3 px-4 py-2 border-b border-border text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
      <span className="w-6 text-right">#</span>
      <span>Token</span>
      <span className="text-right">Liq</span>
      <span className="text-right">MC</span>
      <span className="text-right">Holders</span>
      <span className="text-right">1h</span>
      <span />
    </div>
  )
}
