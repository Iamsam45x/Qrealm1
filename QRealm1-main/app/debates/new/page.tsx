"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { listBlogs, createDebate, type Blog } from "@/lib/api"
import { useAuth } from "@/components/auth/auth-provider"

export default function NewDebatePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [blogAId, setBlogAId] = useState("")
  const [blogBId, setBlogBId] = useState("")
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    
    if (!user) {
      setError("Please login to create a debate")
      return
    }
    
    if (user.role !== "RESEARCHER" && user.role !== "PROFESSOR" && user.role !== "ADMIN") {
      setError("Only researchers, professors, and admins can create debates")
      return
    }
    
    async function loadBlogs() {
      try {
        const result = await listBlogs({ page: 1, limit: 50 })
        if (result.success) {
          setBlogs(result.data.items.filter(b => b.published))
        }
      } catch (err) {
        console.error("Failed to load blogs", err)
      } finally {
        setLoading(false)
      }
    }
    
    void loadBlogs()
  }, [user, authLoading])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!title.trim() || !blogAId || !blogBId) {
      setError("Please fill in all required fields")
      return
    }
    
    if (blogAId === blogBId) {
      setError("Please select two different blogs")
      return
    }
    
    setSubmitting(true)
    setError(null)
    
    try {
      const result = await createDebate({
        title: title.trim(),
        description: description.trim() || undefined,
        blogAId,
        blogBId
      })
      
      if (!result.success) {
        throw new Error(result.error)
      }
      
      router.push("/debates")
    } catch (err) {
      setError((err as Error).message || "Failed to create debate")
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
            Loading...
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <div className="glass-card rounded-xl p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Login Required</h1>
            <p className="text-muted-foreground mb-4">Please login to create a debate.</p>
            <Button asChild>
              <a href="/login">Login</a>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (user.role !== "RESEARCHER" && user.role !== "PROFESSOR" && user.role !== "ADMIN") {
    return (
      <div className="min-h-screen px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <div className="glass-card rounded-xl p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Access Restricted</h1>
            <p className="text-muted-foreground">Only researchers, professors, and admins can create debates.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-3xl font-bold text-center mb-8">
          Create New Debate
        </h1>
        
        <form onSubmit={onSubmit} className="glass-card rounded-xl p-6 space-y-6">
          <div>
            <Label htmlFor="title">Debate Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Copenhagen vs Many-Worlds Interpretation"
              className="mt-2"
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the debate topic..."
              className="mt-2"
              rows={3}
            />
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="blogA">Option A (Blog 1)</Label>
              <select
                id="blogA"
                value={blogAId}
                onChange={(e) => setBlogAId(e.target.value)}
                className="mt-2 w-full rounded-lg border border-[hsl(0,0%,100%,0.1)] bg-[hsl(0,0%,100%,0.05)] px-3 py-2 text-foreground"
              >
                <option value="">Select a blog...</option>
                {blogs.filter(b => b.id !== blogBId).map((blog) => (
                  <option key={blog.id} value={blog.id}>
                    {blog.title.slice(0, 50)}...
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <Label htmlFor="blogB">Option B (Blog 2)</Label>
              <select
                id="blogB"
                value={blogBId}
                onChange={(e) => setBlogBId(e.target.value)}
                className="mt-2 w-full rounded-lg border border-[hsl(0,0%,100%,0.1)] bg-[hsl(0,0%,100%,0.05)] px-3 py-2 text-foreground"
              >
                <option value="">Select a blog...</option>
                {blogs.filter(b => b.id !== blogAId).map((blog) => (
                  <option key={blog.id} value={blog.id}>
                    {blog.title.slice(0, 50)}...
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}
          
          <div className="flex gap-4">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Debate"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}