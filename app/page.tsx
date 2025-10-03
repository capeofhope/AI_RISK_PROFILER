import { Suspense } from "react";
import { RiskForm } from "@/components/risk-form";
import { Loader } from "@/components/loader";

export default function Page() {
  return (
    <main className="container mx-auto p-4 md:p-8 space-y-6">
      <Suspense fallback={<Loader />}>
        <RiskForm />
      </Suspense>
    </main>
  );
}