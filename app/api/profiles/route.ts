import { NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { parseInputs, extractFactors, classifyRisk, generateRecommendations } from "@/lib/risk"
import type { FullProfile, ProcessPayload } from "@/lib/types"
import { saveProfile, listProfiles, getStore } from "@/lib/storage"
import { generateText } from "ai"

export const dynamic = "force-dynamic"

export async function GET() {
  const items = await listProfiles()
  return NextResponse.json({ items })
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ProcessPayload
    const parse = parseInputs({
      answers: body.answers,
      textInput: body.textInput,
      ocrText: body.ocrText,
    })

    const baseId = nanoid()
    const createdAt = Date.now()

    if (parse.status === "incomplete_profile") {
      const profile: FullProfile = { id: baseId, createdAt, parse }
      if (body.persist) await saveProfile(profile)
      return NextResponse.json(profile, { status: 200 })
    }

    const factors = extractFactors(parse.answers)
    const risk = classifyRisk(parse.answers, factors.factors)
    const recommendation = generateRecommendations(risk, factors.factors)

    // Personalization context
    const sessionId = body.sessionId || "anon"
    const store = getStore()
    const weights = await store.getWeights(sessionId)
    const topFactors = Object.entries(weights.factorWeights)
      .sort((a, b) => (b[1] ?? 1) - (a[1] ?? 1))
      .slice(0, 5)
      .map(([k, v]) => `${k}:${v.toFixed(2)}`)
      .join(", ")

    // Generate short explanatory AI notes; non-diagnostic guidance
    let aiNotes = ""
    try {
      const { text } = await generateText({
        model: "openai/gpt-5",
        maxOutputTokens: 300,
        temperature: 0.4,
        prompt: [
          "You are a careful health coach assistant. Provide concise, non-diagnostic notes.",
          `Answers: ${JSON.stringify(parse.answers)}`,
          `Risk: ${risk.risk_level} (score ${risk.score}); rationale: ${risk.rationale.join(", ")}`,
          `Factors: ${factors.factors.join(", ") || "none"}`,
          `PersonalizationWeights(top): ${topFactors || "none"}`,
          "In 2-3 sentences, explain why these recommendations are suggested, referencing lifestyle factors and habits. Avoid medical claims.",
        ].join("\n"),
      })
      aiNotes = text
    } catch (e) {
      aiNotes = ""
    }

    const profile: FullProfile = {
      id: baseId,
      createdAt,
      parse,
      factors,
      risk,
      recommendation,
      aiNotes,
    }

    if (body.persist) await saveProfile(profile)
    return NextResponse.json(profile, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 400 })
  }
}
