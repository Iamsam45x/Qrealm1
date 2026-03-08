"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createForum } from "@/lib/api"

export default function NewForumPage() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await createForum({ title, content })
      if (!result.success) {
        throw new Error(result.error)
      }
      router.push(`/forums/${result.data.id}`)
    } catch (err) {
      setError((err as Error).message || "Failed to create forum")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:py-24">
      <h1 className="font-serif text-3xl font-bold text-foreground">
        New Forum Thread
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Start a new discussion with a clear question or thesis.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Title
          </label>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-2"
            required
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Content
          </label>
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="mt-2 min-h-[220px]"
            required
          />
        </div>

        {error && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading}>
          {loading ? "Publishing..." : "Create Thread"}
        </Button>
      </form>
    </div>
  )
}
