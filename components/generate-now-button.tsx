"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { mutate } from "swr"

export function GenerateNowButton() {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function run() {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch("/api/trigger?job=daily", { method: "POST" })
      if (!res.ok) throw new Error(`Failed: ${res.status}`)
      setMsg("Report generated")
      mutate("/api/reports")
    } catch (e: any) {
      setMsg(e.message ?? "Failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button size="sm" onClick={run} disabled={busy}>
        {busy ? <Spinner className="size-4" /> : null}
        Generate now
      </Button>
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
    </div>
  )
}
