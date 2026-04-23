import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { FolderOpen } from 'lucide-react'
import type { OrgScopeNode } from '@/types/org'

interface ScopeNodeProps {
  data: OrgScopeNode
  selected: boolean
}

export const ScopeNode = memo(({ data, selected }: ScopeNodeProps) => {
  return (
    <div
      className={`
        bg-slate-50 rounded-lg border-2 border-dashed flex items-center gap-2 px-3 py-2
        select-none cursor-pointer transition-colors hover:bg-slate-100
        ${selected ? 'border-blue-400' : 'border-slate-300'}
      `}
      style={{ width: 200, height: 60 }}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-300 !border-slate-400 !w-2 !h-2" />

      <FolderOpen className="w-4 h-4 text-slate-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-700 truncate">{data.name}</div>
        <div className="text-xs text-slate-400">Scope</div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-slate-300 !border-slate-400 !w-2 !h-2" />
    </div>
  )
})

ScopeNode.displayName = 'ScopeNode'
