"use client"

/**
 * Example: calls the FastAPI `/api/health` endpoint using the shared axios client
 * and `getApiBase()` so it always targets `NEXT_PUBLIC_API_URL`.
 */
import { useEffect, useState } from "react"
import { apiClient, getApiBase } from "@/lib/api"

export function BackendHealthExample() {
  const [label, setLabel] = useState<string>("Checking API…")

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const base = getApiBase()
        const res = await apiClient.get(`${base}/health`)
        if (cancelled) return
        if (res.status === 200 && res.data?.status === "healthy") {
          setLabel(`Backend OK (${base})`)
        } else {
          setLabel(`Backend: ${res.data?.status ?? res.status}`)
        }
      } catch (e) {
        if (!cancelled) {
          setLabel(`Backend unreachable (${e instanceof Error ? e.message : "error"})`)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <p className="text-xs text-muted-foreground" suppressHydrationWarning>
      {label}
    </p>
  )
}
