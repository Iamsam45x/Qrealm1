"use client"

import React, { useState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export function WritingPad() {
  const [title, setTitle] = useState("")
  const [subtitle, setSubtitle] = useState("")
  const [content, setContent] = useState("")
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="glass rounded-lg p-8 text-center md:p-12">
        <div className="mx-auto max-w-md">
          <h3 className="font-serif text-xl font-semibold text-foreground">
            Thank you for your submission.
          </h3>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            This content requires up to 72 hours for verification before it is
            reviewed and published.
          </p>
          <Separator className="mx-auto my-6 w-16 bg-primary/20" />
          <p className="text-sm text-muted-foreground">
            Your submission has been marked as{" "}
            <span className="font-medium text-primary">
              Pending Verification
            </span>
            . Only verified content appears in public sections.
          </p>
          <Button
            className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => {
              setTitle("")
              setSubtitle("")
              setContent("")
              setSubmitted(false)
            }}
          >
            Write Another
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="glass rounded-lg p-6 md:p-8"
    >
      <h3 className="font-serif text-lg font-semibold text-foreground">
        Writing Pad
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Compose your contribution in a distraction-free environment.
      </p>

      <Separator className="my-6 bg-border" />

      <div className="flex flex-col gap-5">
        <div>
          <label
            htmlFor="pad-title"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Title <span className="text-primary">*</span>
          </label>
          <Input
            id="pad-title"
            placeholder="Enter your title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border-border bg-background font-serif text-lg text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
            required
          />
        </div>

        <div>
          <label
            htmlFor="pad-subtitle"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Subtitle{" "}
            <span className="text-xs text-muted-foreground">(optional)</span>
          </label>
          <Input
            id="pad-subtitle"
            placeholder="Optional subtitle"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className="border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
          />
        </div>

        <div>
          <label
            htmlFor="pad-content"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Content <span className="text-primary">*</span>
          </label>
          <Textarea
            id="pad-content"
            placeholder="Write your thoughts, analysis, or questions here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            className="border-border bg-background leading-relaxed text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
            required
          />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Submissions require verification before publication.
          </p>
          <Button
            type="submit"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Submit for Review
          </Button>
        </div>
      </div>
    </form>
  )
}
