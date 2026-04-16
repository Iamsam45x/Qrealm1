"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { listReports, type Blog } from "@/lib/api"

export default function ReportsPage() {
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const result = await listReports({ page: 1, limit: 20 })
        if (!mounted) return
        if (result.success) {
          setBlogs(result.data.items)
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

  const renderExcerpt = (content: string) => {
    const clean = content.replace(/\s+/g, " ").trim()
    if (clean.length <= 200) return clean
    return `${clean.slice(0, 200)}...`
  }

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h1 className="font-serif text-4xl font-bold md:text-5xl">
            Flagship Reports
          </h1>
          <p className="mt-4 text-muted-foreground">
            Curated intellectual outputs for deep study
          </p>
        </div>

        {loading && (
          <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
            Loading reports...
          </div>
        )}

        {error && (
          <div className="glass-card rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center text-red-200">
            {error}
          </div>
        )}

        {!loading && !error && blogs.length === 0 && (
          <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
            No reports available yet.
          </div>
        )}

        {!loading && !error && blogs.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2">
            {blogs.map((post, i) => (
              <article
                key={post.id}
                className="glass-card group flex flex-col rounded-xl p-6 transition-all duration-300 hover:border-saffron-500/30"
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded bg-saffron-500/10 px-2 py-0.5 text-xs font-medium text-saffron-400">
                    REPORT
                  </span>
                  <span className="text-xs text-muted-foreground/60">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h2 className="font-serif text-xl font-semibold text-foreground transition-colors group-hover:text-saffron-300">
                  {post.title}
                </h2>

                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {renderExcerpt(post.content)}
                </p>

                <div className="mt-4 text-xs text-muted-foreground/60">
                  By {post.author?.name ?? "Unknown"}
                </div>

                <div className="mt-4">
                  <Link
                    href={`/blogs/${post.slug}`}
                    className="saffron-underline inline-flex items-center gap-2 text-sm font-medium text-saffron-400"
                  >
                    Read Full Report
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}