"use client"

import useSWR from "swr"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Trash2, Plus } from "lucide-react"
import { toast } from "sonner"
import type { WatchlistItem } from "@/lib/types"

const fetcher = (u: string) => fetch(u).then((r) => r.json())

export function Watchlist() {
  const { data, mutate } = useSWR<{ items: WatchlistItem[] }>("/api/watchlist", fetcher, {
    refreshInterval: 20_000,
  })
  const [kind, setKind] = useState<"wallet" | "mint" | "creator">("wallet")
  const [target, setTarget] = useState("")
  const [label, setLabel] = useState("")
  const [saving, setSaving] = useState(false)

  const items = data?.items || []

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!target.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, target: target.trim(), label: label.trim() || null }),
      })
      if (!res.ok) throw new Error((await res.json())?.error || "failed")
      toast.success("Added to watchlist")
      setTarget("")
      setLabel("")
      mutate()
    } catch (err) {
      toast.error("Failed to add", { description: err instanceof Error ? err.message : String(err) })
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/watchlist?id=${id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Removed")
      mutate()
    }
  }

  return (
    <section className="p-4 md:p-6 grid gap-4 md:grid-cols-[1fr_2fr]">
      <Card>
        <CardHeader>
          <CardTitle>Add to watchlist</CardTitle>
          <CardDescription>Track a wallet, creator, or mint.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit}>
            <FieldGroup>
              <Field>
                <FieldLabel>Kind</FieldLabel>
                <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wallet">Wallet</SelectItem>
                    <SelectItem value="creator">Creator</SelectItem>
                    <SelectItem value="mint">Mint</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Address / Mint</FieldLabel>
                <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Enter address…" />
              </Field>
              <Field>
                <FieldLabel>Label (optional)</FieldLabel>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. whale_A" />
              </Field>
              <Button type="submit" disabled={saving} className="gap-2">
                <Plus className="size-4" /> {saving ? "Adding…" : "Add"}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tracked ({items.length})</CardTitle>
          <CardDescription>Items you&apos;re watching.</CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing here yet. Add a wallet to get started.</p>
          ) : (
            <div className="divide-y divide-border">
              {items.map((it) => (
                <div key={it.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground rounded border border-border px-1.5 py-0.5">
                        {it.kind}
                      </span>
                      <span className="font-medium truncate">{it.label || "—"}</span>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{it.target}</div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(it.id)} aria-label="Remove">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
