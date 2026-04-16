"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { verifyOTP, resendOTP } from "@/lib/api"

function VerifyPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const emailFromUrl = searchParams.get("email") || ""
  const justRegistered = searchParams.get("registered")
  
  const [email, setEmail] = useState(emailFromUrl)
  const [otp, setOtp] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [showEmailInput, setShowEmailInput] = useState(!emailFromUrl)

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !otp) {
      setError("Please enter both email and verification code")
      return
    }
    setError(null)
    setLoading(true)
    try {
      const result = await verifyOTP(email, otp)
      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push("/login?verified=true")
        }, 2000)
      } else {
        setError(result.error || "Invalid verification code")
      }
    } catch {
      setError("Verification failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (!email) {
      setResendMessage("Please enter your email first")
      return
    }
    setResending(true)
    setResendMessage(null)
    try {
      const result = await resendOTP(email)
      if (result.success) {
        setResendMessage("New code sent! Check your email.")
      } else {
        setResendMessage(result.error || "Failed to resend code")
      }
    } catch {
      setResendMessage("Failed to resend code")
    } finally {
      setResending(false)
    }
  }

  if (success) {
    return (
      <div className="mt-8 text-center">
        <div className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-4 text-green-200">
          <p className="text-lg font-semibold">Email verified!</p>
          <p className="mt-1 text-sm">You can now login to your account.</p>
          <p className="mt-2 text-sm">Redirecting you to login...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <form onSubmit={handleVerify} className="mt-8 space-y-4">
        {showEmailInput && (
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Email Address
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2"
              placeholder="you@example.com"
              required
            />
          </div>
        )}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Verification Code
          </label>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">
            Enter the 6-digit code sent to your email
          </p>
          <Input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="text-center text-2xl tracking-[0.5em] font-mono"
            placeholder="000000"
            maxLength={6}
            required
            autoFocus={!showEmailInput}
          />
        </div>
        {error && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}
        {resendMessage && (
          <p className={`rounded-md border px-3 py-2 text-sm ${
            resendMessage.includes("sent") 
              ? "border-green-500/30 bg-green-500/10 text-green-200"
              : "border-yellow-500/30 bg-yellow-500/10 text-yellow-200"
          }`}>
            {resendMessage}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
          {loading ? "Verifying..." : "Verify Email"}
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="text-saffron-400 hover:text-saffron-300 disabled:opacity-50"
        >
          {resending ? "Sending..." : "Didn't receive a code? Resend"}
        </button>
        <Link href="/login" className="text-muted-foreground hover:text-foreground">
          Back to login
        </Link>
      </div>
    </>
  )
}

function VerifyContent() {
  const searchParams = useSearchParams()
  const justRegistered = searchParams.get("registered")

  return (
    <div className="mx-auto max-w-md px-4 py-16 md:py-24">
      <h1 className="font-serif text-3xl font-bold text-foreground">Verify Your Email</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter the verification code sent to your email.
      </p>
      {justRegistered && (
        <p className="mt-4 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-200">
          Account created! Check your email for the verification code.
        </p>
      )}
      <div className="mt-4 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-200">
        <p><strong>Note:</strong> If you didn't receive an email, use the resend button below to get a new code.</p>
      </div>
      <VerifyPageContent />
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-16 text-center">Loading...</div>}>
      <VerifyContent />
    </Suspense>
  )
}
