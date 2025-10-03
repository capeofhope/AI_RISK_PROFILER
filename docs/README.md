# Health Risk Profiler (AI-Powered)

A full-stack Next.js application that:
- Parses lifestyle inputs (structured or freeform)
- Applies deterministic factor extraction and risk scoring
- Generates personalized recommendations with the AI SDK
- Learns from user feedback over time (simple online personalization)

Features
- Modern, responsive UI using shadcn/ui and Tailwind v4.
- SWR-based history and analytics; no fetch inside useEffect for server data.
- Backend API routes for processing and lightweight “training.”
- Storage abstraction with Upstash Redis support (KV_REST_API_URL, KV_REST_API_TOKEN) and safe in-memory fallback for local preview.

Quick Start
1) Run in v0 preview and click “Download ZIP” if needed.
2) Optional: add Upstash for Redis integration in Project Settings to persist data:
   - KV_REST_API_URL
   - KV_REST_API_TOKEN
3) Publish to Vercel when ready.

Security & Performance
- Environment variables are server-only and never exposed unless prefixed with NEXT_PUBLIC.
- Inputs validated and normalized; guardrails return “incomplete_profile” for insufficient data.
- Minimal dependencies; deterministic scoring runs locally; AI generation adds depth.
