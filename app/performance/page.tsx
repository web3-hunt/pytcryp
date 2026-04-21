import { BarChart3 } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { PerformanceView } from "@/components/performance-view"

export default function PerformancePage() {
  return (
    <>
      <PageHeader
        title="Performance"
        description="Rolling accuracy, candidate flow, and scanner health."
        icon={BarChart3}
      />
      <PerformanceView />
    </>
  )
}
