import { ScrollText } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { DailyReport } from "@/components/daily-report"
import { GenerateNowButton } from "@/components/generate-now-button"

export default function ReportPage() {
  return (
    <>
      <PageHeader
        title="Daily Report"
        description="An end-of-day plain-English briefing by the learner."
        icon={ScrollText}
        right={<GenerateNowButton />}
      />
      <DailyReport />
    </>
  )
}
