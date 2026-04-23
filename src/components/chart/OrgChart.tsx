import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  type NodeTypes,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { PersonNode } from './PersonNode'
import { ScopeNode } from './ScopeNode'
import { useAppStore } from '@/store'
import { computeLayout } from '@/lib/layout-engine'
import type { MoveAction } from '@/types/overlay'

const nodeTypes: NodeTypes = {
  person: PersonNode as never,
  manager: PersonNode as never,
  scope: ScopeNode as never,
}

function OrgChartInner() {
  const { fitView } = useReactFlow()
  const effectiveState = useAppStore((s) => s.effectiveState)
  const baseline = useAppStore((s) => s.baseline)
  const ui = useAppStore((s) => s.ui)
  const setSelected = useAppStore((s) => s.setSelected)
  const pushAction = useAppStore((s) => s.pushAction)

  const shiftRef = useRef(false)
  const draggingRef = useRef<{ id: string; originalManagerUid: string | null } | null>(null)

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Shift') shiftRef.current = true }
    const up = (e: KeyboardEvent) => { if (e.key === 'Shift') shiftRef.current = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  const { nodes, edges } = useMemo(() => {
    if (!effectiveState || !baseline) return { nodes: [], edges: [] }
    return computeLayout(effectiveState, ui.expandedNodes, baseline.rootUid)
  }, [effectiveState, ui.expandedNodes, baseline])

  // Fit view when layout changes significantly (first load or expand all)
  const prevNodeCount = useRef(0)
  useEffect(() => {
    if (Math.abs(nodes.length - prevNodeCount.current) > 3) {
      setTimeout(() => fitView({ padding: 0.1 }), 50)
    }
    prevNodeCount.current = nodes.length
  }, [nodes.length, fitView])

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelected(node.id)
  }, [setSelected])

  const onPaneClick = useCallback(() => setSelected(null), [setSelected])

  const onNodeDragStart = useCallback((_: React.MouseEvent, node: Node) => {
    if (!effectiveState) return
    const isScope = node.id.startsWith('scope:')
    if (isScope) return
    const person = effectiveState.people[node.id]
    if (!person) return
    draggingRef.current = { id: node.id, originalManagerUid: person.managerUid }
  }, [effectiveState])

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, draggedNode: Node, allNodes: Node[]) => {
      if (!draggingRef.current || !effectiveState) return
      const { id, originalManagerUid } = draggingRef.current
      draggingRef.current = null

      // Find the closest person/manager node to drop onto (excluding self)
      const draggedPos = draggedNode.position
      let closestId: string | null = null
      let minDist = 150 // minimum overlap distance to register a drop

      for (const n of allNodes) {
        if (n.id === id || n.id.startsWith('scope:')) continue
        if (!effectiveState.people[n.id]) continue
        const dx = Math.abs(n.position.x - draggedPos.x)
        const dy = Math.abs(n.position.y - draggedPos.y)
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < minDist) {
          minDist = dist
          closestId = n.id
        }
      }

      if (!closestId || closestId === originalManagerUid) return
      // Prevent dropping onto own descendant
      const subtree = getSubtreeIds(id, effectiveState.people)
      if (subtree.has(closestId)) return

      const action: MoveAction = {
        type: 'move',
        uid: id,
        fromManagerUid: originalManagerUid,
        toManagerUid: closestId,
        moveSubtree: !shiftRef.current,
        timestamp: new Date().toISOString(),
      }
      pushAction(action)
    },
    [effectiveState, pushAction]
  )

  if (!baseline) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg font-medium">No data loaded</p>
          <p className="text-sm mt-1">Run <code className="bg-gray-100 px-1 rounded">npm run import</code> then refresh</p>
        </div>
      </div>
    )
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      onNodeDragStart={onNodeDragStart}
      onNodeDragStop={onNodeDragStop}
      fitView
      fitViewOptions={{ padding: 0.1 }}
      minZoom={0.1}
      maxZoom={2}
      nodesDraggable={true}
      nodesConnectable={false}
      elementsSelectable={true}
    >
      <Background color="#e2e8f0" gap={20} />
      <Controls />
      <MiniMap
        nodeColor={(node) => {
          if (node.type === 'scope') return '#cbd5e1'
          const data = node.data as { rhatJobRole?: string; isManager?: boolean }
          return data.isManager ? '#1e40af' : '#64748b'
        }}
        style={{ background: '#f8fafc' }}
      />
    </ReactFlow>
  )
}

function getSubtreeIds(rootUid: string, people: Record<string, { managerUid: string | null }>): Set<string> {
  const result = new Set<string>()
  const queue = [rootUid]
  while (queue.length > 0) {
    const uid = queue.shift()!
    result.add(uid)
    for (const [id, p] of Object.entries(people)) {
      if (p.managerUid === uid && !result.has(id)) queue.push(id)
    }
  }
  return result
}

export function OrgChart() {
  return (
    <ReactFlowProvider>
      <OrgChartInner />
    </ReactFlowProvider>
  )
}
