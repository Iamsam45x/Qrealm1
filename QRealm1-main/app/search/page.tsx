"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { searchContent, type Blog, type Forum } from "@/lib/api"

function SearchPageContent() {
  const searchParams = useSearchParams()
  const q = searchParams.get("q") || ""
  
  const [results, setResults] = useState<(Blog | Forum)[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState(q)
  const [searchType, setSearchType] = useState<"blog" | "forum">("blog")

  useEffect(() => {
    if (!q) return
    
    let mounted = true
    async function performSearch() {
      setLoading(true)
      try {
        const result = await searchContent(q, searchType)
        if (!mounted) return
        if (result.success) {
          setResults(result.data.items)
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
    void performSearch()
    return () => { mounted = false }
  }, [q, searchType])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    
    const url = new URL(window.location.href)
    url.searchParams.set("q", searchQuery.trim())
    window.history.pushState({}, "", url.toString())
    
    void performSearch(searchQuery.trim(), searchType)
  }

  const performSearch = async (query: string, type: "blog" | "forum") => {
    setLoading(true)
    setError(null)
    try {
      const result = await searchContent(query, type)
      if (result.success) {
        setResults(result.data.items)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const isBlog = (item: Blog | Forum): item is Blog => "slug" in item

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-center">
            Search
          </h1>
        </div>

        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search intellectual discourse..."
              className="flex-1 rounded-lg border border-[hsl(0,0%,100%,0.1)] bg-[hsl(0,0%,100%,0.05)] px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-saffron-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-saffron-600 px-6 py-3 font-medium text-white hover:bg-saffron-500"
            >
              Search
            </button>
          </div>
          
          <div className="mt-3 flex gap-4 text-sm">
            <label className="flex items-center gap-2 text-muted-foreground">
              <input
                type="radio"
                name="searchType"
                value="blog"
                checked={searchType === "blog"}
                onChange={() => setSearchType("blog")}
              />
              Blogs
            </label>
            <label className="flex items-center gap-2 text-muted-foreground">
              <input
                type="radio"
                name="searchType"
                value="forum"
                checked={searchType === "forum"}
                onChange={() => setSearchType("forum")}
              />
              Forums
            </label>
          </div>
        </form>

        {loading && (
          <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
            Searching...
          </div>
        )}

        {error && (
          <div className="glass-card rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center text-red-200">
            {error}
          </div>
        )}

        {!loading && !error && results.length === 0 && q && (
          <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
            No results found for &ldquo;{q}&rdquo;
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <div className="space-y-4">
            {results.map((item, i) => (
              <article
                key={item.id}
                className="glass-card flex flex-col rounded-xl p-5"
              >
                <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground/60">
                  {isBlog(item) ? (
                    <>
                      <span className="text-saffron-400">BLOG</span>
                      <span>·</span>
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-blue-400">FORUM</span>
                      <span>·</span>
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </>
                  )}
                </div>

                {isBlog(item) ? (
                  <Link href={`/blogs/${item.slug}`} className="block">
                    <h3 className="font-serif text-lg font-semibold text-foreground hover:text-saffron-300">
                      {item.title}
                    </h3>
                  </Link>
                ) : (
                  <Link href={`/forums/${item.id}`} className="block">
                    <h3 className="font-serif text-lg font-semibold text-foreground hover:text-saffron-300">
                      {item.title}
                    </h3>
                  </Link>
                )}

                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                  {item.content.slice(0, 200)}...
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen px-4 py-12 text-center text-muted-foreground">Loading search...</div>}>
      <SearchPageContent />
    </Suspense>
  )
}