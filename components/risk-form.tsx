"use client"

import useSWR from "swr"
import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { OCRUploader } from "./ocr-uploader"
import type { FullProfile } from "@/lib/types"
import { cn } from "@/lib/utils"

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json())

export function RiskForm() {
  const [textInput, setTextInput] = React.useState(
    '{\n  "age": 42,\n  "smoker": true,\n  "exercise": "rarely",\n  "diet": "high sugar"\n}',
  )
  const [ocrText, setOcrText] = React.useState("")
  const [persist, setPersist] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [result, setResult] = React.useState<FullProfile | null>(null)
  const [sessionId, setSessionId] = React.useState<string>("")

  React.useEffect(() => {
    try {
      const key = "hrp_session_id"
      const existing = window.localStorage.getItem(key)
      if (existing) setSessionId(existing)
      else {
        const id = Math.random().toString(36).slice(2) + Date.now().toString(36)
        window.localStorage.setItem(key, id)
        setSessionId(id)
      }
    } catch {
      setSessionId("anon")
    }
  }, [])

  const { data, mutate } = useSWR<{ items: FullProfile[] }>("/api/profiles", fetcher)

  async function submit(payload: Partial<{ textInput: string; ocrText: string }>) {
    setSubmitting(true)
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, persist, sessionId }),
      })
      const json = (await res.json()) as FullProfile
      setResult(json)
      if (persist) mutate()
    } catch (e) {
      console.log("[v0] submit error:", e)
    } finally {
      setSubmitting(false)
    }
  }

  async function sendFeedback(helpful: boolean) {
    if (!result) return
    const factors = result.factors?.factors || []
    try {
      await fetch("/api/ai/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          profileId: result.id,
          helpful,
          factors,
        }),
      })
    } catch (e) {
      console.log("[v0] feedback error:", e)
    }
  }

  const riskColor =
    result?.risk?.risk_level === "high"
      ? "bg-red-600 text-white"
      : result?.risk?.risk_level === "moderate"
        ? "bg-amber-500 text-black"
        : "bg-emerald-600 text-white"

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-balance">AI-Powered Health Risk Profiler</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="text" className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="text">Text / JSON</TabsTrigger>
              <TabsTrigger value="ocr">Image OCR</TabsTrigger>
            </TabsList>
            <TabsContent value="text" className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="text-input">Enter JSON or lines (e.g., {"Age: 42"})</Label>
                <Textarea id="text-input" rows={10} value={textInput} onChange={(e) => setTextInput(e.target.value)} />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={persist} onChange={(e) => setPersist(e.target.checked)} />
                  <span className="text-sm text-muted-foreground">Persist to history</span>
                </label>
                <Button onClick={() => submit({ textInput })} disabled={submitting}>
                  {submitting ? "Processing..." : "Analyze"}
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="ocr" className="space-y-4">
              <OCRUploader onExtract={setOcrText} />
              <div className="grid gap-2">
                <Label>OCR Text (editable)</Label>
                <Textarea rows={8} value={ocrText} onChange={(e) => setOcrText(e.target.value)} />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={persist} onChange={(e) => setPersist(e.target.checked)} />
                  <span className="text-sm text-muted-foreground">Persist to history</span>
                </label>
                <Button onClick={() => submit({ ocrText })} disabled={submitting || !ocrText}>
                  {submitting ? "Processing..." : "Analyze OCR Result"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {result && (
            <div className="grid gap-4">
              {result.parse.status === "incomplete_profile" ? (
                <Alert>
                  <AlertTitle>Incomplete Profile</AlertTitle>
                  <AlertDescription>
                    {result.parse.reason}. Missing fields:{" "}
                    <strong>{result.parse.missing_fields.join(", ") || "none"}</strong>. Confidence:{" "}
                    {Math.round((result.parse.confidence || 0) * 100)}%
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={cn("text-xs", riskColor)}>
                      Risk: {result.risk?.risk_level?.toUpperCase()} (score {result.risk?.score})
                    </Badge>
                    <Badge variant="secondary">
                      Parse confidence: {Math.round((result.parse.confidence || 0) * 100)}%
                    </Badge>
                    <Badge variant="secondary">
                      Factors confidence: {Math.round((result.factors?.confidence || 0) * 100)}%
                    </Badge>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Answers</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="text-sm space-y-1">
                          <li>Age: {String(result.parse.answers.age ?? "—")}</li>
                          <li>Smoker: {String(result.parse.answers.smoker ?? "—")}</li>
                          <li>Exercise: {String(result.parse.answers.exercise ?? "—")}</li>
                          <li>Diet: {String(result.parse.answers.diet ?? "—")}</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Factors</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-wrap gap-2">
                        {(result.factors?.factors?.length ? result.factors.factors : ["None"]).map((f) => (
                          <Badge key={f}>{f}</Badge>
                        ))}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Recommendations</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="list-disc pl-5 text-sm space-y-1">
                          {(result.recommendation?.recommendations?.length
                            ? result.recommendation.recommendations
                            : ["No recommendations"]
                          ).map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>

                  {result.aiNotes ? (
                    <Alert>
                      <AlertTitle>AI Notes</AlertTitle>
                      <AlertDescription>{result.aiNotes}</AlertDescription>
                    </Alert>
                  ) : null}

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Was this helpful?</span>
                    <Button size="sm" variant="secondary" onClick={() => sendFeedback(true)}>
                      Yes
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => sendFeedback(false)}>
                      No
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <Label>Recent Profiles</Label>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(data?.items || []).map((item) => (
                <Card key={item.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{new Date(item.createdAt).toLocaleString()}</CardTitle>
                    <CardDescription>
                      {item.risk?.risk_level
                        ? `Risk: ${item.risk.risk_level} (${item.risk.score})`
                        : "Incomplete profile"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <div>Age: {String(item.parse.answers.age ?? "—")}</div>
                    <div>Smoker: {String(item.parse.answers.smoker ?? "—")}</div>
                    <div>Exercise: {String(item.parse.answers.exercise ?? "—")}</div>
                    <div>Diet: {String(item.parse.answers.diet ?? "—")}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
