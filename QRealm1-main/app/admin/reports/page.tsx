"use client"

import { useEffect, useState } from "react"
import { listAllReports, updateReportStatus, type UserReport } from "@/lib/api"

export default function AdminReportsPage() {
  const [reports, setReports] = useState<UserReport[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "RESOLVED" | "DISMISSED" | "">("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const limit = 20

  useEffect(() => {
    async function fetchReports() {
      setLoading(true)
      console.log("[AdminReports] Fetching reports...")
      try {
        const result = await listAllReports({ page, limit, status: statusFilter || undefined })
        console.log("[AdminReports] Result:", result)
        if (result.success && result.data) {
          setReports(result.data.items || [])
          setTotal(result.data.total || 0)
        } else if ('error' in result) {
          console.error("[AdminReports] Error:", result.error)
          setReports([])
        }
      } catch (err) {
        console.error("[AdminReports] Exception:", err)
        setReports([])
      }
      setLoading(false)
    }
    fetchReports()
  }, [page, statusFilter])

  async function handleUpdateStatus(reportId: string, status: "RESOLVED" | "DISMISSED") {
    setActionLoading(reportId)
    const result = await updateReportStatus(reportId, status)
    if (result.success) {
      setReports(reports.map(r => r.id === reportId ? { ...r, status } : r))
    }
    setActionLoading(null)
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-xl font-semibold text-foreground">User Reports</h2>
        <p className="text-sm text-muted-foreground">{total} total reports</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { setStatusFilter(""); setPage(1) }}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${statusFilter === "" ? "bg-saffron-500/20 text-saffron-400" : "text-muted-foreground hover:text-foreground"}`}
        >
          All
        </button>
        <button
          onClick={() => { setStatusFilter("PENDING"); setPage(1) }}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${statusFilter === "PENDING" ? "bg-saffron-500/20 text-saffron-400" : "text-muted-foreground hover:text-foreground"}`}
        >
          Pending
        </button>
        <button
          onClick={() => { setStatusFilter("RESOLVED"); setPage(1) }}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${statusFilter === "RESOLVED" ? "bg-saffron-500/20 text-saffron-400" : "text-muted-foreground hover:text-foreground"}`}
        >
          Resolved
        </button>
        <button
          onClick={() => { setStatusFilter("DISMISSED"); setPage(1) }}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${statusFilter === "DISMISSED" ? "bg-saffron-500/20 text-saffron-400" : "text-muted-foreground hover:text-foreground"}`}
        >
          Dismissed
        </button>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-[hsl(0,0%,100%,0.08)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Target ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Reason</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Reporter</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(0,0%,100%,0.08)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading...</td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No reports found</td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="hover:bg-[hsl(0,0%,100%,0.02)]">
                    <td className="px-4 py-3">
                      <span className="text-foreground text-sm capitalize">{report.targetType}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-muted-foreground text-xs font-mono">{report.targetId.substring(0, 8)}...</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-muted-foreground text-sm line-clamp-2 max-w-xs">{report.reason}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-foreground text-sm">{report.reporter?.name || "Unknown"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                        report.status === "PENDING" ? "bg-yellow-500/20 text-yellow-400" :
                        report.status === "RESOLVED" ? "bg-green-500/20 text-green-400" :
                        "bg-gray-500/20 text-gray-400"
                      }`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {report.status === "PENDING" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateStatus(report.id, "RESOLVED")}
                            disabled={actionLoading === report.id}
                            className="text-sm text-green-400 hover:text-green-300"
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(report.id, "DISMISSED")}
                            disabled={actionLoading === report.id}
                            className="text-sm text-muted-foreground hover:text-foreground"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
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