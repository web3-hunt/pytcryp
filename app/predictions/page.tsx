import { Sparkles } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { PredictionsView } from "@/components/predictions-view"

export default function PredictionsPage() {
  return (
    <>
      <PageHeader
        title="Predictions"
        description="Heuristic forecasts with transparent features and live accuracy tracking."
        icon={Sparkles}
      />
      <PredictionsView />
    </>
  )
}
