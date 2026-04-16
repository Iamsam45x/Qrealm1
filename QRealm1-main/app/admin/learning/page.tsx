"use client"

import { useEffect, useState } from "react"
import { listLearningModules, saveLearningModule, deleteLearningModule, type LearningModule } from "@/lib/api"

export default function AdminLearningPage() {
  const [modules, setModules] = useState<LearningModule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingModule, setEditingModule] = useState<LearningModule | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [filter, setFilter] = useState<"QUANTUM_PHYSICS" | "QUANTUM_COMPUTING" | "">("")

  useEffect(() => {
    async function fetchModules() {
      setLoading(true)
      const result = await listLearningModules(filter || undefined)
      if (result.success && result.data) {
        setModules(result.data.items)
      }
      setLoading(false)
    }
    fetchModules()
  }, [filter])

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const formData = new FormData(e.currentTarget)
    const input = {
      id: editingModule?.id,
      slug: formData.get("slug") as string,
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      content: formData.get("content") as string,
      order: parseInt(formData.get("order") as string) || 0,
      category: formData.get("category") as "QUANTUM_PHYSICS" | "QUANTUM_COMPUTING",
    }
    const result = await saveLearningModule(input)
    if (result.success) {
      setEditingModule(null)
      setIsCreating(false)
      const refreshResult = await listLearningModules(filter || undefined)
      if (refreshResult.success && refreshResult.data) {
        setModules(refreshResult.data.items)
      }
    }
    setSaving(false)
  }

  async function handleDelete(moduleId: string) {
    if (!confirm("Are you sure you want to delete this module?")) return
    const result = await deleteLearningModule(moduleId)
    if (result.success) {
      setModules(modules.filter(m => m.id !== moduleId))
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-xl font-semibold text-foreground">Learning Content</h2>
        <button
          onClick={() => { setIsCreating(true); setEditingModule(null) }}
          className="saffron-btn text-sm"
        >
          + Add Module
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter("")}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${filter === "" ? "bg-saffron-500/20 text-saffron-400" : "text-muted-foreground hover:text-foreground"}`}
        >
          All
        </button>
        <button
          onClick={() => setFilter("QUANTUM_PHYSICS")}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${filter === "QUANTUM_PHYSICS" ? "bg-saffron-500/20 text-saffron-400" : "text-muted-foreground hover:text-foreground"}`}
        >
          Quantum Physics
        </button>
        <button
          onClick={() => setFilter("QUANTUM_COMPUTING")}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${filter === "QUANTUM_COMPUTING" ? "bg-saffron-500/20 text-saffron-400" : "text-muted-foreground hover:text-foreground"}`}
        >
          Quantum Computing
        </button>
      </div>

      {(isCreating || editingModule) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="font-serif text-xl font-semibold text-foreground mb-4">
              {editingModule ? "Edit Module" : "Create Module"}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Slug (URL)</label>
                <input
                  name="slug"
                  defaultValue={editingModule?.slug || ""}
                  required
                  className="w-full bg-[hsl(0,0%,100%,0.05)] border border-[hsl(0,0%,100%,0.1)] rounded-lg px-3 py-2 text-foreground"
                  placeholder="e.g., quantum-physics-phase-1"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Title</label>
                <input
                  name="title"
                  defaultValue={editingModule?.title || ""}
                  required
                  className="w-full bg-[hsl(0,0%,100%,0.05)] border border-[hsl(0,0%,100%,0.1)] rounded-lg px-3 py-2 text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Description</label>
                <textarea
                  name="description"
                  defaultValue={editingModule?.description || ""}
                  required
                  rows={2}
                  className="w-full bg-[hsl(0,0%,100%,0.05)] border border-[hsl(0,0%,100%,0.1)] rounded-lg px-3 py-2 text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Content (Markdown)</label>
                <textarea
                  name="content"
                  defaultValue={editingModule?.content || ""}
                  required
                  rows={10}
                  className="w-full bg-[hsl(0,0%,100%,0.05)] border border-[hsl(0,0%,100%,0.1)] rounded-lg px-3 py-2 text-foreground font-mono text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Order</label>
                  <input
                    name="order"
                    type="number"
                    defaultValue={editingModule?.order || 0}
                    className="w-full bg-[hsl(0,0%,100%,0.05)] border border-[hsl(0,0%,100%,0.1)] rounded-lg px-3 py-2 text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Category</label>
                  <select
                    name="category"
                    defaultValue={editingModule?.category || "QUANTUM_PHYSICS"}
                    className="w-full bg-[hsl(0,0%,100%,0.05)] border border-[hsl(0,0%,100%,0.1)] rounded-lg px-3 py-2 text-foreground"
                  >
                    <option value="QUANTUM_PHYSICS">Quantum Physics</option>
                    <option value="QUANTUM_COMPUTING">Quantum Computing</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="saffron-btn flex-1"
                >
                  {saving ? "Saving..." : "Save Module"}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsCreating(false); setEditingModule(null) }}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      ) : modules.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center">
          <p className="text-muted-foreground">No learning modules yet. Click "Add Module" to create one.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {modules.map((module) => (
            <div key={module.id} className="glass-card rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs ${module.category === "QUANTUM_PHYSICS" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"}`}>
                      {module.category === "QUANTUM_PHYSICS" ? "Physics" : "Computing"}
                    </span>
                    <span className="text-xs text-muted-foreground">Order: {module.order}</span>
                  </div>
                  <h3 className="text-foreground font-medium">{module.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{module.description}</p>
                  <p className="text-xs text-muted-foreground/60 mt-2 font-mono">{module.slug}</p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => setEditingModule(module)}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(module.id)}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}