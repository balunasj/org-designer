import { useDeferredValue, useMemo } from 'react'
import { useAppStore } from '@/store'
import { ROLE_LABELS } from '@/lib/role-colors'
import { teamColor } from '@/lib/team-colors'
import { buildChildrenMap, getSubtreePeople } from '@/lib/hierarchy-utils'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  pending?: boolean
}

function StatCard({ label, value, sub, pending }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <div className={`text-2xl font-bold text-gray-900 ${pending ? 'opacity-40' : ''}`}>
        {value}
      </div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

export function MetricsDashboard() {
  const effectiveState = useAppStore((s) => s.effectiveState)
  const selectedNodeId = useAppStore((s) => s.ui.selectedNodeId)
  const setSelected = useAppStore((s) => s.setSelected)

  // Resolve scope root immediately (drives header + label without delay)
  const scopeRootUid = useMemo(() => {
    if (!selectedNodeId || !effectiveState) return null
    const person = effectiveState.people[selectedNodeId]
    if (!person) return null
    return selectedNodeId
  }, [selectedNodeId, effectiveState])

  const scopeLabel = useMemo(() => {
    if (!scopeRootUid || !effectiveState) return 'Organization Metrics'
    const person = effectiveState.people[scopeRootUid]
    return person ? `Metrics: ${person.cn}` : 'Organization Metrics'
  }, [scopeRootUid, effectiveState])

  // Defer the scope for computation — card highlights first, metrics catch up after
  const deferredScopeRootUid = useDeferredValue(scopeRootUid)
  const isPending = deferredScopeRootUid !== scopeRootUid

  // Pre-build the children map once per effectiveState — O(n) scan reused across renders
  const childrenMap = useMemo(
    () => (effectiveState ? buildChildrenMap(effectiveState.people) : null),
    [effectiveState]
  )

  const metrics = useMemo(() => {
    if (!effectiveState || !childrenMap) return null
    const people = getSubtreePeople(deferredScopeRootUid, effectiveState.people, childrenMap)
    const total = people.length
    const managers = people.filter((p) => p.directReports > 0).length
    const ics = total - managers
    const ratio = managers > 0 ? (ics / managers).toFixed(1) : '—'
    const spans = people.filter((p) => p.directReports > 0).map((p) => p.directReports)
    const avgSpan = spans.length > 0 ? (spans.reduce((a, b) => a + b, 0) / spans.length).toFixed(1) : '—'

    const byGeo = countBy(people, (p) => p.rhatGeo || 'Unknown')
    const byCountry = countBy(people, (p) => p.co || 'Unknown')
    const byRole = countBy(people, (p) => p.rhatJobRole || 'Unknown')
    const byTeam = countBy(people, (p) => p.teamId ?? '')

    return { total, managers, ics, ratio, avgSpan, byGeo, byCountry, byRole, byTeam }
  }, [effectiveState, childrenMap, deferredScopeRootUid])

  if (!metrics) return <div className="p-4 text-sm text-gray-400">No data loaded</div>

  return (
    <div className="p-3 space-y-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">
            {scopeLabel}
          </div>
          {isPending && (
            <svg
              className="w-3 h-3 text-gray-400 animate-spin flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          )}
        </div>
        {scopeRootUid && (
          <button
            className="text-xs text-blue-500 hover:underline flex-shrink-0 ml-2"
            onClick={() => setSelected(null)}
          >
            Show all
          </button>
        )}
      </div>

      <div className={`transition-opacity duration-150 ${isPending ? 'opacity-50' : 'opacity-100'}`}>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <StatCard label="Total Associates" value={metrics.total.toLocaleString()} pending={isPending} />
          <StatCard label="Managers" value={metrics.managers.toLocaleString()} pending={isPending} />
          <StatCard label="ICs" value={metrics.ics.toLocaleString()} pending={isPending} />
          <StatCard label="IC:Mgr Ratio" value={metrics.ratio} sub="ICs per manager" pending={isPending} />
          <StatCard label="Avg Span" value={metrics.avgSpan} sub="direct reports/manager" pending={isPending} />
        </div>

        <Section title="By Geo">
          {Object.entries(metrics.byGeo)
            .sort((a, b) => b[1] - a[1])
            .map(([geo, count]) => (
              <Bar key={geo} label={geo} count={count} total={metrics.total} />
            ))}
        </Section>

        <Section title="By Role">
          {ROLE_LABELS.filter(({ role }) => metrics.byRole[role] > 0).map(({ role, color }) => (
            <Bar key={role} label={role} count={metrics.byRole[role] ?? 0} total={metrics.total} color={color} />
          ))}
        </Section>

        <Section title="By Country">
          {Object.entries(metrics.byCountry)
            .sort((a, b) => b[1] - a[1])
            .map(([country, count]) => (
              <Bar key={country} label={country} count={count} total={metrics.total} />
            ))}
        </Section>

        {Object.keys(metrics.byTeam).some((k) => k !== '') && (
          <Section title="By Team">
            {Object.entries(metrics.byTeam)
              .filter(([id]) => id !== '')
              .sort((a, b) => b[1] - a[1])
              .map(([teamId, count]) => {
                const name = effectiveState?.teams[teamId]?.name ?? teamId
                return (
                  <Bar
                    key={teamId}
                    label={name}
                    count={count}
                    total={metrics.total}
                    color={teamColor(teamId)}
                  />
                )
              })}
          </Section>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function Bar({ label, count, total, color }: { label: string; count: number; total: number; color?: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex-1 min-w-0 truncate text-gray-600" title={label}>{label}</div>
      <div className="flex-shrink-0 w-20 bg-gray-100 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color ?? '#64748b' }}
        />
      </div>
      <div className="flex-shrink-0 w-8 text-right text-gray-500">{count.toLocaleString()}</div>
    </div>
  )
}

function countBy<T>(arr: T[], key: (item: T) => string): Record<string, number> {
  const result: Record<string, number> = {}
  for (const item of arr) {
    const k = key(item)
    result[k] = (result[k] ?? 0) + 1
  }
  return result
}
