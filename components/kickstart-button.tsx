"use client"

import { useState } from "react"
import { Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function KickstartButton() {
  const [loading, setLoading] = useState(false)
  return (
    <Button
      size="sm"
      variant="secondary"
      className="w-full gap-2"
      disabled={loading}
      onClick={async () => {
        setLoading(true)
        try {
          const res = await fetch("/api/trigger", { method: "POST" })
          const json = await res.json()
          toast.success("Scan complete", {
            description: `scan: ${JSON.stringify(json?.results?.scan?.inserted ?? "—")} · refresh: ${
              JSON.stringify(json?.results?.refresh?.refreshed ?? "—")
            }`,
          })
        } catch (e) {
          toast.error("Scan failed", { description: e instanceof Error ? e.message : String(e) })
        } finally {
          setLoading(false)
        }
      }}
    >
      <Play className="size-3.5" />
      {loading ? "Scanning…" : "Run scan now"}
    </Button>
  )
}
