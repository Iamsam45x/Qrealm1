"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

const TOKEN_KEY = "firebase_token"

export default function AdminInteractionsPage() {
  const [interactions, setInteractions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "RESOLVED" | "">("")
  const [typeFilter, setTypeFilter] = useState<"ERROR_REPORT" | "DOUBT" | "">("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedInteraction, setSelectedInteraction] = useState<any>(null)
  const [respondDialogOpen, setRespondDialogOpen] = useState(false)
  const [responseContent, setResponseContent] = useState("")
  const [responseType, setResponseType] = useState<"ACKNOWLEDGE" | "EXPLAIN" | "CLARIFY" | "RECONCILE" | "CORRECT">("ACKNOWLEDGE")
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false)
  const [classification, setClassification] = useState("")
  const [resolution, setResolution] = useState("")
  const [makePublic, setMakePublic] = useState(false)
  const limit = 20

  useEffect(() => {
    async function fetchInteractions() {
      setLoading(true)
      const token = localStorage.getItem(TOKEN_KEY)
      const searchParams = new URLSearchParams()
      searchParams.set("page", String(page))
      searchParams.set("limit", String(limit))
      if (statusFilter) searchParams.set("status", statusFilter)
      if (typeFilter) searchParams.set("interaction_type", typeFilter)
      
      const url = `http://localhost:4000/api/admin/learning/interactions?${searchParams.toString()}`
      
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: token ? { "Authorization": `Bearer ${token}` } : {}
        })
        const data = await response.json()
        if (response.ok && data.items) {
          setInteractions(data.items || [])
          setTotal(data.total || 0)
        }
      } catch (err) {
        console.error("Failed to fetch interactions:", err)
      }
      setLoading(false)
    }
    fetchInteractions()
  }, [page, statusFilter, typeFilter])

  async function handleRespond() {
    if (!selectedInteraction || !responseContent.trim()) return
    setActionLoading(selectedInteraction.id)
    const token = localStorage.getItem(TOKEN_KEY)
    
    try {
      const response = await fetch(`http://localhost:4000/api/admin/learning/interactions/${selectedInteraction.id}/respond`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ response_type: responseType, content: responseContent })
      })
      if (response.ok) {
        setRespondDialogOpen(false)
        setResponseContent("")
        // Refresh
        window.location.reload()
      }
    } catch (err) {
      console.error("Failed to respond:", err)
    }
    setActionLoading(null)
  }

  async function handleResolve() {
    if (!selectedInteraction) return
    setActionLoading(selectedInteraction.id)
    const token = localStorage.getItem(TOKEN_KEY)
    
    try {
      const response = await fetch(`http://localhost:4000/api/admin/learning/interactions/${selectedInteraction.id}/resolve`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ classification, resolution, make_public: makePublic })
      })
      if (response.ok) {
        setResolveDialogOpen(false)
        setClassification("")
        setResolution("")
        setMakePublic(false)
        // Refresh
        window.location.reload()
      }
    } catch (err) {
      console.error("Failed to resolve:", err)
    }
    setActionLoading(null)
  }

  const totalPages = Math.ceil(total / limit)

  const getStatusBadge = (status: string) => {
    if (status === "PENDING") {
      return <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">Pending</span>
    }
    return <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">Resolved</span>
  }

  const getTypeBadge = (type: string) => {
    if (type === "ERROR_REPORT") {
      return <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">Error Report</span>
    }
    return <span className="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400">Doubt</span>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-xl font-semibold text-foreground">Learning Interactions</h2>
        <p className="text-sm text-muted-foreground">{total} total interactions</p>
      </div>

      <div className="flex gap-4 mb-4 items-center flex-wrap">
        <div className="flex gap-1">
          <button onClick={() => { setStatusFilter(""); setPage(1) }} className={`px-3 py-1.5 text-sm rounded-lg ${statusFilter === "" ? "bg-saffron-500/20 text-saffron-400" : "text-muted-foreground"}`}>All</button>
          <button onClick={() => { setStatusFilter("PENDING"); setPage(1) }} className={`px-3 py-1.5 text-sm rounded-lg ${statusFilter === "PENDING" ? "bg-yellow-500/20 text-yellow-400" : "text-muted-foreground"}`}>Pending</button>
          <button onClick={() => { setStatusFilter("RESOLVED"); setPage(1) }} className={`px-3 py-1.5 text-sm rounded-lg ${statusFilter === "RESOLVED" ? "bg-green-500/20 text-green-400" : "text-muted-foreground"}`}>Resolved</button>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setTypeFilter("")} className={`px-3 py-1.5 text-sm rounded-lg ${typeFilter === "" ? "bg-saffron-500/20 text-saffron-400" : "text-muted-foreground"}`}>All Types</button>
          <button onClick={() => { setTypeFilter("ERROR_REPORT"); setPage(1) }} className={`px-3 py-1.5 text-sm rounded-lg ${typeFilter === "ERROR_REPORT" ? "bg-red-500/20 text-red-400" : "text-muted-foreground"}`}>Error Reports</button>
          <button onClick={() => { setTypeFilter("DOUBT"); setPage(1) }} className={`px-3 py-1.5 text-sm rounded-lg ${typeFilter === "DOUBT" ? "bg-blue-500/20 text-blue-400" : "text-muted-foreground"}`}>Doubts</button>
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : interactions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No interactions found</div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-[hsl(0,0%,100%,0.08)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Content</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(0,0%,100%,0.08)]">
              {interactions.map((interaction) => (
                <tr key={interaction.id} className="hover:bg-[hsl(0,0%,100%,0.02)]">
                  <td className="px-4 py-3">{getTypeBadge(interaction.interaction_type)}</td>
                  <td className="px-4 py-3">{getStatusBadge(interaction.status)}</td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-foreground text-sm truncate">{interaction.content}</p>
                    {interaction.classification && <p className="text-xs text-muted-foreground">{interaction.classification}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-foreground text-sm">{interaction.user_name || "Unknown"}</div>
                    <div className="text-xs text-muted-foreground">{interaction.user_email}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-sm">
                    {interaction.created_at ? new Date(interaction.created_at).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {interaction.status === "PENDING" && (
                      <div className="flex gap-2">
                        <Dialog open={respondDialogOpen && selectedInteraction?.id === interaction.id} onOpenChange={(open) => { setRespondDialogOpen(open); if (!open) setSelectedInteraction(null) }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedInteraction(interaction)} className="border-saffron-500/30 text-saffron-400 text-xs">Respond</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Respond</DialogTitle></DialogHeader>
                            <div className="space-y-4">
                              <div className="p-3 rounded-lg bg-[hsl(0,0%,100%,0.05)] text-sm">{interaction.content}</div>
                              <div className="flex gap-2 flex-wrap">
                                {(["ACKNOWLEDGE", "EXPLAIN", "CLARIFY", "RECONCILE", "CORRECT"] as const).map((type) => (
                                  <button key={type} onClick={() => setResponseType(type)} className={`px-2 py-1 text-xs rounded ${responseType === type ? "bg-saffron-500/20 text-saffron-400" : "bg-[hsl(0,0%,100%,0.05)]"}`}>{type}</button>
                                ))}
                              </div>
                              <Textarea value={responseContent} onChange={(e) => setResponseContent(e.target.value)} placeholder="Your response..." rows={4} />
                              <Button onClick={handleRespond} disabled={actionLoading === interaction.id || !responseContent.trim()} className="w-full">Send Response</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Dialog open={resolveDialogOpen && selectedInteraction?.id === interaction.id} onOpenChange={(open) => { setResolveDialogOpen(open); if (!open) setSelectedInteraction(null) }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedInteraction(interaction)} className="border-green-500/30 text-green-400 text-xs">Resolve</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Resolve</DialogTitle></DialogHeader>
                            <div className="space-y-4">
                              <select value={classification} onChange={(e) => setClassification(e.target.value)} className="w-full bg-[hsl(0,0%,100%,0.05)] border rounded-lg px-3 py-2">
                                <option value="">Select...</option>
                                <option value="VALID_ERROR">Valid Error</option>
                                <option value="INVALID_ERROR">Invalid Error</option>
                                <option value="DOUBT_PLATFORM">Doubt about Platform</option>
                                <option value="DOUBT_EXTERNAL">Doubt about External</option>
                                <option value="MISCONCEPTION">Misconception</option>
                              </select>
                              <Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Notes..." rows={3} />
                              <label className="flex items-center gap-2"><input type="checkbox" checked={makePublic} onChange={(e) => setMakePublic(e.target.checked)} />Make public</label>
                              <Button onClick={handleResolve} disabled={actionLoading === interaction.id} className="w-full bg-green-600">Mark Resolved</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[hsl(0,0%,100%,0.08)]">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-sm text-muted-foreground">Previous</button>
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 text-sm text-muted-foreground">Next</button>
          </div>
        )}
      </div>
    </div>
  )
}