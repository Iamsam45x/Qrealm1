"use client"

import { useEffect } from "react"

export default function ForumError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="font-serif text-2xl font-bold text-foreground">
        Failed to load forum
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 saffron-btn text-sm"
      >
        Try again
      </button>
    </div>
  )
}
