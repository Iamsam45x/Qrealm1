"use client"

import { useEffect, useState } from "react"
import { getAdminAnalytics } from "@/lib/api"

interface Analytics {
  users: number
  blogs: number
  forums: number
  comments: number
  likes: number
  interactions: number
  reports: number
}

export default function AdminDashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAnalytics() {
      const result = await getAdminAnalytics()
      if (result.success && result.data) {
        setAnalytics(result.data)
      }
      setLoading(false)
    }
    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading analytics...</div>
      </div>
    )
  }

  const stats = [
    { label: "Users", value: analytics?.users ?? 0, icon: "👥", color: "text-blue-400" },
    { label: "Blogs", value: analytics?.blogs ?? 0, icon: "📝", color: "text-saffron-400" },
    { label: "Forums", value: analytics?.forums ?? 0, icon: "💬", color: "text-green-400" },
    { label: "Comments", value: analytics?.comments ?? 0, icon: "💭", color: "text-purple-400" },
    { label: "Likes", value: analytics?.likes ?? 0, icon: "❤️", color: "text-red-400" },
    { label: "Interactions", value: analytics?.interactions ?? 0, icon: "💡", color: "text-cyan-400" },
    { label: "Reports", value: analytics?.reports ?? 0, icon: "🚨", color: "text-orange-400" },
  ]

  return (
    <div>
      <h2 className="font-serif text-xl font-semibold text-foreground mb-6">Overview</h2>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="glass-card rounded-xl p-6"
          >
            <div className="flex items-center gap-4">
              <span className="text-3xl">{stat.icon}</span>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className={`text-3xl font-bold ${stat.color}`}>{stat.value.toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="glass-card rounded-xl p-6">
          <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <a
              href="/admin/users"
              className="block p-3 rounded-lg bg-[hsl(0,0%,100%,0.03)] hover:bg-[hsl(0,0%,100%,0.06)] transition-colors"
            >
              <p className="font-medium text-foreground">Manage Users</p>
              <p className="text-sm text-muted-foreground">View, edit roles, or remove users</p>
            </a>
            <a
              href="/admin/blogs"
              className="block p-3 rounded-lg bg-[hsl(0,0%,100%,0.03)] hover:bg-[hsl(0,0%,100%,0.06)] transition-colors"
            >
              <p className="font-medium text-foreground">Moderate Blogs</p>
              <p className="text-sm text-muted-foreground">Hide, feature, or delete blog posts</p>
            </a>
            <a
              href="/admin/forums"
              className="block p-3 rounded-lg bg-[hsl(0,0%,100%,0.03)] hover:bg-[hsl(0,0%,100%,0.06)] transition-colors"
            >
              <p className="font-medium text-foreground">Moderate Forums</p>
              <p className="text-sm text-muted-foreground">Hide or manage forum discussions</p>
            </a>
            <a
              href="/admin/learning"
              className="block p-3 rounded-lg bg-[hsl(0,0%,100%,0.03)] hover:bg-[hsl(0,0%,100%,0.06)] transition-colors"
            >
              <p className="font-medium text-foreground">Edit Learning Content</p>
              <p className="text-sm text-muted-foreground">Manage quantum physics & computing modules</p>
            </a>
            <a
              href="/admin/interactions"
              className="block p-3 rounded-lg bg-[hsl(0,0%,100%,0.03)] hover:bg-[hsl(0,0%,100%,0.06)] transition-colors"
            >
              <p className="font-medium text-foreground">Learning Interactions</p>
              <p className="text-sm text-muted-foreground">Error reports & doubts</p>
            </a>
            <a
              href="/admin/reports"
              className="block p-3 rounded-lg bg-[hsl(0,0%,100%,0.03)] hover:bg-[hsl(0,0%,100%,0.06)] transition-colors"
            >
              <p className="font-medium text-foreground">Review Reports</p>
              <p className="text-sm text-muted-foreground">Handle user-submitted content reports</p>
            </a>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <h3 className="font-semibold text-foreground mb-4">System Info</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Environment</span>
              <span className="text-foreground">Production</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Database</span>
              <span className="text-green-400">Connected</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">API Status</span>
              <span className="text-green-400">Online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}