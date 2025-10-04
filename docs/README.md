# AI Risk Profiler

AI Risk Profiler is a small, privacy-focused Next.js application that parses user-provided lifestyle inputs (structured answers, free-text, or OCR-extracted text), deterministically extracts lifestyle risk factors, computes a non-diagnostic health risk score, and returns evidence-based recommendations. The app also generates concise explanatory notes using an AI text generation SDK and supports lightweight personalization by letting users mark recommendations as helpful or not.

This repository is intended as a demo/prototype — not a replacement for clinical judgment or medical advice.

## Contents

- `app/` — Next.js app pages, components and API routes
- `components/` — UI components used by the frontend
- `lib/` — Core logic: parsing, factor extraction, scoring, storage helpers
- `docs/` — supplemental project docs and notes
- `public/`, `styles/` — static assets and global styles

## Quick features

- Parse inputs from structured fields, JSON, key:value text, or OCR text
- Extract factors like smoking, poor diet, low exercise with confidence heuristics
- Simple risk scoring (low/moderate/high) with rationale and recommendations
- AI-generated explanatory notes (uses the AI SDK via `generateText`)
- Personalization: track feedback per-session to weight factors over time

## Installation and local development

Prerequisites: Node 18+, pnpm (optional), and a Next.js-compatible setup.

1. Clone the repository and install dependencies

```powershell
cd c:\Users\shubh\OneDrive\Desktop\mrinal\AI_RISK_PROFILER
pnpm install
```

2. Environment (optional)

- To persist profiles and personalization to Redis, set Upstash KV credentials in your environment:
  - `KV_REST_API_URL`
  - `KV_REST_API_TOKEN`

- The AI text generation uses the `ai` SDK which expects provider credentials to be available in your environment per that SDK's docs (e.g., OpenAI API key) — configure according to the SDK you plan to use.

3. Run the dev server

```powershell
pnpm dev
```

Then open http://localhost:3000.

## Usage overview

The frontend collects user inputs using the included `risk-form` component. Data is sent to the profiles API which returns a `FullProfile` object containing parsed answers, extracted factors, a risk result, recommendations, and optional AI notes.

### Data shapes

Key TypeScript types are in `lib/types.ts` — summarized below:

- RawAnswers: { age?: number, smoker?: boolean, exercise?: string, diet?: string, [key: string]: unknown }
- ParseResult: { answers: RawAnswers, missing_fields: string[], confidence: number, status?: 'ok'|'incomplete_profile' }
- FactorsResult: { factors: string[], confidence: number }
- RiskResult: { risk_level: 'low'|'moderate'|'high', score: number, rationale: string[] }
- RecommendationResult: { risk_level, factors, recommendations: string[], status: 'ok' }
- PersonalizationWeights: { factorWeights: Record<string, number>, feedbackCounts: Record<string, {helpful:number,notHelpful:number}> }

### API routes

All API routes are under `app/api` (Next.js Route Handlers). Two primary endpoints:

- POST /api/profiles
  - Purpose: Process input (structured answers, free-text, or OCR text), compute factors/risk/recommendations, produce optional AI notes, and optionally persist the profile.
  - Request body (JSON):
    - `answers?` (object) — structured `RawAnswers` (preferred)
    - `textInput?` (string) — freeform or JSON text the server will try to parse
    - `ocrText?` (string) — OCR-extracted text to parse
    - `persist?` (boolean) — if true, profile will be saved
    - `sessionId?` (string) — optional session id used for personalization weights
  - Response (200): `FullProfile` when processed (or partial profile when incomplete)
  - Notes: When parse results are incomplete (more than 50% fields missing) the endpoint returns a `FullProfile` with `parse.status === 'incomplete_profile'` and a `missing_fields` list.

- GET /api/profiles
  - Purpose: List persisted profiles (if storage is enabled)
  - Response: { items: FullProfile[] }

- POST /api/ai/train
  - Purpose: Lightweight feedback/online training endpoint.
  - Request body (JSON): { sessionId: string, profileId?: string, helpful: boolean, factors: string[] }
  - Behavior: Updates `PersonalizationWeights` for the `sessionId`. For each factor in `factors` it increments helpful/notHelpful counts and recomputes a weight in range ~[0.9, 1.3] (rounded to 3 decimals). Returns the updated factor weights.
  - Response: { ok: true, weights: Record<string, number> }

### Examples

1) Create a profile (POST /api/profiles)

Request body (JSON):

```json
{
  "answers": { "age": 52, "smoker": "yes", "exercise": "rarely", "diet": "high sugar" },
  "persist": true,
  "sessionId": "session-1234"
}
```

Successful response (200) — trimmed example:

```json
{
  "id": "V1StGXR8_Z5jdHi6B-myT",
  "createdAt": 1696480000000,
  "parse": { "answers": { "age": 52, "smoker": true, "exercise": "rarely", "diet": "high sugar" }, "missing_fields": [], "confidence": 0.98, "status": "ok" },
  "factors": { "factors": ["smoking","low exercise","poor diet"], "confidence": 0.95 },
  "risk": { "risk_level": "high", "score": 100, "rationale": ["smoking","low activity","high sugar/poor diet"] },
  "recommendation": { "risk_level": "high", "factors": ["smoking","low exercise","poor diet"], "recommendations": ["Quit smoking (seek professional support)", "Reduce sugar and ultra-processed foods", "Walk 30 minutes daily and add light strength work"], "status": "ok" },
  "aiNotes": ""
}
```

2) Send feedback / train personalization (POST /api/ai/train)

Request body (JSON):

```json
{
  "sessionId": "session-1234",
  "helpful": true,
  "factors": ["smoking","low exercise"]
}
```

Successful response (200):

```json
{ "ok": true, "weights": { "smoking": 1.12, "low exercise": 0.95 } }
```

### Important implementation notes

- Parsing logic (`lib/risk.ts`):
  - Priority: explicit `answers` object > JSON `textInput` > key:value `textInput` > `ocrText`.
  - Accepts JSON or simple `Key: Value` lines like `Age: 42` or `Smoker: yes`.

- Scoring and recommendations are intentionally simple and deterministic. They are for demonstration and should not be used for clinical decisions.

- AI generation: The profiles route calls `generateText` from the `ai` SDK to create short explanatory notes. If the AI step fails, the route gracefully continues and returns an empty `aiNotes` string.

## Developer notes & extending the project

- Storage: `lib/storage.ts` abstracts persistence. By default an in-memory store is used for local development. Add Upstash credentials to persist data across runs.

### Storage details

- The app supports two storage modes:
  - Upstash KV (if `KV_REST_API_URL` and `KV_REST_API_TOKEN` are set)
  - In-memory fallback (local development only)

- Profiles are stored under keys with prefix `health-profiler:profile:<id>` and an index key `health-profiler:index` keeps the latest 50 entries.
- Personalization weights are stored per-session under `health-profiler:weights:<sessionId>`.
- The in-memory fallback keeps at most 50 profiles and stores weights in a Map keyed by `sessionId`.


- To add new input fields or risk factors:
  - Update `lib/types.ts` `RawAnswers` and any UI forms
  - Update `lib/risk.ts`'s `extractFactors`, `classifyRisk`, and `generateRecommendations` accordingly

- Tests: This repo doesn't include automated tests yet. A minimal set to add:
  - Unit tests for `parseInputs`, `extractFactors`, and `classifyRisk` covering edge cases
  - Integration test for the `POST /api/profiles` flow