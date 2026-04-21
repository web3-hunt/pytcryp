import { Radio } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { LiveFeed } from "@/components/live-feed"
import { RealtimeIndicator } from "@/components/realtime-indicator"

export default function LivePage() {
  return (
    <>
      <PageHeader
        title="Live Feed"
        description="Every new launch as it lands. Updates stream over Supabase Realtime."
        icon={Radio}
        right={<RealtimeIndicator compact />}
      />
      <LiveFeed />
    </>
  )
}
