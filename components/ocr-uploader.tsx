"use client"

import React from "react"
import Tesseract from "tesseract.js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"

type Props = {
  onExtract: (text: string) => void
}

export function OCRUploader({ onExtract }: Props) {
  const [file, setFile] = React.useState<File | null>(null)
  const [progress, setProgress] = React.useState<number>(0)
  const [status, setStatus] = React.useState<string>("Idle")
  const [extracted, setExtracted] = React.useState<string>("")

  async function handleOCR() {
    if (!file) return
    setProgress(0)
    setStatus("Starting OCR...")
    try {
      const { data } = await Tesseract.recognize(file, "eng", {
        logger: (m) => {
          if (m.status) setStatus(m.status)
          if (m.progress) setProgress(Math.round(m.progress * 100))
        },
      })
      const text = (data?.text || "").trim()
      setExtracted(text)
      onExtract(text)
    } catch (e: any) {
      setStatus(`OCR failed: ${e?.message || "unknown error"}`)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Image OCR</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="ocr-file">Upload scanned form (PNG/JPG)</Label>
          <input id="ocr-file" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleOCR} disabled={!file}>
            Run OCR
          </Button>
          <div className="text-sm text-muted-foreground">{status}</div>
        </div>
        <Progress value={progress} aria-label="OCR progress" />
        <div className="grid gap-2">
          <Label>Extracted Text</Label>
          <Textarea value={extracted} onChange={(e) => setExtracted(e.target.value)} rows={6} />
        </div>
      </CardContent>
    </Card>
  )
}
