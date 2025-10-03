import type { FullProfile, PersonalizationWeights } from "./types"

const memoryStore: FullProfile[] = []

// In-memory weights per sessionId
const weightsMemory = new Map<string, PersonalizationWeights>()

function hasUpstash() {
  return !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN
}

async function upstashSet(key: string, value: unknown) {
  // Using Upstash REST API
  const url = `${process.env.KV_REST_API_URL}/set/${encodeURIComponent(key)}`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ value }),
    // Avoid caching
    cache: "no-store",
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`Upstash set failed: ${res.status} ${msg}`)
  }
}

async function upstashGetKeys(prefix: string) {
  // Upstash KEYS is not available in REST; we will track a simple index list key
  const indexKey = `${prefix}:index`
  const url = `${process.env.KV_REST_API_URL}/get/${encodeURIComponent(indexKey)}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
    cache: "no-store",
  })
  if (!res.ok) return []
  const json = (await res.json()) as { result?: string }
  if (!json?.result) return []
  try {
    const arr = JSON.parse(json.result) as string[]
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

async function upstashSetKeys(prefix: string, keys: string[]) {
  const indexKey = `${prefix}:index`
  return upstashSet(indexKey, JSON.stringify(keys))
}

async function upstashGet<T>(key: string): Promise<T | null> {
  const url = `${process.env.KV_REST_API_URL}/get/${encodeURIComponent(key)}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
    cache: "no-store",
  })
  if (!res.ok) return null
  const json = (await res.json()) as { result?: string }
  if (!json?.result) return null
  try {
    return JSON.parse(json.result) as T
  } catch {
    return null
  }
}

const PREFIX = "health-profiler"

export async function saveProfile(profile: FullProfile) {
  if (hasUpstash()) {
    const key = `${PREFIX}:profile:${profile.id}`
    const keys = await upstashGetKeys(PREFIX)
    const newKeys = [key, ...keys].slice(0, 50) // keep latest 50
    await Promise.all([upstashSet(key, JSON.stringify(profile)), upstashSetKeys(PREFIX, newKeys)])
    return
  }
  // fallback in-memory
  memoryStore.unshift(profile)
  if (memoryStore.length > 50) memoryStore.pop()
}

export async function listProfiles(): Promise<FullProfile[]> {
  if (hasUpstash()) {
    const keys = await upstashGetKeys(PREFIX)
    const items = await Promise.all(keys.map((k) => upstashGet<FullProfile>(k)))
    return items.filter(Boolean) as FullProfile[]
  }
  return memoryStore
}

// Upstash-backed get/set for weights + getStore()
async function upstashGetWeights(sessionId: string): Promise<PersonalizationWeights | null> {
  const key = `${PREFIX}:weights:${sessionId}`
  return upstashGet<PersonalizationWeights>(key)
}
async function upstashSetWeights(sessionId: string, value: PersonalizationWeights) {
  const key = `${PREFIX}:weights:${sessionId}`
  return upstashSet(key, JSON.stringify(value))
}

function defaultWeights(): PersonalizationWeights {
  return { factorWeights: {}, feedbackCounts: {} }
}

export function getStore() {
  return {
    async getWeights(sessionId: string): Promise<PersonalizationWeights> {
      if (hasUpstash()) {
        const existing = await upstashGetWeights(sessionId)
        if (existing) return existing
        const base = defaultWeights()
        await upstashSetWeights(sessionId, base)
        return base
      }
      const found = weightsMemory.get(sessionId)
      if (found) return found
      const base = defaultWeights()
      weightsMemory.set(sessionId, base)
      return base
    },
    async setWeights(sessionId: string, weights: PersonalizationWeights): Promise<void> {
      if (hasUpstash()) {
        await upstashSetWeights(sessionId, weights)
        return
      }
      weightsMemory.set(sessionId, weights)
    },
  }
}
