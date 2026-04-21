import { Flame } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { StatsStrip } from "@/components/stats-strip"
import { HallOfFame } from "@/components/hall-of-fame"
import { SetupBanner } from "@/components/setup-banner"

export default function HomePage() {
  return (
    <>
      <PageHeader
        title="Hall of Fame"
        description="Top Solana launches ranked by DNA × traction. Live."
        icon={Flame}
      />
      <SetupBanner />
      <StatsStrip />
      <HallOfFame />
    </>
  )
}
