"use client"

import Link from "next/link"
import { useAuth } from "@/components/auth/auth-provider"

export default function AccountPage() {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:py-24">
      <h1 className="font-serif text-3xl font-bold text-foreground">Account</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Manage your profile and contributions.
      </p>

      <div className="mt-8 rounded-2xl border border-[hsl(0,0%,100%,0.08)] bg-[hsl(0,0%,100%,0.02)] p-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Name
        </p>
        <p className="mt-2 text-lg text-foreground">{user.name}</p>

        <p className="mt-6 text-xs uppercase tracking-wider text-muted-foreground">
          Email
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{user.email}</p>

        <p className="mt-6 text-xs uppercase tracking-wider text-muted-foreground">
          Role
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{user.role}</p>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/blogs/new"
          className="saffron-btn text-sm"
        >
          New Blog
        </Link>
        <Link
          href="/forums/new"
          className="saffron-btn text-sm"
        >
          New Forum Thread
        </Link>
      </div>
    </div>
  )
}
