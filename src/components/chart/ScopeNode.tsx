import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { FolderOpen } from 'lucide-react'
import type { OrgScopeNode } from '@/types/org'
import { teamColor } from '@/lib/team-colors'

const TYPE_LABEL: Record<string, string> = {
  org: 'Org',
  team_group: 'Group',
  team: 'Team',
}

interface ScopeNodeProps {
  data: OrgScopeNode & { memberCount?: number }
  selected: boolean
}

export const ScopeNode = memo(({ data, selected }: ScopeNodeProps) => {
  const color = teamColor(data.id)
  const typeLabel = data.teamType ? (TYPE_LABEL[data.teamType] ?? 'Scope') : 'Scope'

  return (
    <div
      className={`
        bg-slate-50 rounded-lg border-2 border-dashed flex items-center gap-2 px-3 py-2
        select-none cursor-pointer transition-colors hover:bg-slate-100
        ${selected ? 'border-blue-400' : 'border-slate-300'}
      `}
      style={{ width: 200, height: 60, borderLeftColor: color, borderLeftWidth: 4, borderLeftStyle: 'solid' }}
      title={data.description ?? data.name}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-300 !border-slate-400 !w-2 !h-2" />

      <FolderOpen className="w-4 h-4 flex-shrink-0" style={{ color }} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-700 truncate">{data.name}</div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span>{typeLabel}</span>
          {data.memberCount !== undefined && data.memberCount > 0 && (
            <>
              <span>·</span>
              <span>{data.memberCount.toLocaleString()}</span>
            </>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-slate-300 !border-slate-400 !w-2 !h-2" />
    </div>
  )
})

ScopeNode.displayName = 'ScopeNode'
