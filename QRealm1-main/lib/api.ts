/**
 * Centralized API Client (axios)
 *
 * All API calls go through this module so:
 * - `NEXT_PUBLIC_API_URL` is the single source of truth (see `.env.local` / `.env.production`)
 * - Network failures are caught and returned as `{ success: false, error }` payloads
 * - Auth headers and refresh behavior stay consistent
 *
 * Call `getApiBase()` when you need the resolved base URL (e.g. health checks). It is
 * evaluated at call time so Next.js embeds the correct public env per build.
 */

import axios from "axios"

export function getApiBase(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL

  if (envUrl && envUrl.trim()) {
    let base = envUrl.trim().replace(/\/$/, "")
    if (!base.endsWith("/api")) {
      base = base + "/api"
    }
    return base
  }

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname
    const port = window.location.port || (window.location.protocol === "https:" ? 443 : 80)
    return `${window.location.protocol}//${hostname}:${port}/api`.replace(/\/$/, "")
  }

  return "http://localhost:4000/api".replace(/\/$/, "")
}

/**
 * Shared axios instance: same-origin cookies, no throw on HTTP error codes (handled like fetch).
 */
export const apiClient = axios.create({
  timeout: 30_000,
  withCredentials: true,
  validateStatus: () => true,
})

if (process.env.NODE_ENV === "development") {
  console.log(`[API] Base URL: ${getApiBase()}`)
}

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
  role: "ADMIN" | "PROFESSOR" | "RESEARCHER" | "STUDENT"
  userType?: "STUDENT" | "RESEARCHER"
  bio?: string | null
  verified?: boolean
  institution?: string | null
  course?: string | null
  yearOfStudy?: string | null
  studentId?: string | null
  fieldOfResearch?: string | null
  yearsOfExperience?: number
  researchProfile?: string | null
  firebaseUid?: string | null
  voteWeight?: number
}

export type Blog = {
  id: string
  title: string
  slug: string
  content: string
  published: boolean
  isHidden?: boolean
  isFlagship?: boolean
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
  isHidden?: boolean
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

const TOKEN_KEY = "firebase_token"
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

function headersObjectFromInit(h?: HeadersInit): Record<string, string> {
  const out: Record<string, string> = {}
  if (!h) return out
  new Headers(h).forEach((value, key) => {
    out[key] = value
  })
  return out
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  options?: ApiFetchOptions
): Promise<T> {
  const isServer = !isBrowser()
  const hasCookie = !!options?.cookie
  const base = getApiBase()
  const fullUrl = `${base}${path.startsWith("/") ? path : `/${path}`}`

  if (process.env.NODE_ENV === "development") {
    console.log(`[API] ${init?.method || "GET"} ${fullUrl}`)
  }

  if (!isServer && !hasCookie && !options?.skipRefresh) {
    await ensureValidToken()
  }

  const headers: Record<string, string> = headersObjectFromInit(init?.headers)

  if (options?.cookie) {
    headers["cookie"] = options.cookie
  }

  let token = isBrowser() ? localStorage.getItem(TOKEN_KEY) : null
  if (!token && clientAccessToken) {
    token = clientAccessToken
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const method = (init?.method || "GET").toUpperCase()
  const body = init?.body
  let data: unknown = undefined
  if (body instanceof FormData) {
    data = body
    delete headers["Content-Type"]
  } else if (body && typeof body === "string") {
    if (!headers["Content-Type"] && !headers["content-type"]) {
      headers["Content-Type"] = "application/json"
    }
    try {
      data = JSON.parse(body)
    } catch {
      data = body
    }
  }

  try {
    const res = await apiClient.request({
      url: fullUrl,
      method,
      headers,
      data: method === "GET" || method === "HEAD" ? undefined : data,
    })

    if (res.status === 204) {
      return undefined as T
    }

    if (res.status >= 200 && res.status < 300) {
      const payload = res.data
      // Axios can leave `data` undefined for odd content-types or empty bodies; never pass that through as a valid ApiResult.
      if (payload === undefined || payload === null) {
        return {
          success: false,
          error: "Empty response from server",
        } as T
      }
      if (typeof payload === "string") {
        try {
          return JSON.parse(payload) as T
        } catch {
          return {
            success: false,
            error: "Non-JSON response from server",
          } as T
        }
      }
      return payload as T
    }

    if (isBrowser() && res.status === 401 && !options?.skipRefresh) {
      const refreshed = await refreshSession()
      if (refreshed) {
        return apiFetch<T>(path, init, { ...options, skipRefresh: true })
      }
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      return { success: false, error: "Session expired. Please login again." } as T
    }

    const raw = res.data
    if (raw && typeof raw === "object" && "success" in raw) {
      return raw as T
    }
    if (typeof raw === "string" && raw.length) {
      try {
        return JSON.parse(raw) as T
      } catch {
        return { success: false, error: `${res.status} ${res.statusText}` } as T
      }
    }
    return { success: false, error: `${res.status} ${res.statusText}` } as T
  } catch (error) {
    const msg =
      axios.isAxiosError(error) && error.code === "ECONNABORTED"
        ? "Request timed out"
        : error instanceof Error
          ? error.message
          : String(error)
    
    // Detailed error logging
    if (axios.isAxiosError(error)) {
      console.error(`[API Error] Failed to reach ${fullUrl}:`, {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
        }
      })
    } else {
      console.error(`[API Error] Failed to reach ${fullUrl}:`, error)
    }
    
    return {
      success: false,
      error: `Cannot connect to server at ${base}. ${msg}`,
    } as unknown as T
  }
}

async function refreshSession(): Promise<boolean> {
  try {
    const refreshToken = getStoredRefreshToken()
    if (!refreshToken) {
      return false
    }

    const response = await apiClient.post(
      `${getApiBase()}/auth/refresh`,
      { refreshToken },
      { headers: { "Content-Type": "application/json" } }
    )

    if (response.status < 200 || response.status >= 300) {
      return false
    }

    const result = response.data

    if (result && typeof result === "object" && "success" in result && result.success && result.data && typeof result.data === "object") {
      const data = result.data as Record<string, unknown>
      if (typeof data.accessToken === "string" && typeof data.refreshToken === "string") {
        setClientAccessToken(data.accessToken)
        localStorage.setItem(TOKEN_KEY, data.accessToken)
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)
        return true
      }
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
}) {
  return apiFetch<ApiResult<{ 
    message: string
    userId: string
  }>>("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password,
      confirmPassword: input.confirmPassword,
      userType: input.userType,
      bio: input.bio,
      studentFields: input.studentFields,
      researcherFields: input.researcherFields,
    }),
  })
}

export async function loginUser(input: { 
  email: string; 
  password: string;
  remember?: boolean;
}) {
  const result = await apiFetch<
    ApiResult<{
      user: User
      accessToken?: string
      refreshToken?: string
      expiresIn?: string
    }>
  >("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      remember: input.remember ?? false,
    }),
  })
  
  if (result && "success" in result && result.success === true && "data" in result) {
    return result
  }

  if (result && "success" in result && result.success === false) {
    return result
  }

  return { success: false, error: "Login failed. Please try again." } as ApiErrorPayload
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

export async function forgotPassword(email: string) {
  return apiFetch<ApiResult<{ message: string; resetToken?: string }>>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  })
}

export async function resetPassword(token: string, newPassword: string, confirmPassword: string) {
  return apiFetch<ApiResult<{ message: string }>>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({
      token,
      new_password: newPassword,
      confirm_password: confirmPassword,
    }),
  })
}

export async function changePassword(currentPassword: string, newPassword: string, confirmPassword: string) {
  return apiFetch<ApiResult<{ message: string }>>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    }),
  })
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
  console.log("[createBlog] Sending:", JSON.stringify(input))
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

// ===== PHASE 1 FEATURES =====

export type Debate = {
  id: string
  blogAId: string
  blogBId: string
  createdBy: string
  title?: string
  description?: string
  status: string
  createdAt: string
  endedAt?: string
  voteCounts?: { A?: number; B?: number }
  blogA?: Blog
  blogB?: Blog
}

export type Notification = {
  id: string
  userId: string
  message: string
  link?: string
  type: string
  isRead: boolean
  createdAt: string
}

export type DebateVote = {
  debateId: string
  vote: "A" | "B"
}

// Reports - flagship blogs
export async function listReports(params: { page?: number; limit?: number } = {}) {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set("page", String(params.page))
  if (params.limit) searchParams.set("limit", String(params.limit))
  const qs = searchParams.toString()
  return apiFetch<
    ApiResult<{
      items: Blog[]
      total: number
      page: number
      limit: number
    }>
  >(`/reports${qs ? `?${qs}` : ""}`)
}

// Debates
export async function listDebates(params: { page?: number; limit?: number } = {}) {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set("page", String(params.page))
  if (params.limit) searchParams.set("limit", String(params.limit))
  const qs = searchParams.toString()
  return apiFetch<
    ApiResult<{
      items: Debate[]
      total: number
      page: number
      limit: number
    }>
  >(`/debates${qs ? `?${qs}` : ""}`)
}

export async function createDebate(input: { blogAId: string; blogBId: string; title?: string; description?: string }) {
  return apiFetch<ApiResult<{ id: string; message: string }>>("/debates", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function voteDebate(debateId: string, vote: "A" | "B") {
  return apiFetch<ApiResult<{ voted: string; weight: number }>>(`/debates/${debateId}/vote`, {
    method: "POST",
    body: JSON.stringify({ vote }),
  })
}

// Notifications
export async function listNotifications(params: { page?: number; limit?: number } = {}) {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set("page", String(params.page))
  if (params.limit) searchParams.set("limit", String(params.limit))
  const qs = searchParams.toString()
  return apiFetch<
    ApiResult<{
      items: Notification[]
      total: number
      page: number
      limit: number
    }>
  >(`/notifications${qs ? `?${qs}` : ""}`)
}

export async function markNotificationRead(notificationId: string) {
  return apiFetch<ApiResult<{ message: string }>>(`/notifications/${notificationId}/read`, {
    method: "PATCH",
  })
}

// Reports (user reports)
export async function createReport(input: { targetType: "blog" | "forum" | "comment" | "user"; targetId: string; reason: string }) {
  return apiFetch<ApiResult<{ id: string; message: string }>>("/report", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export type LearningInteraction = {
  id: string
  userId: string
  targetType: "blog" | "forum" | "question" | "practice"
  targetId: string
  interactionType: "ERROR_REPORT" | "DOUBT"
  content: string
  status: "PENDING" | "RESOLVED"
  classification?: string
  resolution?: string
  isPublic: boolean
  createdAt: string
  resolvedAt?: string
  user?: { id: string; name: string; role: string }
  responses?: LearningResponse[]
}

export type LearningResponse = {
  id: string
  interactionId: string
  responderId: string
  responseType: "ACKNOWLEDGE" | "EXPLAIN" | "CLARIFY" | "RECONCILE" | "CORRECT"
  content: string
  createdAt: string
}

export async function createLearningInteraction(input: {
  targetType: "blog" | "forum" | "question" | "practice"
  targetId: string
  interactionType: "ERROR_REPORT" | "DOUBT"
  content: string
  context?: string
}) {
  return apiFetch<ApiResult<{ id: string; message: string; guidance: string }>>("/learning/interaction", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function listLearningInteractions(params: { page?: number; limit?: number; type?: "ERROR_REPORT" | "DOUBT"; status?: "PENDING" | "RESOLVED" } = {}) {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set("page", String(params.page))
  if (params.limit) searchParams.set("limit", String(params.limit))
  if (params.type) searchParams.set("type", params.type)
  if (params.status) searchParams.set("status", params.status)
  const qs = searchParams.toString()
  return apiFetch<
    ApiResult<{
      items: LearningInteraction[]
      total: number
      page: number
      limit: number
    }>
  >(`/learning/interactions${qs ? `?${qs}` : ""}`)
}

export async function getLearningInteraction(interactionId: string) {
  return apiFetch<ApiResult<LearningInteraction>>(`/learning/interactions/${interactionId}`)
}

export async function respondToLearningInteraction(interactionId: string, input: { responseType: "ACKNOWLEDGE" | "EXPLAIN" | "CLARIFY" | "RECONCILE" | "CORRECT"; content: string }) {
  return apiFetch<ApiResult<{ id: string; message: string }>>(`/learning/interactions/${interactionId}/respond`, {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function makeInteractionPublic(interactionId: string) {
  return apiFetch<ApiResult<{ message: string }>>(`/learning/interactions/${interactionId}/make-public`, {
    method: "POST",
  })
}

export async function listPublicLearningInteractions(params: { page?: number; limit?: number } = {}) {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set("page", String(params.page))
  if (params.limit) searchParams.set("limit", String(params.limit))
  const qs = searchParams.toString()
  return apiFetch<
    ApiResult<{
      items: LearningInteraction[]
      total: number
      page: number
      limit: number
    }>
  >(`/learning/public${qs ? `?${qs}` : ""}`)
}

// Feedback
export async function createFeedback(input: { message: string; category?: "BUG" | "FEATURE" | "IMPROVEMENT" | "OTHER" }) {
  return apiFetch<ApiResult<{ id: string; message: string }>>("/feedback", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

// Search
export async function searchContent(q: string, type?: "blog" | "forum", limit = 20) {
  const searchParams = new URLSearchParams()
  searchParams.set("q", q)
  if (type) searchParams.set("type", type)
  searchParams.set("limit", String(limit))
  return apiFetch<
    ApiResult<{
      items: (Blog | Forum)[]
      nextCursor?: string
    }>
  >(`/search?${searchParams.toString()}`)
}

// Admin: moderate content
export async function moderateContent(type_: "blog" | "forum" | "comment", id: string) {
  return apiFetch<ApiResult<{ id: string; isHidden: boolean }>>(`/admin/moderate/${type_}/${id}`, {
    method: "PATCH",
  })
}

// Admin: set flagship
export async function setFlagship(blogId: string) {
  return apiFetch<ApiResult<{ id: string; isFlagship: boolean }>>(`/admin/flagship/${blogId}`, {
    method: "PATCH",
  })
}

// Admin: list all users
export async function listAllUsers(params: { page?: number; limit?: number } = {}) {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set("page", String(params.page))
  if (params.limit) searchParams.set("limit", String(params.limit))
  const qs = searchParams.toString()
  return apiFetch<ApiResult<{
    items: User[]
    total: number
    page: number
    limit: number
  }>>(`/admin/users${qs ? `?${qs}` : ""}`)
}

// Admin: get analytics
export async function getAdminAnalytics() {
  return apiFetch<ApiResult<{
    users: number
    blogs: number
    forums: number
    comments: number
    likes: number
    interactions: number
    reports: number
  }>>("/admin/analytics")
}

// Admin: delete user
export async function deleteUser(userId: string) {
  return apiFetch<ApiResult<{ message: string }>>(`/admin/user/${userId}`, {
    method: "DELETE",
  })
}

// Admin: update user role
export async function updateUserRole(userId: string, role: "ADMIN" | "PROFESSOR" | "RESEARCHER" | "STUDENT") {
  return apiFetch<ApiResult<{ id: string; role: string }>>(`/admin/user/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  })
}

// Admin: list all blogs (including hidden)
export async function listAllBlogs(params: { page?: number; limit?: number; search?: string } = {}) {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set("page", String(params.page))
  if (params.limit) searchParams.set("limit", String(params.limit))
  if (params.search) searchParams.set("search", params.search)
  const qs = searchParams.toString()
  return apiFetch<ApiResult<{
    items: Blog[]
    total: number
    page: number
    limit: number
  }>>(`/admin/blogs${qs ? `?${qs}` : ""}`)
}

// Admin: list all forums (including hidden)
export async function listAllForums(params: { page?: number; limit?: number; search?: string } = {}) {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set("page", String(params.page))
  if (params.limit) searchParams.set("limit", String(params.limit))
  if (params.search) searchParams.set("search", params.search)
  const qs = searchParams.toString()
  return apiFetch<ApiResult<{
    items: Forum[]
    total: number
    page: number
    limit: number
  }>>(`/admin/forums${qs ? `?${qs}` : ""}`)
}

// Learning content types
export type LearningModule = {
  id: string
  slug: string
  title: string
  description: string
  content: string
  order: number
  category: "QUANTUM_PHYSICS" | "QUANTUM_COMPUTING"
  createdAt: string
  updatedAt: string
}

// Admin: list learning modules
export async function listLearningModules(category?: "QUANTUM_PHYSICS" | "QUANTUM_COMPUTING") {
  const searchParams = new URLSearchParams()
  if (category) searchParams.set("category", category)
  const qs = searchParams.toString()
  return apiFetch<ApiResult<{
    items: LearningModule[]
  }>>(`/admin/learning${qs ? `?${qs}` : ""}`)
}

// Admin: get learning module by slug
export async function getLearningModule(slug: string) {
  return apiFetch<ApiResult<LearningModule>>(`/admin/learning/${slug}`)
}

// Admin: create/update learning module
export async function saveLearningModule(input: {
  id?: string
  slug: string
  title: string
  description: string
  content: string
  order: number
  category: "QUANTUM_PHYSICS" | "QUANTUM_COMPUTING"
}) {
  const isUpdate = !!input.id
  return apiFetch<ApiResult<LearningModule>>(`/admin/learning${isUpdate ? `/${input.id}` : ""}`, {
    method: isUpdate ? "PATCH" : "POST",
    body: JSON.stringify(input),
  })
}

// Admin: delete learning module
export async function deleteLearningModule(id: string) {
  return apiFetch<ApiResult<{ message: string }>>(`/admin/learning/${id}`, {
    method: "DELETE",
  })
}

// User reports
export type UserReport = {
  id: string
  targetType: "blog" | "forum" | "comment" | "user"
  targetId: string
  reason: string
  status: "PENDING" | "RESOLVED" | "DISMISSED"
  reporterId: string
  createdAt: string
  reporter?: { id: string; name: string }
  target?: { id: string; title?: string; content?: string }
}

// User: create report
export async function createUserReport(input: { targetType: "blog" | "forum" | "comment" | "user"; targetId: string; reason: string }) {
  return apiFetch<ApiResult<{ id: string; message: string }>>("/report", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

// Admin: list all reports
export async function listAllReports(params: { page?: number; limit?: number; status?: "PENDING" | "RESOLVED" | "DISMISSED" } = {}) {
  console.log("[listAllReports] Calling API...")
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set("page", String(params.page))
  if (params.limit) searchParams.set("limit", String(params.limit))
  if (params.status) searchParams.set("status", params.status)
  const qs = searchParams.toString()
  console.log("[listAllReports] Query:", qs)
  
  const result = await apiFetch<ApiResult<{
    items: UserReport[]
    total: number
    page: number
    limit: number
  }>>(`/admin/reports${qs ? `?${qs}` : ""}`)
  
  console.log("[listAllReports] Result:", result)
  return result
}

// Admin: update report status
export async function updateReportStatus(reportId: string, status: "RESOLVED" | "DISMISSED") {
  return apiFetch<ApiResult<{ id: string; status: string }>>(`/admin/reports/${reportId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  })
}

// Admin: Learning Interactions (Error Reports & Doubts)
export type AdminLearningInteraction = {
  id: string
  userId: string
  targetType: "blog" | "forum" | "question" | "practice"
  targetId: string
  interactionType: "ERROR_REPORT" | "DOUBT"
  content: string
  status: "PENDING" | "RESOLVED"
  classification?: string
  resolution?: string
  isPublic: boolean
  createdAt: string
  resolvedAt?: string
  user?: { id: string; name: string; email?: string; role?: string }
  responses?: AdminLearningResponse[]
}

export type AdminLearningResponse = {
  id: string
  interactionId: string
  responderId: string
  responseType: "ACKNOWLEDGE" | "EXPLAIN" | "CLARIFY" | "RECONCILE" | "CORRECT"
  content: string
  createdAt: string
  responder?: { id: string; name: string }
}

export async function listAdminLearningInteractions(params: {
  page?: number
  limit?: number
  status?: "PENDING" | "RESOLVED"
  interaction_type?: "ERROR_REPORT" | "DOUBT"
} = {}) {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set("page", String(params.page))
  if (params.limit) searchParams.set("limit", String(params.limit))
  if (params.status) searchParams.set("status", params.status)
  if (params.interaction_type) searchParams.set("interaction_type", params.interaction_type)
  const qs = searchParams.toString()
  
  const url = `${getApiBase()}/admin/learning/interactions${qs ? "?" + qs : ""}`
  console.log("[listAdminLearningInteractions] URL:", url)
  
  let headers: Record<string, string> = {}
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("firebase_token")
    if (token) headers["Authorization"] = `Bearer ${token}`
  }
  
  try {
    const response = await fetch(url, { method: "GET", headers })
    const data = await response.json()
    console.log("[listAdminLearningInteractions] Response:", data)
    if (!response.ok) return { success: false, error: data.error || `Error ${response.status}` }
    return { success: true, data }
  } catch (e) {
    console.log("[listAdminLearningInteractions] Exception:", e)
    return { success: false, error: String(e) }
  }
}

export async function getAdminLearningInteraction(interactionId: string) {
  return apiFetch<ApiResult<AdminLearningInteraction>>(`/admin/learning/interactions/${interactionId}`)
}

export async function respondToAdminLearningInteraction(interactionId: string, input: {
  response_type: "ACKNOWLEDGE" | "EXPLAIN" | "CLARIFY" | "RECONCILE" | "CORRECT"
  content: string
}) {
  const url = `${getApiBase()}/admin/learning/interactions/${interactionId}/respond`
  let headers: Record<string, string> = { "Content-Type": "application/json" }
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("firebase_token")
    if (token) headers["Authorization"] = `Bearer ${token}`
  }
  const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(input) })
  const data = await response.json()
  if (!response.ok) return { success: false, error: data.error || `Error ${response.status}` }
  return { success: true, data }
}

export async function resolveAdminLearningInteraction(interactionId: string, input: {
  classification?: string
  resolution?: string
  make_public?: boolean
}) {
  const url = `${getApiBase()}/admin/learning/interactions/${interactionId}/resolve`
  let headers: Record<string, string> = { "Content-Type": "application/json" }
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("firebase_token")
    if (token) headers["Authorization"] = `Bearer ${token}`
  }
  const response = await fetch(url, { method: "PATCH", headers, body: JSON.stringify(input) })
  const data = await response.json()
  if (!response.ok) return { success: false, error: data.error || `Error ${response.status}` }
  return { success: true, data }
}

export async function verifyOTP(email: string, otp: string) {
  return apiFetch<ApiResult<{ message: string }>>("/auth/verify", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  })
}

export async function resendOTP(email: string) {
  return apiFetch<ApiResult<{ message: string }>>("/auth/resend", {
    method: "POST",
    body: JSON.stringify({ email }),
  })
}
