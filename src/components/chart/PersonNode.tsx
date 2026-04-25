import { memo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Handle, Position } from '@xyflow/react'
import { ChevronDown, ChevronRight, ChevronLeft, Users, MoreVertical, ChevronsLeftRight, ChevronsRightLeft, ChevronsUpDown, Plus, Pencil, Trash2 } from 'lucide-react'
import { roleColor } from '@/lib/role-colors'
import { roleAbbreviation } from '@/lib/role-abbreviation'
import { teamColor } from '@/lib/team-colors'
import { useAppStore } from '@/store'
import { NODE_WIDTH } from '@/lib/layout-engine'
import { AddPersonDialog } from '@/components/dialogs/AddPersonDialog'
import type { PersonRecord } from '@/types/person'
import type { CardFieldToggles, LayoutDirection } from '@/store'

interface PersonNodeData extends PersonRecord {
  isManager: boolean
  hasChildren: boolean
  isExpanded: boolean
  dimmed?: boolean
  cardFields?: CardFieldToggles
  direction?: LayoutDirection
  viewRootUid?: string | null
  hiddenPeersOf?: Set<string>
  teamName?: string | null
}

interface PersonNodeProps {
  id: string
  data: PersonNodeData
  selected: boolean
}

function formatHireDate(raw: string): string {
  if (raw.length < 8) return raw
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
}

function formatTenure(raw: string): string {
  if (raw.length < 8) return ''
  const hired = new Date(`${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`)
  if (isNaN(hired.getTime())) return ''
  const years = Math.floor((Date.now() - hired.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  if (years < 1) return '<1 year'
  return `${years} ${years === 1 ? 'year' : 'years'}`
}

export const PersonNode = memo(({ id, data }: PersonNodeProps) => {
  const toggleExpanded = useAppStore((s) => s.toggleExpanded)
  const setViewRoot = useAppStore((s) => s.setViewRoot)
  const togglePeerVisibility = useAppStore((s) => s.togglePeerVisibility)
  const requestDelete = useAppStore((s) => s.requestDelete)
  const isSelected = useAppStore((s) => s.ui.selectedNodeIds.has(id))
  const openMenuNodeId = useAppStore((s) => s.ui.openMenuNodeId)
  const setOpenMenu = useAppStore((s) => s.setOpenMenu)

  const menuOpen = openMenuNodeId === id
  const color = roleColor(data.rhatJobRole)
  const abbr = roleAbbreviation(data.rhatJobTitle)

  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | null>(null)
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const isPlaceholder = id.startsWith('placeholder-')

  const fields = data.cardFields ?? {
    title: true, location: true, city: false, hireDate: false,
    tenure: false, team: false, reportCounts: true,
  }
  const direction = data.direction ?? 'TB'
  const isLR = direction === 'LR'
  const targetPos = isLR ? Position.Left : Position.Top
  const sourcePos = isLR ? Position.Right : Position.Bottom

  const isViewRoot = data.viewRootUid === id
  const isPeerHidden = data.hiddenPeersOf?.has(id) ?? false

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setOpenMenu(null)
    requestDelete([id])
  }

  return (
    <>
      <div
        className={`
          relative bg-white rounded-lg shadow-sm border-2 select-none cursor-pointer
          transition-shadow hover:shadow-md
          ${isSelected ? 'border-blue-500 shadow-blue-200' : 'border-gray-200'}
          ${data.isManager ? 'border-l-4' : ''}
        `}
        onDoubleClick={(e) => {
          e.stopPropagation()
          if (data.hasChildren) toggleExpanded(id)
        }}
        style={{
          width: NODE_WIDTH,
          borderLeftColor: data.isManager ? color : undefined,
          borderLeftWidth: data.isManager ? 4 : undefined,
          opacity: data.dimmed ? 0.25 : undefined,
          transition: 'opacity 0.2s ease',
        }}
      >
        <Handle type="target" position={targetPos} className="!bg-gray-300 !border-gray-400 !w-2 !h-2" />

        {/* Role color accent bar for ICs */}
        {!data.isManager && (
          <div
            className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
            style={{ backgroundColor: color }}
          />
        )}

        {/* Context menu button */}
        <div className="absolute top-1 right-1 z-10">
          <button
            ref={menuBtnRef}
            className="w-5 h-5 flex items-center justify-center rounded text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
            onClick={(e) => { e.stopPropagation(); setOpenMenu(menuOpen ? null : id) }}
            title="Options"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Menu dropdown — portaled to body so it floats above all ReactFlow nodes */}
        {menuOpen && menuBtnRef.current && createPortal(
          <ContextMenuDropdown
            btnEl={menuBtnRef.current}
            id={id}
            data={data}
            isViewRoot={isViewRoot}
            isPeerHidden={isPeerHidden}
            setViewRoot={setViewRoot}
            togglePeerVisibility={togglePeerVisibility}
            toggleExpanded={toggleExpanded}
            setOpenMenu={setOpenMenu}
            isPlaceholder={isPlaceholder}
            onAddReport={() => { setOpenMenu(null); setDialogMode('add') }}
            onEditReport={() => { setOpenMenu(null); setDialogMode('edit') }}
            onDelete={handleDelete}
          />,
          document.body
        )}

        <div className="px-3 pt-2 pb-2">
          {/* Name + badge row */}
          <div className="flex items-start justify-between gap-1 pr-4">
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

          {/* Job title */}
          {fields.title && (
            <div className="text-xs text-gray-500 truncate mt-0.5" title={data.rhatJobTitle}>
              {data.rhatJobTitle || '—'}
            </div>
          )}

          {/* Location (geo · country) */}
          {fields.location && (
            <div className="text-xs text-gray-400 mt-0.5 truncate">
              {data.rhatGeo} · {data.co}
            </div>
          )}

          {/* City */}
          {fields.city && data.l && (
            <div className="text-xs text-gray-400 truncate">{data.l}</div>
          )}

          {/* Hire date */}
          {fields.hireDate && data.rhatHireDate && (
            <div className="text-xs text-gray-400 truncate">
              Hired {formatHireDate(data.rhatHireDate)}
            </div>
          )}

          {/* Tenure */}
          {fields.tenure && data.rhatHireDate && (
            <div className="text-xs text-gray-400 truncate">
              {formatTenure(data.rhatHireDate)}
            </div>
          )}

          {/* Team */}
          {fields.team && data.teamId && (
            <div className="flex items-center gap-1 text-xs text-gray-400 truncate mt-0.5">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: teamColor(data.teamId) }}
              />
              <span className="truncate">{data.teamName ?? data.teamId}</span>
            </div>
          )}

          {/* Report counts — managers only */}
          {fields.reportCounts && data.isManager && (
            <div className="flex items-center justify-end gap-1 text-xs text-gray-500 mt-1">
              <Users className="w-3 h-3" />
              <span>{data.directReports}</span>
              <span className="text-gray-300">/</span>
              <span>{data.totalReports}</span>
            </div>
          )}
        </div>

        {/* Expand/collapse toggle — bottom-center in TB, right-center in LR */}
        {data.hasChildren && (
          <button
            className={`absolute w-6 h-6 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50 shadow-sm z-10 ${
              isLR
                ? 'top-1/2 -right-3 -translate-y-1/2'
                : '-bottom-3 left-1/2 -translate-x-1/2'
            }`}
            onClick={(e) => {
              e.stopPropagation()
              toggleExpanded(id)
            }}
          >
            {isLR ? (
              data.isExpanded
                ? <ChevronRight className="w-3 h-3 text-gray-500" />
                : <ChevronLeft className="w-3 h-3 text-gray-500" />
            ) : (
              data.isExpanded
                ? <ChevronDown className="w-3 h-3 text-gray-500" />
                : <ChevronRight className="w-3 h-3 text-gray-500" />
            )}
          </button>
        )}

        {/* Peer visibility toggle — right-center in TB, bottom-center in LR */}
        {data.managerUid !== null && (
          <button
            className={`absolute w-6 h-6 rounded-full bg-white border flex items-center justify-center hover:bg-gray-50 shadow-sm z-10 ${
              isPeerHidden ? 'border-blue-400' : 'border-gray-300'
            } ${
              isLR
                ? '-bottom-3 left-1/2 -translate-x-1/2'
                : 'top-1/2 -right-3 -translate-y-1/2'
            }`}
            title={isPeerHidden ? 'Show peers' : 'Hide peers'}
            onClick={(e) => {
              e.stopPropagation()
              togglePeerVisibility(id)
            }}
          >
            {isLR ? (
              isPeerHidden
                ? <ChevronsUpDown className="w-3 h-3 text-blue-500" />
                : <ChevronsUpDown className="w-3 h-3 text-gray-400" />
            ) : (
              isPeerHidden
                ? <ChevronsLeftRight className="w-3 h-3 text-blue-500" />
                : <ChevronsRightLeft className="w-3 h-3 text-gray-400" />
            )}
          </button>
        )}

        <Handle type="source" position={sourcePos} className="!bg-gray-300 !border-gray-400 !w-2 !h-2" />
      </div>

      {/* Add/Edit person dialog — portaled to body so it floats above all ReactFlow nodes */}
      {dialogMode && createPortal(
        <AddPersonDialog
          managerUid={id}
          editPerson={dialogMode === 'edit' ? data as PersonRecord : undefined}
          onClose={() => setDialogMode(null)}
        />,
        document.body
      )}
    </>
  )
})

PersonNode.displayName = 'PersonNode'

interface ContextMenuDropdownProps {
  btnEl: HTMLButtonElement
  id: string
  data: PersonNodeData
  isViewRoot: boolean
  isPeerHidden: boolean
  isPlaceholder: boolean
  setViewRoot: (uid: string | null) => void
  togglePeerVisibility: (uid: string) => void
  toggleExpanded: (nodeId: string) => void
  setOpenMenu: (nodeId: string | null) => void
  onAddReport: () => void
  onEditReport: () => void
  onDelete: (e: React.MouseEvent) => void
}

function ContextMenuDropdown({
  btnEl, id, data, isViewRoot, isPeerHidden, isPlaceholder,
  setViewRoot, togglePeerVisibility, toggleExpanded, setOpenMenu,
  onAddReport, onEditReport, onDelete,
}: ContextMenuDropdownProps) {
  const rect = btnEl.getBoundingClientRect()

  return (
    <div
      className="fixed bg-white border border-gray-200 rounded shadow-lg py-1 min-w-[160px]"
      style={{ top: rect.bottom + 2, left: rect.right - 160, zIndex: 9999 }}
    >
      {data.managerUid !== null && (
        <button
          className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          onClick={(e) => {
            e.stopPropagation()
            if (isViewRoot) {
              setViewRoot(data.managerUid ?? null)
              if (!isPeerHidden) togglePeerVisibility(id)
            } else {
              setViewRoot(id)
            }
            setOpenMenu(null)
          }}
        >
          {isViewRoot ? 'Show manager' : 'Hide manager'}
        </button>
      )}
      <button
        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
        onClick={(e) => {
          e.stopPropagation()
          togglePeerVisibility(id)
          setOpenMenu(null)
        }}
      >
        {isPeerHidden ? 'Show peers' : 'Hide peers'}
      </button>
      {data.hasChildren && (
        <button
          className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          onClick={(e) => {
            e.stopPropagation()
            toggleExpanded(id)
            setOpenMenu(null)
          }}
        >
          {data.isExpanded ? 'Hide reports' : 'Show reports'}
        </button>
      )}

      <div className="border-t border-gray-100 my-1" />

      <button
        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
        onClick={onAddReport}
      >
        <Plus className="w-3 h-3 text-gray-400" />
        Add new report
      </button>

      {isPlaceholder && (
        <button
          className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          onClick={onEditReport}
        >
          <Pencil className="w-3 h-3 text-gray-400" />
          Edit card
        </button>
      )}

      {data.managerUid !== null && (
        <button
          className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
          onClick={onDelete}
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </button>
      )}
    </div>
  )
}
