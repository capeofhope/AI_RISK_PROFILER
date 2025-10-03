import type { RawAnswers, ParseResult, FactorsResult, RiskResult, RecommendationResult } from "./types"

const REQUIRED_FIELDS = ["age", "smoker", "exercise", "diet"] as const

function normalizeBool(val: unknown): boolean | undefined {
  if (typeof val === "boolean") return val
  if (typeof val === "string") {
    const v = val.trim().toLowerCase()
    if (["yes", "true", "y", "1"].includes(v)) return true
    if (["no", "false", "n", "0"].includes(v)) return false
  }
  if (typeof val === "number") return val !== 0
  return undefined
}

function normalizeNumber(val: unknown): number | undefined {
  if (typeof val === "number" && !Number.isNaN(val)) return val
  if (typeof val === "string") {
    const n = Number(val.trim())
    if (!Number.isNaN(n)) return n
  }
  return undefined
}

function parseKeyValueLines(text: string): RawAnswers {
  // Supports lines like: Age: 42, Smoker: yes, Exercise: rarely, Diet: high sugar
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const result: RawAnswers = {}
  for (const line of lines) {
    const match = line.match(/^([A-Za-z_]+)\s*:\s*(.+)$/)
    if (!match) continue
    const key = match[1].toLowerCase()
    const raw = match[2].trim()

    if (key === "age") {
      result.age = normalizeNumber(raw)
    } else if (key === "smoker") {
      result.smoker = normalizeBool(raw)
    } else if (key === "exercise") {
      result.exercise = raw.toLowerCase()
    } else if (key === "diet") {
      result.diet = raw.toLowerCase()
    } else {
      result[key] = raw
    }
  }
  return result
}

function parseJsonInput(text: string): RawAnswers | undefined {
  try {
    const obj = JSON.parse(text)
    const answers: RawAnswers = {}
    if ("age" in obj) answers.age = normalizeNumber((obj as any).age)
    if ("smoker" in obj) answers.smoker = normalizeBool((obj as any).smoker)
    if ("exercise" in obj) answers.exercise = String((obj as any).exercise || "").toLowerCase()
    if ("diet" in obj) answers.diet = String((obj as any).diet || "").toLowerCase()
    // copy any other fields
    for (const [k, v] of Object.entries(obj as any)) {
      if (!(k in answers)) answers[k] = v
    }
    return answers
  } catch {
    return undefined
  }
}

export function parseInputs(params: {
  answers?: RawAnswers
  textInput?: string
  ocrText?: string
}): ParseResult {
  let base: RawAnswers = {}

  // Priority: explicit answers > JSON text > key:value lines > OCR text
  if (params.answers && Object.keys(params.answers).length > 0) {
    base = { ...params.answers }
  } else if (params.textInput) {
    // try JSON
    const fromJson = parseJsonInput(params.textInput)
    if (fromJson) {
      base = fromJson
    } else {
      // try key:value lines
      base = parseKeyValueLines(params.textInput)
    }
  } else if (params.ocrText) {
    base = parseKeyValueLines(params.ocrText)
  }

  // Normalize core fields
  if (base.age !== undefined) base.age = normalizeNumber(base.age)
  if (base.smoker !== undefined) base.smoker = normalizeBool(base.smoker)
  if (typeof base.exercise === "string") base.exercise = base.exercise.toLowerCase()
  if (typeof base.diet === "string") base.diet = base.diet.toLowerCase()

  const missing = REQUIRED_FIELDS.filter((f) => base[f] === undefined)
  const total = REQUIRED_FIELDS.length
  const present = total - missing.length

  // Confidence heuristic: fraction present, bounded [0.3, 0.98]
  const confidence = Math.max(0.3, Math.min(0.98, present / total))

  if (missing.length > total / 2) {
    return {
      answers: base,
      missing_fields: missing,
      confidence,
      status: "incomplete_profile",
      reason: ">50% fields missing",
    }
  }

  return { answers: base, missing_fields: missing, confidence, status: "ok" }
}

export function extractFactors(answers: RawAnswers): FactorsResult {
  const factors: string[] = []
  let confidence = 0.8

  if (answers.smoker === true) {
    factors.push("smoking")
    confidence += 0.05
  }
  const ex = (answers.exercise || "").toString().toLowerCase()
  if (["never", "rarely", "seldom", "low", "sedentary"].some((k) => ex.includes(k))) {
    factors.push("low exercise")
  }
  const diet = (answers.diet || "").toString().toLowerCase()
  if (["high sugar", "high fat", "processed", "poor", "unhealthy"].some((k) => diet.includes(k))) {
    factors.push("poor diet")
  }
  // age-based modifier (not a "factor", but affects confidence)
  const age = answers.age
  if (typeof age === "number") {
    confidence += 0.03
  }
  confidence = Math.min(0.95, confidence)

  return { factors, confidence }
}

export function classifyRisk(answers: RawAnswers, factors: string[]): RiskResult {
  // Simple, non-diagnostic scoring
  let score = 0
  const rationale: string[] = []

  if (answers.smoker === true) {
    score += 50
    rationale.push("smoking")
  }
  const ex = (answers.exercise || "").toString().toLowerCase()
  if (["never", "rarely", "seldom", "low", "sedentary"].some((k) => ex.includes(k))) {
    score += 20
    rationale.push("low activity")
  }
  const diet = (answers.diet || "").toString().toLowerCase()
  if (["high sugar", "high fat", "processed", "poor", "unhealthy"].some((k) => diet.includes(k))) {
    score += 20
    rationale.push("high sugar/poor diet")
  }
  const age = typeof answers.age === "number" ? answers.age : undefined
  if (age !== undefined) {
    if (age >= 65) score += 10
    else if (age >= 45) score += 5
  }

  let risk_level: RiskResult["risk_level"] = "low"
  if (score >= 65) risk_level = "high"
  else if (score >= 35) risk_level = "moderate"

  return { risk_level, score, rationale }
}

export function generateRecommendations(risk: RiskResult, factors: string[]): RecommendationResult {
  const recs: string[] = []
  if (factors.includes("smoking")) recs.push("Quit smoking (seek professional support)")
  if (factors.includes("poor diet")) recs.push("Reduce sugar and ultra-processed foods")
  if (factors.includes("low exercise")) recs.push("Walk 30 minutes daily and add light strength work")

  if (recs.length === 0) {
    recs.push("Maintain balanced diet and regular physical activity")
  }

  return {
    risk_level: risk.risk_level,
    factors,
    recommendations: recs,
    status: "ok",
  }
}
