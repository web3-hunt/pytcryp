"use client"

import { useRealtimeLaunches } from "@/lib/hooks/use-realtime-launches"
import { LaunchRow, LaunchRowHeader } from "@/components/launch-row"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyTitle, EmptyDescription, EmptyHeader } from "@/components/ui/empty"
import { Radio } from "lucide-react"

export function LiveFeed() {
  const { data, isLoading } = useRealtimeLaunches({ order: "created_at", limit: 100 })
  return (
    <section className="p-4 md:p-6">
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <LaunchRowHeader />
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <Radio className="size-6 text-muted-foreground" />
              <EmptyTitle>Quiet on the wire</EmptyTitle>
              <EmptyDescription>
                Launches will appear here as the scanner detects them.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          data.map((l, i) => <LaunchRow key={l.mint} launch={l} rank={i + 1} />)
        )}
      </div>
    </section>
  )
}
