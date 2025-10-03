import type { NextRequest } from "next/server"
import { getStore } from "@/lib/storage"
import type { PersonalizationWeights } from "@/lib/types"

export const maxDuration = 15

export async function POST(req: NextRequest) {
  const { sessionId, profileId, helpful, factors } = (await req.json()) as {
    sessionId: string
    profileId: string
    helpful: boolean
    factors: string[]
  }

  if (!sessionId || !Array.isArray(factors)) {
    return Response.json({ error: "Missing sessionId or factors" }, { status: 400 })
  }

  const store = getStore()
  const weights = await store.getWeights(sessionId)

  for (const f of factors) {
    const counts = weights.feedbackCounts[f] ?? { helpful: 0, notHelpful: 0 }
    if (helpful) counts.helpful += 1
    else counts.notHelpful += 1
    weights.feedbackCounts[f] = counts

    const total = counts.helpful + counts.notHelpful
    const ratio = total === 0 ? 0.5 : counts.helpful / total
    const weight = 0.9 + ratio * 0.4
    weights.factorWeights[f] = Number(weight.toFixed(3))
  }

  await store.setWeights(sessionId, weights as PersonalizationWeights)
  return Response.json({ ok: true, weights: weights.factorWeights })
}
