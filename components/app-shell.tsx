"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity,
  BarChart3,
  Dna,
  Flame,
  Gauge,
  LineChart,
  Radio,
  ScrollText,
  Settings,
  Star,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { RealtimeIndicator } from "@/components/realtime-indicator"
import { KickstartButton } from "@/components/kickstart-button"

const NAV: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { href: "/", label: "Hall of Fame", icon: Flame },
  { href: "/live", label: "Live Feed", icon: Radio },
  { href: "/dex", label: "DexTrends", icon: LineChart },
  { href: "/watchlist", label: "Watchlist", icon: Star },
  { href: "/predictions", label: "Predictions", icon: Sparkles },
  { href: "/performance", label: "Performance", icon: BarChart3 },
  { href: "/report", label: "Daily Report", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:flex w-60 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex items-center gap-2 px-4 h-14 border-b border-sidebar-border">
          <div className="size-7 rounded-md bg-primary/20 border border-primary/40 flex items-center justify-center">
            <Dna className="size-4 text-primary" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">Alpha Scanner</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              Solana · realtime
            </span>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {NAV.map((n) => {
            const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href))
            const Icon = n.icon
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                <span>{n.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <RealtimeIndicator />
          <KickstartButton />
          <div className="text-[10px] font-mono text-muted-foreground px-1">
            Helius · DexScreener · Supabase Realtime
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden sticky top-0 z-20 h-14 px-4 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-md bg-primary/20 border border-primary/40 flex items-center justify-center">
              <Dna className="size-4 text-primary" />
            </div>
            <span className="text-sm font-semibold">Alpha Scanner</span>
          </div>
          <RealtimeIndicator compact />
        </header>
        <main className="flex-1 min-w-0">{children}</main>
        {/* Mobile nav */}
        <nav className="md:hidden sticky bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur">
          <div className="flex overflow-x-auto scrollbar-thin">
            {NAV.map((n) => {
              const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href))
              const Icon = n.icon
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-4 py-2 text-[10px] min-w-16 shrink-0",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  <span>{n.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}


