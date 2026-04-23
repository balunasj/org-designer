import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { ChevronDown, ChevronRight, Users } from 'lucide-react'
import { roleColor } from '@/lib/role-colors'
import { roleAbbreviation } from '@/lib/role-abbreviation'
import { useAppStore } from '@/store'
import type { PersonRecord } from '@/types/person'

interface PersonNodeData extends PersonRecord {
  isManager: boolean
  hasChildren: boolean
  isExpanded: boolean
}

interface PersonNodeProps {
  id: string
  data: PersonNodeData
  selected: boolean
}

export const PersonNode = memo(({ id, data, selected }: PersonNodeProps) => {
  const toggleExpanded = useAppStore((s) => s.toggleExpanded)
  const color = roleColor(data.rhatJobRole)
  const abbr = roleAbbreviation(data.rhatJobTitle)

  return (
    <div
      className={`
        relative bg-white rounded-lg shadow-sm border-2 select-none cursor-pointer
        transition-shadow hover:shadow-md
        ${selected ? 'border-blue-500 shadow-blue-200' : 'border-gray-200'}
        ${data.isManager ? 'border-l-4' : ''}
      `}
      style={{
        width: 220,
        minHeight: 90,
        borderLeftColor: data.isManager ? color : undefined,
        borderLeftWidth: data.isManager ? 4 : undefined,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-300 !border-gray-400 !w-2 !h-2" />

      {/* Role color accent bar for ICs */}
      {!data.isManager && (
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
          style={{ backgroundColor: color }}
        />
      )}

      <div className="px-3 pt-2 pb-2">
        {/* Name row */}
        <div className="flex items-start justify-between gap-1">
          <div className="font-semibold text-gray-900 text-sm leading-tight truncate flex-1">
            {data.cn}
          </div>
          <span
            className="text-xs font-mono px-1.5 py-0.5 rounded flex-shrink-0 text-white"
            style={{ backgroundColor: color }}
            title={data.rhatJobTitle}
          >
            {abbr}
          </span>
        </div>

        {/* Title */}
        <div className="text-xs text-gray-500 truncate mt-0.5" title={data.rhatJobTitle}>
          {data.rhatJobTitle || '—'}
        </div>

        {/* Location + role */}
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs text-gray-400">
            {data.rhatGeo} · {data.co}
          </span>
          {data.isManager && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Users className="w-3 h-3" />
              <span>{data.directReports}</span>
              <span className="text-gray-300">/</span>
              <span>{data.totalReports}</span>
            </div>
          )}
        </div>
      </div>

      {/* Expand/collapse toggle */}
      {data.hasChildren && (
        <button
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50 shadow-sm z-10"
          onClick={(e) => {
            e.stopPropagation()
            toggleExpanded(id)
          }}
        >
          {data.isExpanded ? (
            <ChevronDown className="w-3 h-3 text-gray-500" />
          ) : (
            <ChevronRight className="w-3 h-3 text-gray-500" />
          )}
        </button>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-gray-300 !border-gray-400 !w-2 !h-2" />
    </div>
  )
})

PersonNode.displayName = 'PersonNode'
