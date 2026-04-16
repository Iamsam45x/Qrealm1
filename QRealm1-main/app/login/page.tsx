"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/components/auth/auth-provider"
import { forgotPassword as forgotPasswordApi } from "@/lib/api"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [remember, setRemember] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("")
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false)
  const [error, setError] = useState<React.ReactNode>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password, remember)
      const next = searchParams.get("next")
      router.push(next || "/")
    } catch (err: unknown) {
      const errorMessage = (err as Error).message || "Login failed"
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (showForgotPassword) {
    return (
      <div className="mt-8 space-y-4">
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setLoading(true)
            setError(null)
            try {
              const data = await forgotPasswordApi(forgotPasswordEmail)
              if (data.success) {
                setForgotPasswordSent(true)
              } else {
                setError(data.error || "Failed to send reset email")
              }
            } catch {
              setError("Failed to send reset email")
            } finally {
              setLoading(false)
            }
          }}
          className="space-y-4"
        >
          <p className="text-sm text-muted-foreground">
            Enter your email address and we will send you a link to reset your password.
          </p>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Email
            </label>
            <Input
              type="email"
              value={forgotPasswordEmail}
              onChange={(e) => setForgotPasswordEmail(e.target.value)}
              className="mt-2"
              placeholder="you@example.com"
              required
            />
          </div>
          {error && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}
          {forgotPasswordSent && (
            <p className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-200">
              Password reset link sent! Check your email.
            </p>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForgotPassword(false)}
              className="flex-1"
            >
              Back
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || forgotPasswordSent}>
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Email
          </label>
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2"
            required
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Password
            </label>
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-xs text-saffron-400 hover:text-saffron-300"
            >
              Forgot Password?
            </button>
          </div>
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2"
            required
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-gray-700 bg-background accent-saffron-400"
          />
          Remember me
        </label>
        {error && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Login"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/register" className="text-saffron-400 hover:text-saffron-300">
          Create an account
        </Link>
      </p>
    </>
  )
}

function LoginPageContent() {
  const searchParams = useSearchParams()
  const justRegistered = searchParams.get("registered")

  return (
    <div className="mx-auto max-w-md px-4 py-16 md:py-24">
      <h1 className="font-serif text-3xl font-bold text-foreground">Login</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Continue the discourse with your account.
      </p>
      {justRegistered && (
        <p className="mt-4 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-200">
          Account created successfully! You can now login.
        </p>
      )}
      <LoginForm />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-16 md:py-24 text-center">Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  )
}
