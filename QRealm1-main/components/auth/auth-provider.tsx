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
  loginUser,
  logoutUser,
  registerUser,
  setClientAccessToken,
  ensureValidToken,
  isBrowser,
} from "@/lib/api"

type AuthContextValue = {
  user: User | null
  loading: boolean
  refresh: () => Promise<boolean>
  login: (email: string, password: string) => Promise<void>
  register: (input: {
    name: string
    email: string
    password: string
    role?: "ADMIN" | "PROFESSOR" | "STUDENT"
    bio?: string
  }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const TOKEN_KEY = "auth_token"
const REFRESH_TOKEN_KEY = "refresh_token"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getMe()
      if (result.success) {
        if (result.data.accessToken) {
          setClientAccessToken(result.data.accessToken)
          localStorage.setItem(TOKEN_KEY, result.data.accessToken)
        }
        if (result.data.refreshToken) {
          localStorage.setItem(REFRESH_TOKEN_KEY, result.data.refreshToken)
        }
        setUser(result.data.user)
        return true
      } else {
        setUser(null)
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(REFRESH_TOKEN_KEY)
        return false
      }
    } catch {
      setUser(null)
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (storedToken) {
      setClientAccessToken(storedToken)
    }
    void refresh().finally(() => setInitialized(true))
  }, [refresh])

  useEffect(() => {
    if (!isBrowser()) return
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && user) {
        ensureValidToken()
      }
    }
    
    const handleFocus = () => {
      if (user) {
        ensureValidToken()
      }
    }
    
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
    }
  }, [user])

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginUser({ email, password })
      if (!result.success) {
        throw new Error(result.error)
      }
      setClientAccessToken(result.data.accessToken)
      localStorage.setItem(TOKEN_KEY, result.data.accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, result.data.refreshToken)
      setUser(result.data.user)
      router.refresh()
    },
    [router]
  )

  const register = useCallback(
    async (input: {
      name: string
      email: string
      password: string
      role?: "ADMIN" | "PROFESSOR" | "STUDENT"
      bio?: string
    }) => {
      const result = await registerUser(input)
      if (!result.success) {
        throw new Error(result.error)
      }
      const loginResult = await loginUser({
        email: input.email,
        password: input.password,
      })
      if (!loginResult.success) {
        throw new Error(loginResult.error)
      }
      setClientAccessToken(loginResult.data.accessToken)
      localStorage.setItem(TOKEN_KEY, loginResult.data.accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, loginResult.data.refreshToken)
      setUser(loginResult.data.user)
      router.refresh()
    },
    [router]
  )

  const logout = useCallback(async () => {
    await logoutUser()
    setClientAccessToken(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    setUser(null)
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
    }),
    [user, loading, initialized, refresh, login, register, logout]
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
