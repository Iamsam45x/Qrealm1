"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useRouter } from "next/navigation"
import type { User } from "@/lib/api"
import {
  getMe,
  getApiBase,
  setClientAccessToken,
  isBrowser,
} from "@/lib/api"
import {
  auth,
  signIn,
  signUp,
  signOut as firebaseSignOut,
  onAuthChange,
  getIdToken,
  type FirebaseUser,
} from "@/lib/firebase"

type RegisterInput = {
  name: string
  email: string
  password: string
  confirmPassword: string
  userType: "STUDENT" | "RESEARCHER"
  bio?: string
  studentFields?: {
    institution: string
    course: string
    yearOfStudy: string
    studentId?: string
  }
  researcherFields?: {
    institution: string
    fieldOfResearch: string
    yearsOfExperience: number
    researchProfile?: string
  }
}

type RegisterResult = 
  | { success: true; data: { message: string; userId: string; firebaseUid: string } }
  | { success: false; error: string }

type AuthContextValue = {
  user: User | null
  loading: boolean
  refresh: () => Promise<boolean>
  login: (email: string, password: string, remember?: boolean) => Promise<void>
  register: (input: RegisterInput) => Promise<RegisterResult>
  logout: () => Promise<void>
  firebaseUser: FirebaseUser | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

const TOKEN_KEY = "firebase_token"
const FIREBASE_UID_KEY = "firebase_uid"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  const syncUserWithBackend = useCallback(async (fbUser: FirebaseUser) => {
    try {
      const token = await getIdToken(fbUser)
      if (token) {
        setClientAccessToken(token)
        localStorage.setItem(TOKEN_KEY, token)
        localStorage.setItem(FIREBASE_UID_KEY, fbUser.uid)
      }
      
      const result = await getMe()
      if (result.success && result.data?.user) {
        setUser(result.data.user)
        return true
      }
      return false
    } catch (error) {
      console.error("Failed to sync user with backend:", error)
      return false
    }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      if (!firebaseUser) {
        setUser(null)
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(FIREBASE_UID_KEY)
        return false
      }
      
      return await syncUserWithBackend(firebaseUser)
    } catch (error) {
      setUser(null)
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(FIREBASE_UID_KEY)
      return false
    } finally {
      setLoading(false)
    }
  }, [firebaseUser, syncUserWithBackend])

  useEffect(() => {
    const unsubscribe = onAuthChange(async (fbUser) => {
      setFirebaseUser(fbUser)
      
      if (fbUser) {
        await syncUserWithBackend(fbUser)
      } else {
        setUser(null)
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(FIREBASE_UID_KEY)
        setClientAccessToken(null)
      }
      
      setLoading(false)
      setInitialized(true)
    })

    return () => unsubscribe()
  }, [syncUserWithBackend])

  useEffect(() => {
    if (!isBrowser()) return
    
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && firebaseUser) {
        const token = await getIdToken(firebaseUser)
        if (token) {
          setClientAccessToken(token)
          localStorage.setItem(TOKEN_KEY, token)
        }
      }
    }
    
    const handleFocus = async () => {
      if (firebaseUser) {
        const token = await getIdToken(firebaseUser)
        if (token) {
          setClientAccessToken(token)
          localStorage.setItem(TOKEN_KEY, token)
        }
      }
    }
    
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
    }
  }, [firebaseUser])

  const login = useCallback(
    async (email: string, password: string, remember = false) => {
      try {
        const fbUser = await signIn(email, password)
        const synced = await syncUserWithBackend(fbUser)
        
        if (!synced) {
          throw new Error("Failed to sync user with backend. Please complete your registration.")
        }
        
        router.refresh()
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Login failed"
        if (message.includes("user-not-found") || message.includes("wrong-password") || message.includes("invalid-credential")) {
          throw new Error("Invalid email or password")
        }
        throw new Error(message)
      }
    },
    [router, syncUserWithBackend]
  )

  const register = useCallback(async (input: RegisterInput): Promise<RegisterResult> => {
    try {
      const fbUser = await signUp(input.email, input.password)
      const token = await getIdToken(fbUser)
      
      if (token) {
        setClientAccessToken(token)
        localStorage.setItem(TOKEN_KEY, token)
        localStorage.setItem(FIREBASE_UID_KEY, fbUser.uid)
      }
      
      const response = await fetch(`${getApiBase()}/auth/register-firebase`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          firebase_uid: fbUser.uid,
          name: input.name.trim(),
          email: input.email.trim().toLowerCase(),
          userType: input.userType,
          bio: input.bio,
          studentFields: input.studentFields,
          researcherFields: input.researcherFields,
        }),
      })
      
      const result = await response.json() as { success: boolean; data?: { message: string; userId: string }; error?: string }
      
      if (!result.success) {
        await fbUser.delete()
        return {
          success: false as const,
          error: result.error || "Registration failed",
        } as RegisterResult
      }
      
      await syncUserWithBackend(fbUser)
      router.refresh()
      
      const resultData: { message: string; userId: string; firebaseUid: string } = {
        message: result.data?.message || "Registration successful",
        userId: result.data?.userId || fbUser.uid,
        firebaseUid: fbUser.uid,
      }
      
      return {
        success: true as const,
        data: resultData,
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Registration failed"
      return {
        success: false as const,
        error: message,
      } as RegisterResult
    }
  }, [router, syncUserWithBackend])

  const logout = useCallback(async () => {
    try {
      await firebaseSignOut()
    } catch {
      // Firebase signout failed, but continue with local cleanup
    }
    setClientAccessToken(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(FIREBASE_UID_KEY)
    setUser(null)
    setFirebaseUser(null)
    router.refresh()
  }, [router])

  const value = useMemo(
    () => ({
      user,
      loading: loading || !initialized,
      refresh,
      login,
      register,
      logout,
      firebaseUser,
    }),
    [user, loading, initialized, refresh, login, register, logout, firebaseUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return ctx
}
