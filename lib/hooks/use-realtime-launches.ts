"use client"

import useSWR from "swr"
import { useEffect, useRef } from "react"
import { getSupabaseBrowser } from "@/lib/supabase/client"
import type { Launch } from "@/lib/types"

type Options = {
  order?: "created_at" | "dna_score" | "pct_change_1h" | "volume_1h_usd"
  limit?: number
  source?: string | null
}

async function fetchLaunches({
  order = "created_at",
  limit = 50,
  source = null,
}: Options): Promise<Launch[]> {
  const sb = getSupabaseBrowser()
  let q = sb.from("launches").select("*").order(order, { ascending: false, nullsFirst: false }).limit(limit)
  if (source) q = q.eq("source", source)
  const { data, error } = await q
  if (error) throw error
  return (data || []) as Launch[]
}

export function useRealtimeLaunches(opts: Options = {}) {
  const key = ["launches", opts.order || "created_at", opts.limit || 50, opts.source || ""]
  const swr = useSWR(key, () => fetchLaunches(opts), {
    refreshInterval: 15_000,
    revalidateOnFocus: true,
  })
  const mutateRef = useRef(swr.mutate)
  mutateRef.current = swr.mutate

  const keyString = key.join("|")
  useEffect(() => {
    const sb = getSupabaseBrowser()
    const name = `rt:launches:${keyString}:${Math.random().toString(36).slice(2)}`
    const ch = sb.channel(name)
    ch.on("postgres_changes", { event: "*", schema: "public", table: "launches" }, () => {
      mutateRef.current()
    })
    ch.subscribe()
    return () => {
      sb.removeChannel(ch)
    }
  }, [keyString])

  return swr
}

export function useRealtimeCandidates(limit = 50) {
  const swr = useSWR(
    ["candidates", limit],
    async () => {
      const sb = getSupabaseBrowser()
      const { data, error } = await sb
        .from("alpha_candidates")
        .select("*, launches(symbol,name,mint,liquidity_usd,pct_change_1h,dna_class,dna_score,holders)")
        .order("detected_at", { ascending: false })
        .limit(limit)
      if (error) throw error
      return data || []
    },
    { refreshInterval: 15_000 },
  )

  const mutateRef = useRef(swr.mutate)
  mutateRef.current = swr.mutate

  useEffect(() => {
    const sb = getSupabaseBrowser()
    const name = `rt:candidates:${Math.random().toString(36).slice(2)}`
    const ch = sb.channel(name)
    ch.on("postgres_changes", { event: "*", schema: "public", table: "alpha_candidates" }, () =>
      mutateRef.current(),
    )
    ch.subscribe()
    return () => {
      sb.removeChannel(ch)
    }
  }, [])

  return swr
}
