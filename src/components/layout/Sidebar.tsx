import { BarChart2, Filter, Settings } from 'lucide-react'
import { useAppStore } from '@/store'
import { MetricsDashboard } from '@/components/panels/MetricsDashboard'
import { FilterPanel } from '@/components/panels/FilterPanel'
import { ConfigPanel } from '@/components/panels/ConfigPanel'
import { ROLE_LABELS } from '@/lib/role-colors'

export function Sidebar() {
  const sidebarTab = useAppStore((s) => s.ui.sidebarTab)
  const setSidebarTab = useAppStore((s) => s.setSidebarTab)

  const tabs = [
    { id: 'metrics' as const, icon: <BarChart2 className="h-4 w-4" />, label: 'Metrics' },
    { id: 'filters' as const, icon: <Filter className="h-4 w-4" />, label: 'Filters' },
    { id: 'configure' as const, icon: <Settings className="h-4 w-4" />, label: 'Configure' },
  ]

  return (
    <div className="flex w-64 flex-shrink-0 flex-col border-r border-gray-200 bg-gray-50">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 bg-white">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSidebarTab(tab.id)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
              sidebarTab === tab.id
                ? 'border-b-2 border-blue-500 text-blue-600'
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
        {sidebarTab === 'configure' && <ConfigPanel />}
      </div>

      {/* Color legend */}
      <div className="border-t border-gray-200 p-3">
        <div className="mb-2 text-xs font-semibold tracking-wide text-gray-400 uppercase">
          Role Legend
        </div>
        <div className="space-y-1">
          {ROLE_LABELS.filter((r) => r.role !== 'Unknown').map(({ role, color }) => (
            <div key={role} className="flex items-center gap-2 text-xs text-gray-600">
              <div
                className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                style={{ backgroundColor: color }}
              />
              <span className="truncate" title={role}>
                {role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
