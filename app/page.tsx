import { Suspense } from "react"
import { RiskForm } from "@/components/risk-form"

export default function Page() {
  return (
    <main className="container mx-auto p-4 md:p-8">
      <Suspense fallback={<div>Loading...</div>}>
        <RiskForm />
      </Suspense>
    </main>
  )
}
