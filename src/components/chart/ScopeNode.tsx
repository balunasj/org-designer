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
      className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed bg-slate-50 px-3 py-2 transition-colors select-none hover:bg-slate-100 ${selected ? 'border-blue-400' : 'border-slate-300'} `}
      style={{
        width: 200,
        height: 60,
        borderLeftColor: color,
        borderLeftWidth: 4,
        borderLeftStyle: 'solid',
      }}
      title={data.description ?? data.name}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-slate-400 !bg-slate-300"
      />

      <FolderOpen className="h-4 w-4 flex-shrink-0" style={{ color }} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-slate-700">{data.name}</div>
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

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !border-slate-400 !bg-slate-300"
      />
    </div>
  )
})

ScopeNode.displayName = 'ScopeNode'
