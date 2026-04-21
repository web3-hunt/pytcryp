import { LineChart } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { DexTrends } from "@/components/dex-trends"

export default function DexPage() {
  return (
    <>
      <PageHeader
        title="DexTrends"
        description="Volume and DNA distribution across tracked launches."
        icon={LineChart}
      />
      <DexTrends />
    </>
  )
}
