"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { FullProfile } from "@/lib/types"
import { FileText, ClipboardList, Lightbulb } from 'lucide-react';


export function ResultsCard({ profile }: { profile: FullProfile }) {
  const level = profile.risk?.risk_level
  const score = profile.risk?.score
  const riskColor =
    level === "high"
      ? "bg-red-600 text-white"
      : level === "moderate"
        ? "bg-yellow-500 text-black"
        : "bg-green-500 text-black"

  const factors = profile.factors?.factors || []
  const recs = profile.recommendation?.recommendations || []

  return (
  <Card className="p-4 md:p-6 space-y-6 border-2 border-primary/40 shadow-lg shadow-primary/20">
      <div className="flex items-center justify-between">
        <div className="text-pretty">
          <h3 className="text-xl font-semibold text-balance text-primary">Personalized Risk Assessment</h3>
          <p className="text-sm text-muted-foreground">Generated {new Date(profile.createdAt).toLocaleString()}</p>
        </div>
        {level ? (
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${riskColor}`} aria-label={`Risk level ${level}`}>
            {level.toUpperCase()} • {score ?? ""}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {factors.map((f) => (
          <Badge key={f} variant="secondary">
            {f}
          </Badge>
        ))}
        {!factors.length && <Badge variant="secondary">general wellness</Badge>}
      </div>

      <Separator />

      <div className="space-y-2">
        <h4 className="font-medium flex items-center"><ClipboardList className="mr-2 h-5 w-5" />Recommendations</h4>
        <ul className="list-disc pl-5 space-y-1">
          {recs.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
          {!recs.length && <li>Provide more details to receive tailored suggestions.</li>}
        </ul>
      </div>

      {profile.aiNotes ? (
        <div className="rounded-md border-2 border-primary/20 p-3 bg-muted/40">
          <p className="text-sm flex items-start"><Lightbulb className="mr-2 h-5 w-5 flex-shrink-0 text-primary" />{profile.aiNotes}</p>
        </div>
      ) : null}

      {profile.parse.status === "incomplete_profile" && profile.parse.reason ? (
        <p className="text-sm text-destructive">Profile incomplete: {profile.parse.reason}</p>
      ) : null}
    </Card>
  )
}