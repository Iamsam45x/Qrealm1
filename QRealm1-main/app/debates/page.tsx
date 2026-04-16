"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { listDebates, voteDebate, type Debate } from "@/lib/api"
import { useAuth } from "@/components/auth/auth-provider"

function DebateCard({ debate, onVote }: { debate: Debate; onVote: (id: string, vote: "A" | "B") => void }) {
  const { user } = useAuth()
  const canVote = user?.role === "RESEARCHER" || user?.role === "PROFESSOR" || user?.role === "ADMIN"

  return (
    <article className="glass-card flex flex-col rounded-xl p-6">
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded bg-saffron-500/10 px-2 py-0.5 text-xs font-medium text-saffron-400">
          DEBATE
        </span>
        <span className="text-xs text-muted-foreground/60">
          {new Date(debate.createdAt).toLocaleDateString()}
        </span>
      </div>

      {debate.title && (
        <h3 className="font-serif text-lg font-semibold text-foreground">
          {debate.title}
        </h3>
      )}

      {debate.description && (
        <p className="mt-2 text-sm text-muted-foreground">
          {debate.description}
        </p>
      )}

      <div className="mt-4 flex gap-4">
        <div className="flex-1 rounded-lg bg-saffron-500/5 p-3 text-center">
          <div className="text-2xl font-bold text-saffron-400">
            {debate.voteCounts?.A ?? 0}
          </div>
          <div className="text-xs text-muted-foreground">Vote A</div>
          {canVote && (
            <button
              onClick={() => onVote(debate.id, "A")}
              className="mt-2 rounded bg-saffron-600 px-3 py-1 text-xs font-medium text-white hover:bg-saffron-500"
            >
              Vote A
            </button>
          )}
        </div>

        <div className="flex-1 rounded-lg bg-saffron-500/5 p-3 text-center">
          <div className="text-2xl font-bold text-saffron-400">
            {debate.voteCounts?.B ?? 0}
          </div>
          <div className="text-xs text-muted-foreground">Vote B</div>
          {canVote && (
            <button
              onClick={() => onVote(debate.id, "B")}
              className="mt-2 rounded bg-saffron-600 px-3 py-1 text-xs font-medium text-white hover:bg-saffron-500"
            >
              Vote B
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

export default function DebatesPage() {
  const [debates, setDebates] = useState<Debate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [voting, setVoting] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const result = await listDebates({ page: 1, limit: 20 })
        if (!mounted) return
        if (result.success) {
          setDebates(result.data.items)
        } else {
          setError(result.error)
        }
      } catch (err) {
        if (!mounted) return
        setError((err as Error).message)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => { mounted = false }
  }, [])

  const handleVote = async (debateId: string, vote: "A" | "B") => {
    setVoting(debateId)
    try {
      const result = await voteDebate(debateId, vote)
      if (result.success) {
        setDebates(prev => prev.map(d => 
          d.id === debateId 
            ? { 
                ...d, 
                voteCounts: { 
                  ...d.voteCounts, 
                  [vote]: (d.voteCounts?.[vote] ?? 0) + 1 
                } 
              }
            : d
        ))
      }
    } finally {
      setVoting(null)
    }
  }

  const canCreateDebate = user?.role === "RESEARCHER" || user?.role === "PROFESSOR" || user?.role === "ADMIN"

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 flex flex-col items-center gap-4">
          <h1 className="font-serif text-4xl font-bold md:text-5xl">
            Battle of Interpretations
          </h1>
          <p className="text-muted-foreground">
            Compare intellectual positions through structured debate
          </p>
          {canCreateDebate && (
            <Link href="/debates/new" className="saffron-btn text-sm">
              + Create Debate
            </Link>
          )}
        </div>

        {loading && (
          <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
            Loading debates...
          </div>
        )}

        {error && (
          <div className="glass-card rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center text-red-200">
            {error}
          </div>
        )}

        {!loading && !error && debates.length === 0 && (
          <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
            No active debates.{canCreateDebate && " "}
            {canCreateDebate && (
              <Link href="/debates/new" className="text-saffron-400 hover:underline">
                Create one to start the discourse.
              </Link>
            )}
          </div>
        )}

        {!loading && !error && debates.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2">
            {debates.map(debate => (
              <DebateCard key={debate.id} debate={debate} onVote={handleVote} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}