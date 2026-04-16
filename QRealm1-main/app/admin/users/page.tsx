"use client"

import { useEffect, useState } from "react"
import { listAllUsers, updateUserRole, deleteUser, type User, isBrowser } from "@/lib/api"

const TOKEN_KEY = "firebase_token"

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const limit = 20

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true)
      console.log("[AdminUsers] Fetching users...")
      
      // Debug: check localStorage
      const token = isBrowser() ? localStorage.getItem(TOKEN_KEY) : null
      console.log("[AdminUsers] Token exists:", !!token)
      if (token) {
        console.log("[AdminUsers] Token preview:", token.substring(0, 50) + "...")
      }
      
      const result = await listAllUsers({ page, limit })
      console.log("[AdminUsers] Result:", result)
      if (result.success && result.data) {
        setUsers(result.data.items)
        setTotal(result.data.total)
      } else if (result.error) {
        console.error("[AdminUsers] Error:", result.error)
      }
      setLoading(false)
    }
    fetchUsers()
  }, [page])

  async function handleRoleChange(userId: string, newRole: "ADMIN" | "PROFESSOR" | "RESEARCHER" | "STUDENT") {
    setActionLoading(userId)
    const result = await updateUserRole(userId, newRole)
    if (result.success && result.data) {
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
    }
    setActionLoading(null)
  }

  async function handleDelete(userId: string) {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return
    setActionLoading(userId)
    const result = await deleteUser(userId)
    if (result.success) {
      setUsers(users.filter(u => u.id !== userId))
    }
    setActionLoading(null)
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-xl font-semibold text-foreground">Users</h2>
        <p className="text-sm text-muted-foreground">{total} total users</p>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-[hsl(0,0%,100%,0.08)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(0,0%,100%,0.08)]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No users found</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-[hsl(0,0%,100%,0.02)]">
                    <td className="px-4 py-3">
                      <span className="text-foreground font-medium">{user.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-muted-foreground text-sm">{user.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as any)}
                        disabled={actionLoading === user.id}
                        className="bg-[hsl(0,0%,100%,0.05)] border border-[hsl(0,0%,100%,0.1)] rounded-md px-2 py-1 text-sm text-foreground"
                      >
                        <option value="STUDENT">Student</option>
                        <option value="RESEARCHER">Researcher</option>
                        <option value="PROFESSOR">Professor</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(user.id)}
                        disabled={actionLoading === user.id}
                        className="text-red-400 hover:text-red-300 text-sm transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[hsl(0,0%,100%,0.08)]">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}