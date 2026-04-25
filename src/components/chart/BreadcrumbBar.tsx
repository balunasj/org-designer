import { useEffect, useRef, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useAppStore } from '@/store'

export function BreadcrumbBar() {
  const viewRootUid = useAppStore((s) => s.ui.viewRootUid)
  const selectedNodeId = useAppStore((s) => s.ui.selectedNodeId)
  const effectiveState = useAppStore((s) => s.effectiveState)
  const baseline = useAppStore((s) => s.baseline)
  const setSelected = useAppStore((s) => s.setSelected)

  const containerRef = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState(false)

  if (!effectiveState || !baseline) return null

  const people = effectiveState.people
  const orgRootUid = baseline.rootUid
  const activeUid = selectedNodeId ?? viewRootUid ?? orgRootUid

  // Build chain from org root down to activeUid
  const chain: string[] = [activeUid]
  let cur = people[activeUid]?.managerUid
  while (cur) {
    chain.unshift(cur)
    cur = people[cur]?.managerUid ?? null
  }

  return (
    <_BreadcrumbBarInner
      chain={chain}
      activeUid={activeUid}
      people={people}
      setSelected={setSelected}
      containerRef={containerRef}
      collapsed={collapsed}
      setCollapsed={setCollapsed}
    />
  )
}

interface InnerProps {
  chain: string[]
  activeUid: string
  people: Record<string, { cn: string; managerUid: string | null }>
  setSelected: (nodeId: string | null, additive?: boolean) => void
  containerRef: React.RefObject<HTMLDivElement | null>
  collapsed: boolean
  setCollapsed: (v: boolean) => void
}

function _BreadcrumbBarInner({
  chain, activeUid, people, setSelected,
  containerRef, collapsed, setCollapsed,
}: InnerProps) {
  // Detect overflow and collapse middle items when needed
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const check = () => setCollapsed(el.scrollWidth > el.clientWidth + 1)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [chain, containerRef, setCollapsed])

  // When chain changes, reset to uncollapsed so we re-measure
  useEffect(() => { setCollapsed(false) }, [chain, setCollapsed])

  const first = chain[0]
  const last = chain[chain.length - 1]
  const middle = chain.slice(1, -1)
  const isSingleItem = chain.length === 1

  const renderItem = (uid: string, i: number) => {
    const isActive = uid === activeUid
    const name = people[uid]?.cn ?? uid
    return (
      <span key={uid} className="flex items-center gap-1 flex-shrink-0">
        {i > 0 && <ChevronRight className="w-3 h-3 text-gray-300" />}
        {isActive ? (
          <span className="text-gray-700 font-medium truncate max-w-[200px]" title={name}>{name}</span>
        ) : (
          <button
            onClick={() => setSelected(uid)}
            className="text-blue-600 hover:underline whitespace-nowrap"
            title={name}
          >
            {name}
          </button>
        )}
      </span>
    )
  }

  return (
    <div
      ref={containerRef}
      className="h-8 border-b border-gray-200 bg-white flex items-center px-4 gap-1 text-xs flex-shrink-0 overflow-hidden"
    >
      {isSingleItem ? (
        renderItem(first, 0)
      ) : collapsed ? (
        // Collapsed: show first > … > last
        <>
          {renderItem(first, 0)}
          <span className="flex items-center gap-1 flex-shrink-0">
            <ChevronRight className="w-3 h-3 text-gray-300" />
            <span className="text-gray-400 px-0.5">…</span>
            <ChevronRight className="w-3 h-3 text-gray-300" />
          </span>
          {renderItem(last, 1)}
        </>
      ) : (
        // Expanded: show full chain
        <>
          {renderItem(first, 0)}
          {middle.map((uid, i) => renderItem(uid, i + 1))}
          {renderItem(last, chain.length - 1)}
        </>
      )}
    </div>
  )
}
