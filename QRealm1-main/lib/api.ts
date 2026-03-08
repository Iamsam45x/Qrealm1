export const API_BASE = (() => {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (configured) return configured

  // In browsers, avoid hard-coding localhost so LAN/dev-host access still works.
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:4000/api`
  }

  return "http://localhost:4000/api"
})()

export type ApiErrorPayload = {
  success: false
  error: string
  code?: string
  details?: Record<string, unknown>
}

export type ApiSuccess<T> = {
  success: true
  data: T
}

export type ApiResult<T> = ApiSuccess<T> | ApiErrorPayload

export type User = {
  id: string
  name: string
  email: string
  role: "ADMIN" | "PROFESSOR" | "STUDENT"
  bio?: string | null
}

export type Blog = {
  id: string
  title: string
  slug: string
  content: string
  published: boolean
  createdAt: string
  updatedAt: string
  authorId: string
  author?: {
    id: string
    name: string
    email?: string
    role?: string
  }
  _count?: {
    comments: number
    likes: number
  }
  comments?: Comment[]
}

export type Forum = {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
  authorId: string
  author?: {
    id: string
    name: string
    email?: string
    role?: string
  }
  _count?: {
    comments: number
    likes: number
  }
  comments?: Comment[]
}

export type Comment = {
  id: string
  content: string
  createdAt: string
  userId: string
  user?: {
    id: string
    name: string
  }
  parentId?: string | null
  replies?: Comment[]
}

type ApiFetchOptions = {
  cookie?: string
  skipRefresh?: boolean
}

let clientAccessToken: string | null = null

export function setClientAccessToken(token: string | null) {
  clientAccessToken = token
}

function isBrowser(): boolean {
  return typeof window !== "undefined"
}

export { isBrowser }

const TOKEN_KEY = "auth_token"
const REFRESH_TOKEN_KEY = "refresh_token"
const TOKEN_REFRESH_BUFFER_SECONDS = 300

function getStoredToken(): string | null {
  if (isBrowser()) {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token && isTokenExpired(token)) {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
      if (!refreshToken) {
        localStorage.removeItem(TOKEN_KEY)
        return null
      }
    }
    return token
  }
  return null
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const exp = payload.exp * 1000
    return Date.now() > exp
  } catch {
    return true
  }
}

function getStoredRefreshToken(): string | null {
  if (isBrowser()) {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  }
  return null
}

export function isTokenNearExpiry(): boolean {
  const token = clientAccessToken || localStorage.getItem(TOKEN_KEY)
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
  
  if (!token && !refreshToken) {
    return false
  }
  
  if (!refreshToken) {
    return false
  }
  
  if (!token) {
    return true
  }
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const exp = payload.exp * 1000
    const now = Date.now()
    const bufferMs = TOKEN_REFRESH_BUFFER_SECONDS * 1000
    return exp - now < bufferMs
  } catch {
    return true
  }
}

export async function ensureValidToken(): Promise<boolean> {
  if (!isBrowser()) return false
  
  const token = clientAccessToken || localStorage.getItem(TOKEN_KEY)
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
  
  if (!token && !refreshToken) {
    return true
  }
  
  if (!refreshToken) {
    return true
  }
  
  if (isTokenNearExpiry()) {
    return await refreshSession()
  }
  return true
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  options?: ApiFetchOptions
): Promise<T> {
  if (isBrowser() && !options?.skipRefresh) {
    await ensureValidToken()
  }
  
  const headers = new Headers(init?.headers || {})

  if (options?.cookie) {
    headers.set("cookie", options.cookie)
  }
  
  let token = localStorage.getItem(TOKEN_KEY)
  if (!token && clientAccessToken) {
    token = clientAccessToken
  }
  
  if (isBrowser() && token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const body = init?.body
  if (body && !(body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  let res: Response
  try {
    console.log("Fetching:", `${API_BASE}${path}`, "with credentials")
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      credentials: "include",
    })
  } catch {
    throw new Error(
      `Failed to reach API at ${API_BASE}. Ensure backend is running and NEXT_PUBLIC_API_URL is correct.`
    )
  }

  if (res.status === 204) {
    return undefined as T
  }

  if (res.ok) {
    return (await res.json()) as T
  }

  if (isBrowser() && res.status === 401 && !options?.skipRefresh) {
    const refreshed = await refreshSession()
    if (refreshed) {
      return apiFetch<T>(path, init, { ...options, skipRefresh: true })
    }
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    throw new Error("Session expired. Please login again.")
  }

  const raw = await res.text()
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed.error) {
        throw new Error(parsed.error)
      }
      return parsed as T
    } catch (err) {
      if (err instanceof Error && err.message !== "") {
        throw err
      }
    }
  }
  throw new Error(`${res.status} ${res.statusText}`)
}

async function refreshSession(): Promise<boolean> {
  try {
    const refreshToken = getStoredRefreshToken()
    if (!refreshToken) {
      return false
    }
    
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      return false
    }
    
    const result = await response.json() as ApiResult<{ accessToken: string; refreshToken: string }>
    
    if (result.success && result.data.accessToken && result.data.refreshToken) {
      setClientAccessToken(result.data.accessToken)
      localStorage.setItem(TOKEN_KEY, result.data.accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, result.data.refreshToken)
      return true
    }
    
    return false
  } catch {
    return false
  }
}

export async function registerUser(input: {
  name: string
  email: string
  password: string
  role?: "ADMIN" | "PROFESSOR" | "STUDENT"
  bio?: string
}) {
  return apiFetch<ApiResult<{ user: User }>>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function loginUser(input: { email: string; password: string }) {
  return apiFetch<
    ApiResult<{
      user: User
      accessToken: string
      refreshToken: string
      expiresIn: string
    }>
  >("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function logoutUser() {
  return apiFetch<ApiResult<{ message?: string }>>("/auth/logout", {
    method: "POST",
  })
}

export async function getMe(options?: ApiFetchOptions) {
  return apiFetch<
    ApiResult<{ user: User; accessToken?: string; refreshToken?: string }>
  >("/auth/me", undefined, options)
}

export async function listBlogs(
  params: {
    page?: number
    limit?: number
    search?: string
    publishedOnly?: boolean
  } = {},
  options?: ApiFetchOptions
) {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set("page", String(params.page))
  if (params.limit) searchParams.set("limit", String(params.limit))
  if (params.search) searchParams.set("search", params.search)
  if (params.publishedOnly === false) searchParams.set("published", "false")

  const qs = searchParams.toString()
  return apiFetch<
    ApiResult<{
      items: Blog[]
      total: number
      page: number
      limit: number
    }>
  >(`/blogs${qs ? `?${qs}` : ""}`, undefined, options)
}

export async function getBlogBySlug(slug: string, options?: ApiFetchOptions) {
  return apiFetch<ApiResult<Blog>>(
    `/blogs/${encodeURIComponent(slug)}`,
    undefined,
    options
  )
}

export async function getPopularBlogs(limit = 5) {
  return apiFetch<ApiResult<Blog[]>>(`/blogs/popular?limit=${limit}`)
}

export async function createBlog(input: {
  title: string
  content: string
  published?: boolean
}) {
  return apiFetch<ApiResult<Blog>>("/blogs", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function addBlogComment(input: {
  id: string
  content: string
  parentId?: string
}) {
  return apiFetch<ApiResult<Comment>>(`/blogs/${input.id}/comment`, {
    method: "POST",
    body: JSON.stringify({
      content: input.content,
      parentId: input.parentId,
    }),
  })
}

export async function toggleBlogLike(id: string) {
  return apiFetch<ApiResult<{ liked: boolean }>>(`/blogs/${id}/like`, {
    method: "POST",
  })
}

export async function listForums(
  params: { page?: number; limit?: number } = {},
  options?: ApiFetchOptions
) {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set("page", String(params.page))
  if (params.limit) searchParams.set("limit", String(params.limit))
  const qs = searchParams.toString()
  return apiFetch<
    ApiResult<{
      items: Forum[]
      total: number
      page: number
      limit: number
    }>
  >(`/forums${qs ? `?${qs}` : ""}`, undefined, options)
}

export async function getForumById(id: string, options?: ApiFetchOptions) {
  return apiFetch<ApiResult<Forum>>(`/forums/${id}`, undefined, options)
}

export async function createForum(input: { title: string; content: string }) {
  return apiFetch<ApiResult<Forum>>("/forums", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function addForumComment(input: {
  id: string
  content: string
  parentId?: string
}) {
  return apiFetch<ApiResult<Comment>>(`/forums/${input.id}/comment`, {
    method: "POST",
    body: JSON.stringify({
      content: input.content,
      parentId: input.parentId,
    }),
  })
}

export async function toggleForumLike(id: string) {
  return apiFetch<ApiResult<{ liked: boolean }>>(`/forums/${id}/like`, {
    method: "POST",
  })
}
