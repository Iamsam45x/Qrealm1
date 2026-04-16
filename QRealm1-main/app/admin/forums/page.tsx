"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { listAllForums, moderateContent, type Forum } from "@/lib/api"

export default function AdminForumsPage() {
  const [forums, setForums] = useState<Forum[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const limit = 20

  useEffect(() => {
    async function fetchForums() {
      setLoading(true)
      const result = await listAllForums({ page, limit })
      if (result.success && result.data) {
        setForums(result.data.items)
        setTotal(result.data.total)
      }
      setLoading(false)
    }
    fetchForums()
  }, [page])

  async function handleToggleHide(forumId: string) {
    setActionLoading(forumId)
    const result = await moderateContent("forum", forumId)
    if (result.success && result.data) {
      setForums(forums.map(f => f.id === forumId ? { ...f, isHidden: result.data!.isHidden } : f))
    }
    setActionLoading(null)
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-xl font-semibold text-foreground">Forums</h2>
        <p className="text-sm text-muted-foreground">{total} total forums</p>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-[hsl(0,0%,100%,0.08)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Author</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Stats</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(0,0%,100%,0.08)]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading...</td>
                </tr>
              ) : forums.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No forums found</td>
                </tr>
              ) : (
                forums.map((forum) => (
                  <tr key={forum.id} className="hover:bg-[hsl(0,0%,100%,0.02)]">
                    <td className="px-4 py-3">
                      <Link href={`/forums/${forum.id}`} className="text-foreground hover:text-saffron-400 font-medium">
                        {forum.title}
                      </Link>
                      <div className="text-xs text-muted-foreground truncate max-w-xs">{forum.content.substring(0, 60)}...</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-foreground text-sm">{forum.author?.name}</span>
                      <div className="text-xs text-muted-foreground">{forum.author?.role}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {forum.isHidden && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">Hidden</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      <span>{forum._count?.comments ?? 0} comments</span>
                      <span className="ml-2">{forum._count?.likes ?? 0} likes</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleHide(forum.id)}
                        disabled={actionLoading === forum.id}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {forum.isHidden ? "Show" : "Hide"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[hsl(0,0%,100%,0.08)]">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}