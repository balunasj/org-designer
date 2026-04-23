import { BarChart2, Filter, FolderOpen } from 'lucide-react'
import { useAppStore } from '@/store'
import { MetricsDashboard } from '@/components/panels/MetricsDashboard'
import { FilterPanel } from '@/components/panels/FilterPanel'
import { ScenarioPanel } from '@/components/panels/ScenarioPanel'
import { ROLE_LABELS } from '@/lib/role-colors'

export function Sidebar() {
  const sidebarTab = useAppStore((s) => s.ui.sidebarTab)
  const setSidebarTab = useAppStore((s) => s.setSidebarTab)

  const tabs = [
    { id: 'metrics' as const, icon: <BarChart2 className="w-4 h-4" />, label: 'Metrics' },
    { id: 'filters' as const, icon: <Filter className="w-4 h-4" />, label: 'Filters' },
    { id: 'scenarios' as const, icon: <FolderOpen className="w-4 h-4" />, label: 'Scenarios' },
  ]

  return (
    <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col flex-shrink-0">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 bg-white">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSidebarTab(tab.id)}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors ${
              sidebarTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto">
        {sidebarTab === 'metrics' && <MetricsDashboard />}
        {sidebarTab === 'filters' && <FilterPanel />}
        {sidebarTab === 'scenarios' && <ScenarioPanel />}
      </div>

      {/* Color legend */}
      <div className="border-t border-gray-200 p-3">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Role Legend</div>
        <div className="space-y-1">
          {ROLE_LABELS.filter((r) => r.role !== 'Unknown').map(({ role, color }) => (
            <div key={role} className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="truncate" title={role}>{role}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
