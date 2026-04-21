"use client"

import { useEffect, useState } from "react"
import { getSupabaseBrowser } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

export function RealtimeIndicator({ compact }: { compact?: boolean }) {
  const [state, setState] = useState<"connecting" | "live" | "closed">("connecting")
  const [events, setEvents] = useState(0)

  useEffect(() => {
    const sb = getSupabaseBrowser()
    const name = `rt:global:${Math.random().toString(36).slice(2)}`
    const ch = sb.channel(name)
    ch.on("postgres_changes", { event: "*", schema: "public", table: "launches" }, () =>
      setEvents((e) => e + 1),
    )
    ch.on("postgres_changes", { event: "*", schema: "public", table: "alpha_candidates" }, () =>
      setEvents((e) => e + 1),
    )
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") setState("live")
      else if (status === "CLOSED" || status === "CHANNEL_ERROR") setState("closed")
      else setState("connecting")
    })
    return () => {
      sb.removeChannel(ch)
    }
  }, [])

  const dot = cn(
    "size-2 rounded-full",
    state === "live" && "bg-primary pulse-dot",
    state === "connecting" && "bg-accent",
    state === "closed" && "bg-destructive",
  )
  const label = state === "live" ? "LIVE" : state === "connecting" ? "CONN" : "DOWN"

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] font-mono">
        <span className={dot} />
        <span>{label}</span>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between text-[10px] font-mono px-1">
      <div className="flex items-center gap-1.5">
        <span className={dot} />
        <span>{label}</span>
      </div>
      <span className="text-muted-foreground">{events} evt</span>
    </div>
  )
}
