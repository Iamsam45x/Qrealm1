"use client"

import { redirect } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"

function AuthCheck({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!user) {
    redirect("/login")
  }

  return <>{children}</>
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AuthCheck>{children}</AuthCheck>
}
