"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { listAllBlogs, moderateContent, setFlagship, type Blog } from "@/lib/api"

export default function AdminBlogsPage() {
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const limit = 20

  useEffect(() => {
    async function fetchBlogs() {
      setLoading(true)
      const result = await listAllBlogs({ page, limit })
      if (result.success && result.data) {
        setBlogs(result.data.items)
        setTotal(result.data.total)
      }
      setLoading(false)
    }
    fetchBlogs()
  }, [page])

  async function handleToggleHide(blogId: string) {
    setActionLoading(blogId)
    const result = await moderateContent("blog", blogId)
    if (result.success && result.data) {
      setBlogs(blogs.map(b => b.id === blogId ? { ...b, isHidden: result.data!.isHidden } : b))
    }
    setActionLoading(null)
  }

  async function handleSetFlagship(blogId: string) {
    setActionLoading(blogId)
    const result = await setFlagship(blogId)
    if (result.success && result.data) {
      setBlogs(blogs.map(b => b.id === blogId ? { ...b, isFlagship: true } : b))
    }
    setActionLoading(null)
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-xl font-semibold text-foreground">Blogs</h2>
        <p className="text-sm text-muted-foreground">{total} total blogs</p>
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
              ) : blogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No blogs found</td>
                </tr>
              ) : (
                blogs.map((blog) => (
                  <tr key={blog.id} className="hover:bg-[hsl(0,0%,100%,0.02)]">
                    <td className="px-4 py-3">
                      <Link href={`/blogs/${blog.slug}`} className="text-foreground hover:text-saffron-400 font-medium">
                        {blog.title}
                      </Link>
                      <div className="text-xs text-muted-foreground truncate max-w-xs">{blog.content.substring(0, 60)}...</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-foreground text-sm">{blog.author?.name}</span>
                      <div className="text-xs text-muted-foreground">{blog.author?.role}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {blog.isHidden && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">Hidden</span>
                        )}
                        {blog.isFlagship && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-saffron-500/20 text-saffron-400">Flagship</span>
                        )}
                        {blog.published ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400">Published</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-500/20 text-gray-400">Draft</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      <span>{blog._count?.comments ?? 0} comments</span>
                      <span className="ml-2">{blog._count?.likes ?? 0} likes</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleHide(blog.id)}
                          disabled={actionLoading === blog.id}
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {blog.isHidden ? "Show" : "Hide"}
                        </button>
                        {!blog.isFlagship && (
                          <button
                            onClick={() => handleSetFlagship(blog.id)}
                            disabled={actionLoading === blog.id}
                            className="text-sm text-saffron-400 hover:text-saffron-300 transition-colors"
                          >
                            Set Flagship
                          </button>
                        )}
                      </div>
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