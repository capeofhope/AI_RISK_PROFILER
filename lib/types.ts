export type RawAnswers = {
  age?: number
  smoker?: boolean
  exercise?: string
  diet?: string
  // Allow future extensibility
  [key: string]: unknown
}

export type ParseResult = {
  answers: RawAnswers
  missing_fields: string[]
  confidence: number
  status?: "ok" | "incomplete_profile"
  reason?: string
}

export type FactorsResult = {
  factors: string[]
  confidence: number
}

export type RiskResult = {
  risk_level: "low" | "moderate" | "high"
  score: number
  rationale: string[]
}

export type RecommendationResult = {
  risk_level: RiskResult["risk_level"]
  factors: string[]
  recommendations: string[]
  status: "ok"
}

export type PersonalizationWeights = {
  factorWeights: Record<string, number>
  feedbackCounts: Record<string, { helpful: number; notHelpful: number }>
}

export type FullProfile = {
  id: string
  createdAt: number
  parse: ParseResult
  factors?: FactorsResult
  risk?: RiskResult
  recommendation?: RecommendationResult
  aiNotes?: string
}

export type ProcessPayload = {
  // Either provide structured answers or raw text/image OCR text
  answers?: RawAnswers
  textInput?: string
  // For OCR, the client will send extracted text; binary upload is out of scope for Next.js
  ocrText?: string
  // Optional: persist result
  persist?: boolean
  // Session identifier for personalization context
  sessionId?: string
}
