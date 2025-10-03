"use client";

import useSWR from "swr";
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { OCRUploader } from "./ocr-uploader";
import type { FullProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Loader } from "@/components/loader";
import { ResultsCard } from "./results-card";
import { FileJson, Scan, History, Send } from 'lucide-react';


const fetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then((r) => r.json());

export function RiskForm() {
  const [textInput, setTextInput] = React.useState(
    '{\n  "age": 42,\n  "smoker": true,\n  "exercise": "rarely",\n  "diet": "high sugar"\n}'
  );
  const [ocrText, setOcrText] = React.useState("");
  const [persist, setPersist] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<FullProfile | null>(null);
  const [sessionId, setSessionId] = React.useState<string>("");

  React.useEffect(() => {
    try {
      const key = "hrp_session_id";
      const existing = window.localStorage.getItem(key);
      if (existing) {
        setSessionId(existing);
      } else {
        const id =
          Math.random().toString(36).slice(2) + Date.now().toString(36);
        window.localStorage.setItem(key, id);
        setSessionId(id);
      }
    } catch {
      setSessionId("anon");
    }
  }, []);

  const { data, mutate } = useSWR<{ items: FullProfile[] }>(
    "/api/profiles",
    fetcher
  );

  async function submit(
    payload: Partial<{ textInput: string; ocrText: string }>
  ) {
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, persist, sessionId }),
      });
      const json = (await res.json()) as FullProfile;
      setResult(json);
      if (persist) mutate();
    } catch (e) {
      console.log("[v0] submit error:", e);
    } finally {
      setSubmitting(false);
    }
  }

  async function sendFeedback(helpful: boolean) {
    if (!result) return;
    const factors = result.factors?.factors || [];
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
      });
    } catch (e) {
      console.log("[v0] feedback error:", e);
    }
  }

  return (
    <div className="grid gap-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-balance text-2xl font-bold text-primary">
            AI-Powered Health Risk Profiler
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="text" className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="text"><FileJson className="mr-2 h-4 w-4" />Text / JSON</TabsTrigger>
              <TabsTrigger value="ocr"><Scan className="mr-2 h-4 w-4" />Image OCR</TabsTrigger>
            </TabsList>
            <TabsContent value="text" className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="text-input">
                  Enter JSON or lines (e.g., {"Age: 42"})
                </Label>
                <Textarea
                  id="text-input"
                  rows={10}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={persist}
                    onChange={(e) => setPersist(e.target.checked)}
                  />
                  <span className="text-sm text-muted-foreground">
                    Persist to history
                  </span>
                </label>
                <Button
                  onClick={() => submit({ textInput })}
                  disabled={submitting}
                >
                  {submitting ? "Processing..." : "Analyze"}
                  <Send className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="ocr" className="space-y-4">
              <OCRUploader onExtract={setOcrText} />
              <div className="grid gap-2">
                <Label>OCR Text (editable)</Label>
                <Textarea
                  rows={8}
                  value={ocrText}
                  onChange={(e) => setOcrText(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={persist}
                    onChange={(e) => setPersist(e.target.checked)}
                  />
                  <span className="text-sm text-muted-foreground">
                    Persist to history
                  </span>
                </label>
                <Button
                  onClick={() => submit({ ocrText })}
                  disabled={submitting || !ocrText}
                >
                  {submitting ? "Processing..." : "Analyze OCR Result"}
                  <Send className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <AnimatePresence>
            {submitting && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Loader />
              </motion.div>
            )}
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <ResultsCard profile={result} />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid gap-2">
            <Label className="flex items-center"><History className="mr-2 h-5 w-5" />Recent Profiles</Label>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(data?.items || []).map((item) => (
                <Card key={item.id}>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {new Date(item.createdAt).toLocaleString()}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <div>Age: {String(item.parse.answers.age ?? "—")}</div>
                    <div>
                      Smoker: {String(item.parse.answers.smoker ?? "—")}
                    </div>
                    <div>
                      Exercise: {String(item.parse.answers.exercise ?? "—")}
                    </div>
                    <div>Diet: {String(item.parse.answers.diet ?? "—")}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}