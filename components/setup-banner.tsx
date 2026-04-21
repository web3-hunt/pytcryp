"use client"

import useSWR from "swr"
import { AlertCircle, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getSupabaseBrowser } from "@/lib/supabase/client"
import { useState } from "react"
import { toast } from "sonner"

async function checkSetup() {
  const sb = getSupabaseBrowser()
  const { count } = await sb.from("launches").select("mint", { count: "exact", head: true })
  return { hasData: (count || 0) > 0, count: count || 0 }
}

export function SetupBanner() {
  const { data, mutate } = useSWR("setup-check", checkSetup, { refreshInterval: 10_000 })
  const [loading, setLoading] = useState(false)

  if (!data || data.hasData) return null

  return (
    <div className="mx-4 md:mx-6 mt-4 rounded-lg border border-accent/40 bg-accent/10 p-4 flex flex-col md:flex-row md:items-center gap-3">
      <div className="flex items-start md:items-center gap-3 flex-1">
        <AlertCircle className="size-5 text-accent shrink-0 mt-0.5 md:mt-0" />
        <div className="text-sm">
          <div className="font-medium">No launches indexed yet.</div>
          <div className="text-muted-foreground">
            The scanner runs every 2 minutes on Vercel Cron. Trigger a scan now to populate the dashboard.
          </div>
        </div>
      </div>
      <Button
        size="sm"
        disabled={loading}
        onClick={async () => {
          setLoading(true)
          try {
            const res = await fetch("/api/trigger", { method: "POST" })
            const json = await res.json()
            const inserted = json?.results?.scan?.inserted ?? 0
            toast.success(`Scan complete: ${inserted} new launches`)
            mutate()
          } catch (e) {
            toast.error("Scan failed", { description: e instanceof Error ? e.message : String(e) })
          } finally {
            setLoading(false)
          }
        }}
        className="gap-2"
      >
        <Play className="size-3.5" />
        {loading ? "Scanning…" : "Run scan now"}
      </Button>
    </div>
  )
}
