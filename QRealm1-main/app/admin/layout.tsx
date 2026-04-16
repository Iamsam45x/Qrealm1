"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth/auth-provider"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

const adminNavItems = [
  { label: "Dashboard", href: "/admin", icon: "📊" },
  { label: "Users", href: "/admin/users", icon: "👥" },
  { label: "Blogs", href: "/admin/blogs", icon: "📝" },
  { label: "Forums", href: "/admin/forums", icon: "💬" },
  { label: "Learning", href: "/admin/learning", icon: "📚" },
  { label: "Interactions", href: "/admin/interactions", icon: "💡" },
  { label: "Reports", href: "/admin/reports", icon: "🚨" },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) {
      router.push("/")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#111111]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!user || user.role !== "ADMIN") {
    return null
  }

  return (
    <div className="min-h-screen bg-[#111111]">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-serif text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Site
          </Link>
        </div>

        <div className="flex gap-8">
          <aside className="w-56 shrink-0">
            <nav className="sticky top-24 space-y-1">
              {adminNavItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all",
                      isActive
                        ? "bg-saffron-500/10 text-saffron-400"
                        : "text-muted-foreground hover:bg-[hsl(0,0%,100%,0.05)] hover:text-foreground"
                    )}
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </aside>

          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  )
}