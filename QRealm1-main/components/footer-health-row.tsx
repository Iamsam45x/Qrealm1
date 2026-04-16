"use client"

import { BackendHealthExample } from "@/components/backend-health-example"

/** Renders the API health example only in development to avoid extra requests in production. */
export function FooterHealthRow() {
  if (process.env.NODE_ENV !== "development") {
    return null
  }
  return (
    <div className="mt-4">
      <BackendHealthExample />
    </div>
  )
}
