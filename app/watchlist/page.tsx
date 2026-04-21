import { Star } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Watchlist } from "@/components/watchlist"

export default function WatchlistPage() {
  return (
    <>
      <PageHeader
        title="Watchlist"
        description="Wallets, creators and mints you care about. Alerts route here first."
        icon={Star}
      />
      <Watchlist />
    </>
  )
}
