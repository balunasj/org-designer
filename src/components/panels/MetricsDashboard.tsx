import { useMemo } from 'react'
import { useAppStore } from '@/store'
import { ROLE_LABELS } from '@/lib/role-colors'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
}

function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

export function MetricsDashboard() {
  const effectiveState = useAppStore((s) => s.effectiveState)

  const metrics = useMemo(() => {
    if (!effectiveState) return null
    const people = Object.values(effectiveState.people)
    const total = people.length
    const managers = people.filter((p) => p.directReports > 0).length
    const ics = total - managers
    const ratio = managers > 0 ? (ics / managers).toFixed(1) : '—'
    const spans = people.filter((p) => p.directReports > 0).map((p) => p.directReports)
    const avgSpan = spans.length > 0 ? (spans.reduce((a, b) => a + b, 0) / spans.length).toFixed(1) : '—'

    const byGeo = countBy(people, (p) => p.rhatGeo || 'Unknown')
    const byCountry = countBy(people, (p) => p.co || 'Unknown')
    const byRole = countBy(people, (p) => p.rhatJobRole || 'Unknown')

    return { total, managers, ics, ratio, avgSpan, byGeo, byCountry, byRole }
  }, [effectiveState])

  if (!metrics) return <div className="p-4 text-sm text-gray-400">No data loaded</div>

  return (
    <div className="p-3 space-y-4 overflow-y-auto">
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Total Associates" value={metrics.total} />
        <StatCard label="Managers" value={metrics.managers} />
        <StatCard label="ICs" value={metrics.ics} />
        <StatCard label="IC:Mgr Ratio" value={metrics.ratio} sub="ICs per manager" />
        <StatCard label="Avg Span" value={metrics.avgSpan} sub="direct reports/manager" />
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
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
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
      <div className="flex-shrink-0 w-6 text-right text-gray-500">{count}</div>
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
