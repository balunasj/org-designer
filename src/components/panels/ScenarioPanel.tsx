import { useState, useEffect } from 'react'
import { Save, Trash2, FolderOpen } from 'lucide-react'
import { useAppStore } from '@/store'

interface ScenarioMeta {
  name: string
  createdAt: string
  updatedAt: string
}

export function ScenarioPanel() {
  const currentScenarioName = useAppStore((s) => s.currentScenarioName)
  const saveScenario = useAppStore((s) => s.saveScenario)
  const loadScenario = useAppStore((s) => s.loadScenario)

  const [scenarios, setScenarios] = useState<ScenarioMeta[]>([])
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchScenarios = async () => {
    const res = await fetch('/api/scenarios')
    if (res.ok) setScenarios(await res.json())
  }

  useEffect(() => { void fetchScenarios() }, [])

  const handleSave = async () => {
    const name = newName.trim() || currentScenarioName
    if (!name) return
    setLoading(true)
    setError(null)
    try {
      await saveScenario(name)
      setNewName('')
      await fetchScenarios()
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const handleLoad = async (name: string) => {
    setLoading(true)
    setError(null)
    try {
      await loadScenario(name)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete scenario "${name}"?`)) return
    await fetch(`/api/scenarios/${encodeURIComponent(name)}`, { method: 'DELETE' })
    await fetchScenarios()
  }

  return (
    <div className="p-3 space-y-4 overflow-y-auto">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Scenarios</div>

      {/* Current scenario indicator */}
      <div className="text-xs text-gray-600">
        Active: <span className="font-medium text-blue-600">{currentScenarioName}</span>
      </div>

      {/* Save */}
      <div>
        <div className="text-xs text-gray-500 mb-1.5">Save as...</div>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={currentScenarioName}
            className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-blue-400"
            onKeyDown={(e) => { if (e.key === 'Enter') void handleSave() }}
          />
          <button
            onClick={() => void handleSave()}
            disabled={loading}
            className="flex items-center gap-1 px-2 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            <Save className="w-3 h-3" />
            Save
          </button>
        </div>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>

      {/* Scenario list */}
      <div>
        <div className="text-xs text-gray-500 mb-1.5">Saved scenarios</div>
        {scenarios.length === 0 ? (
          <div className="text-xs text-gray-400 italic">No saved scenarios</div>
        ) : (
          <div className="space-y-1">
            {scenarios.map((s) => (
              <div
                key={s.name}
                className={`flex items-center gap-1 p-2 rounded border text-xs ${
                  s.name === currentScenarioName
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-700 truncate">{s.name}</div>
                  <div className="text-gray-400 text-[10px]">
                    {new Date(s.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => void handleLoad(s.name)}
                  className="p-1 text-blue-400 hover:text-blue-600"
                  title="Load"
                >
                  <FolderOpen className="w-3 h-3" />
                </button>
                <button
                  onClick={() => void handleDelete(s.name)}
                  className="p-1 text-gray-300 hover:text-red-400"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deep link */}
      {scenarios.some((s) => s.name === currentScenarioName) && (
        <div>
          <div className="text-xs text-gray-500 mb-1">Deep link</div>
          <div className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1.5 font-mono break-all text-gray-600">
            {window.location.origin}/?scenario={currentScenarioName}
          </div>
        </div>
      )}
    </div>
  )
}
