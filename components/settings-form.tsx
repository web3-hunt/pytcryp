"use client"

import useSWR, { mutate } from "swr"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Spinner } from "@/components/ui/spinner"

type Settings = {
  min_liquidity_usd: number
  min_holders: number
  max_gini: number
  min_nakamoto: number
  strong_alpha_score: number
  scan_interval_seconds: number
  telegram_enabled: boolean
  prediction_horizons: number[]
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const defaults: Settings = {
  min_liquidity_usd: 1000,
  min_holders: 25,
  max_gini: 0.85,
  min_nakamoto: 3,
  strong_alpha_score: 75,
  scan_interval_seconds: 60,
  telegram_enabled: true,
  prediction_horizons: [15, 60, 240],
}

export function SettingsForm() {
  const { data, isLoading } = useSWR<{ settings: Settings }>("/api/settings", fetcher)
  const [local, setLocal] = useState<Settings>(defaults)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (data?.settings) setLocal({ ...defaults, ...data.settings })
  }, [data])

  async function save() {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(local),
      })
      if (!res.ok) throw new Error(`Failed: ${res.status}`)
      setMsg("Saved")
      mutate("/api/settings")
    } catch (e: any) {
      setMsg(e.message ?? "Failed")
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Spinner /> Loading settings...
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
      <Card className="bg-card/60">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="min_liquidity_usd">Min liquidity (USD)</FieldLabel>
              <Input
                id="min_liquidity_usd"
                type="number"
                value={local.min_liquidity_usd}
                onChange={(e) => setLocal({ ...local, min_liquidity_usd: Number(e.target.value) })}
              />
              <FieldDescription>Launches with less liquidity are filtered out of the feed.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="min_holders">Min holders</FieldLabel>
              <Input
                id="min_holders"
                type="number"
                value={local.min_holders}
                onChange={(e) => setLocal({ ...local, min_holders: Number(e.target.value) })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="max_gini">Max Gini (holder concentration)</FieldLabel>
              <Input
                id="max_gini"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={local.max_gini}
                onChange={(e) => setLocal({ ...local, max_gini: Number(e.target.value) })}
              />
              <FieldDescription>0 = even distribution, 1 = single holder owns everything.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="min_nakamoto">Min Nakamoto coefficient</FieldLabel>
              <Input
                id="min_nakamoto"
                type="number"
                value={local.min_nakamoto}
                onChange={(e) => setLocal({ ...local, min_nakamoto: Number(e.target.value) })}
              />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card className="bg-card/60">
        <CardHeader>
          <CardTitle>Scanner & alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="strong_alpha_score">Strong alpha threshold</FieldLabel>
              <Input
                id="strong_alpha_score"
                type="number"
                value={local.strong_alpha_score}
                onChange={(e) => setLocal({ ...local, strong_alpha_score: Number(e.target.value) })}
              />
              <FieldDescription>DNA score above this fires a Telegram alert.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="scan_interval_seconds">Scan interval (seconds)</FieldLabel>
              <Input
                id="scan_interval_seconds"
                type="number"
                value={local.scan_interval_seconds}
                onChange={(e) => setLocal({ ...local, scan_interval_seconds: Number(e.target.value) })}
              />
              <FieldDescription>Minimum 60s on Vercel Cron.</FieldDescription>
            </Field>
            <Field orientation="horizontal">
              <FieldLabel htmlFor="telegram_enabled">Telegram alerts</FieldLabel>
              <Switch
                id="telegram_enabled"
                checked={local.telegram_enabled}
                onCheckedChange={(v) => setLocal({ ...local, telegram_enabled: v })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="prediction_horizons">Prediction horizons (minutes, comma-separated)</FieldLabel>
              <Input
                id="prediction_horizons"
                value={local.prediction_horizons.join(", ")}
                onChange={(e) =>
                  setLocal({
                    ...local,
                    prediction_horizons: e.target.value
                      .split(",")
                      .map((s) => Number(s.trim()))
                      .filter((n) => !Number.isNaN(n) && n > 0),
                  })
                }
              />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="lg:col-span-2 flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? <Spinner className="size-4" /> : null}
          Save settings
        </Button>
        {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
      </div>
    </div>
  )
}
