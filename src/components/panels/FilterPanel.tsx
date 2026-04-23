import { useMemo } from 'react'
import { X } from 'lucide-react'
import { useAppStore } from '@/store'
import { ROLE_LABELS } from '@/lib/role-colors'

export function FilterPanel() {
  const filters = useAppStore((s) => s.filters)
  const setFilters = useAppStore((s) => s.setFilters)
  const clearFilters = useAppStore((s) => s.clearFilters)
  const effectiveState = useAppStore((s) => s.effectiveState)

  const { geos, countries, managers } = useMemo(() => {
    if (!effectiveState) return { geos: [], countries: [], managers: [] }
    const people = Object.values(effectiveState.people)
    return {
      geos: [...new Set(people.map((p) => p.rhatGeo).filter(Boolean))].sort(),
      countries: [...new Set(people.map((p) => p.co).filter(Boolean))].sort(),
      managers: people.filter((p) => p.directReports > 0).sort((a, b) => a.cn.localeCompare(b.cn)),
    }
  }, [effectiveState])

  const hasFilters =
    filters.geos.length > 0 ||
    filters.countries.length > 0 ||
    filters.jobRoles.length > 0 ||
    filters.titleSearch ||
    filters.managerUid

  function toggleMulti(field: 'geos' | 'countries' | 'jobRoles', value: string) {
    const current = filters[field]
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    setFilters({ [field]: next })
  }

  return (
    <div className="p-3 space-y-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Filters</span>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear all
          </button>
        )}
      </div>

      {/* Mode toggle */}
      <div>
        <div className="text-xs text-gray-500 mb-1.5">Filter mode</div>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
          {(['highlight', 'hide'] as const).map((mode) => (
            <button
              key={mode}
              className={`flex-1 py-1.5 capitalize transition-colors ${
                filters.mode === mode
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
              onClick={() => setFilters({ mode })}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Title search */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">Title contains</label>
        <input
          type="text"
          value={filters.titleSearch}
          onChange={(e) => setFilters({ titleSearch: e.target.value })}
          placeholder="e.g. Engineer, Manager..."
          className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-blue-400"
        />
      </div>

      {/* Geo */}
      <ChipGroup
        title="Geo"
        options={geos}
        selected={filters.geos}
        onToggle={(v) => toggleMulti('geos', v)}
      />

      {/* Job Role */}
      <div>
        <div className="text-xs text-gray-500 mb-1.5">Job Role</div>
        <div className="flex flex-wrap gap-1">
          {ROLE_LABELS.filter((r) => r.role !== 'Unknown').map(({ role, color }) => {
            const active = filters.jobRoles.includes(role)
            return (
              <button
                key={role}
                onClick={() => toggleMulti('jobRoles', role)}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  active ? 'text-white' : 'bg-white text-gray-600 border-gray-200'
                }`}
                style={active ? { backgroundColor: color, borderColor: color } : undefined}
              >
                {role}
              </button>
            )
          })}
        </div>
      </div>

      {/* Country */}
      <ChipGroup
        title="Country"
        options={countries}
        selected={filters.countries}
        onToggle={(v) => toggleMulti('countries', v)}
      />

      {/* Manager */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">Under manager</label>
        <select
          value={filters.managerUid ?? ''}
          onChange={(e) => setFilters({ managerUid: e.target.value || null })}
          className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-blue-400"
        >
          <option value="">All managers</option>
          {managers.map((m) => (
            <option key={m.uid} value={m.uid}>
              {m.cn}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

function ChipGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string
  options: string[]
  selected: string[]
  onToggle: (v: string) => void
}) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1.5">{title}</div>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
              selected.includes(opt)
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}
