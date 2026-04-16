"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createLearningInteraction, listPublicLearningInteractions, type LearningInteraction } from "@/lib/api"
import { useAuth } from "@/components/auth/auth-provider"

export default function LearningHubPage() {
  const { user, loading: authLoading } = useAuth()
  const [interactions, setInteractions] = useState<LearningInteraction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submissionType, setSubmissionType] = useState<"ERROR_REPORT" | "DOUBT">("ERROR_REPORT")
  const [targetType, setTargetType] = useState<"blog" | "forum" | "question" | "practice">("blog")
  const [targetId, setTargetId] = useState("")
  const [content, setContent] = useState("")
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [guidance, setGuidance] = useState("")

  useEffect(() => {
    loadInteractions()
  }, [])

  async function loadInteractions() {
    try {
      const result = await listPublicLearningInteractions({ page: 1, limit: 20 })
      if (result.success) {
        setInteractions(result.data.items)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit() {
    if (!content.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const result = await createLearningInteraction({
        targetType,
        targetId: targetId.trim() || "general",
        interactionType: submissionType,
        content: content.trim()
      })
      if (result.success) {
        setGuidance(result.data.guidance)
        setSubmitSuccess(true)
        setTimeout(() => {
          setDialogOpen(false)
          setSubmitSuccess(false)
          setContent("")
          setTargetId("")
        }, 3000)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const renderClassification = (classification?: string) => {
    const map: Record<string, { label: string; color: string }> = {
      "VALID_ERROR": { label: "Error Confirmed", color: "text-green-400" },
      "DOUBT_RESOLVED": { label: "Doubt Resolved", color: "text-blue-400" },
      "DOUBT_PLATFORM": { label: "Platform Explanation", color: "text-cyan-400" },
      "DOUBT_EXTERNAL": { label: "External Reconciliation", color: "text-purple-400" },
      "MISCONCEPTION_RESOLVED": { label: "Misconception Clarified", color: "text-amber-400" },
      "PENDING_REVIEW": { label: "Under Review", color: "text-yellow-400" },
    }
    if (!classification) return null
    const info = map[classification]
    return info ? (
      <span className={`text-xs ${info.color}`}>{info.label}</span>
    ) : null
  }

  const renderInteractionType = (type: string) => {
    if (type === "ERROR_REPORT") {
      return <span className="rounded bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">Error Report</span>
    }
    return <span className="rounded bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">Doubt</span>
  }

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h1 className="font-serif text-4xl font-bold md:text-5xl">Community Learning Hub</h1>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            A safe space for error reporting and doubt resolution. Submit corrections or ask questions to deepen understanding.
          </p>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="mt-6 saffron-btn">Submit Error or Doubt</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Submit Learning Interaction</DialogTitle>
              </DialogHeader>
              
              {submitSuccess ? (
                <div className="text-center py-6">
                  <div className="text-green-400 text-lg mb-2">Submission Received</div>
                  <p className="text-sm text-muted-foreground mb-4">{guidance}</p>
                  <p className="text-xs text-muted-foreground">You will be notified when your submission is reviewed.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">What are you submitting?</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={submissionType === "ERROR_REPORT" ? "default" : "outline"}
                        onClick={() => setSubmissionType("ERROR_REPORT")}
                        className={submissionType === "ERROR_REPORT" ? "bg-red-600 hover:bg-red-500" : ""}
                      >
                        Error Report
                      </Button>
                      <Button
                        type="button"
                        variant={submissionType === "DOUBT" ? "default" : "outline"}
                        onClick={() => setSubmissionType("DOUBT")}
                        className={submissionType === "DOUBT" ? "bg-blue-600 hover:bg-blue-500" : ""}
                      >
                        Ask a Doubt
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {submissionType === "ERROR_REPORT" 
                        ? "Report factual errors, broken code, or incorrect explanations."
                        : "Ask questions about concepts you don't understand."}
                    </p>
                  </div>

                  {submissionType === "ERROR_REPORT" && (
                    <p className="text-xs text-amber-400 bg-amber-500/10 p-2 rounded">
                      Not sure if it's an error? Consider asking as a doubt instead.
                    </p>
                  )}

                  <div>
                    <Label htmlFor="targetType">Content Type</Label>
                    <select
                      id="targetType"
                      value={targetType}
                      onChange={(e) => setTargetType(e.target.value as any)}
                      className="w-full mt-1 rounded-lg border border-[hsl(0,0%,100%,0.1)] bg-[hsl(0,0%,100%,0.05)] px-3 py-2 text-foreground"
                    >
                      <option value="blog">Blog Post</option>
                      <option value="forum">Forum Discussion</option>
                      <option value="question">Practice Question</option>
                      <option value="practice">Practice Content</option>
                    </select>
                  </div>

                  {targetType === "blog" && (
                    <div>
                      <Label htmlFor="targetId">Blog URL Slug (optional)</Label>
                      <Input
                        id="targetId"
                        value={targetId}
                        onChange={(e) => setTargetId(e.target.value)}
                        placeholder="e.g., quantum-entanglement-basics"
                        className="mt-1"
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="content">
                      {submissionType === "ERROR_REPORT" ? "Describe the error" : "Your question"}
                    </Label>
                    <Textarea
                      id="content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder={submissionType === "ERROR_REPORT" 
                        ? "Describe what you believe is incorrect and why..."
                        : "What concept or explanation do you not understand?"}
                      className="mt-1 min-h-[120px]"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-400">{error}</p>
                  )}

                  <Button 
                    onClick={handleSubmit} 
                    disabled={submitting || !content.trim()}
                    className="w-full"
                  >
                    {submitting ? "Submitting..." : "Submit"}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {loading && (
          <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
            Loading...
          </div>
        )}

        {error && !loading && (
          <div className="glass-card rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center text-red-200">
            {error}
          </div>
        )}

        {!loading && !error && interactions.length === 0 && (
          <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
            No public learning interactions yet. Be the first to contribute!
          </div>
        )}

        {!loading && !error && interactions.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Public Resolved Interactions</h2>
            {interactions.map((interaction) => (
              <article 
                key={interaction.id} 
                className="glass-card rounded-xl p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  {renderInteractionType(interaction.interactionType)}
                  {renderClassification(interaction.classification)}
                  <span className="text-xs text-muted-foreground/60">
                    {new Date(interaction.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <p className="text-foreground mb-4">{interaction.content}</p>
                
                {interaction.responses && interaction.responses.length > 0 && (
                  <div className="border-t border-[hsl(0,0%,100%,0.08)] pt-4 mt-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Response</h4>
                    {interaction.responses.map((response) => (
                      <div key={response.id} className="bg-[hsl(0,0%,100%,0.02)] rounded-lg p-3">
                        <p className="text-sm text-foreground">{response.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}