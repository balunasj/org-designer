import dagre from '@dagrejs/dagre'
import type { Node, Edge } from '@xyflow/react'
import type { EffectiveState } from '@/types/org'

export const NODE_WIDTH = 220
export const NODE_HEIGHT = 90
export const SCOPE_WIDTH = 200
export const SCOPE_HEIGHT = 60

export interface OrgTreeNode {
  id: string
  type: 'person' | 'scope'
  parentId: string | null
  data: Record<string, unknown>
}

export function computeLayout(
  state: EffectiveState,
  expandedNodes: Set<string>,
  rootUid: string
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 80, marginx: 20, marginy: 20 })
  g.setDefaultEdgeLabel(() => ({}))

  const visiblePersonIds = new Set<string>()
  const visibleScopeIds = new Set<string>()

  // BFS: only include children of expanded nodes
  const queue: string[] = [rootUid]
  visiblePersonIds.add(rootUid)

  while (queue.length > 0) {
    const uid = queue.shift()!
    if (!expandedNodes.has(uid)) continue

    // Add person children
    for (const [childUid, p] of Object.entries(state.people)) {
      if (p.managerUid === uid && !visiblePersonIds.has(childUid)) {
        visiblePersonIds.add(childUid)
        queue.push(childUid)
      }
    }

    // Add scope nodes assigned to this manager
    for (const [scopeId, scope] of Object.entries(state.scopeNodes)) {
      if (scope.managerUid === uid) {
        visibleScopeIds.add(scopeId)
      }
    }
  }

  // Add nodes to dagre graph
  for (const uid of visiblePersonIds) {
    const person = state.people[uid]
    if (!person) continue
    const isManager = person.directReports > 0
    g.setNode(uid, { width: NODE_WIDTH, height: NODE_HEIGHT, data: { ...person, isManager } })
  }

  for (const scopeId of visibleScopeIds) {
    const scope = state.scopeNodes[scopeId]
    if (!scope) continue
    g.setNode(`scope:${scopeId}`, { width: SCOPE_WIDTH, height: SCOPE_HEIGHT, data: { ...scope } })
  }

  // Add edges
  for (const uid of visiblePersonIds) {
    const person = state.people[uid]
    if (person.managerUid && visiblePersonIds.has(person.managerUid)) {
      g.setEdge(person.managerUid, uid)
    }
  }

  for (const scopeId of visibleScopeIds) {
    const scope = state.scopeNodes[scopeId]
    if (scope.managerUid && visiblePersonIds.has(scope.managerUid)) {
      g.setEdge(scope.managerUid, `scope:${scopeId}`)
    }
  }

  dagre.layout(g)

  const nodes: Node[] = []
  const edges: Edge[] = []

  for (const uid of visiblePersonIds) {
    const n = g.node(uid)
    if (!n) continue
    const person = state.people[uid]
    const hasChildren =
      Object.values(state.people).some((p) => p.managerUid === uid) ||
      Object.values(state.scopeNodes).some((s) => s.managerUid === uid)

    nodes.push({
      id: uid,
      type: person.directReports > 0 ? 'manager' : 'person',
      position: { x: n.x - NODE_WIDTH / 2, y: n.y - NODE_HEIGHT / 2 },
      data: {
        ...person,
        isManager: person.directReports > 0,
        hasChildren,
        isExpanded: expandedNodes.has(uid),
      },
    })
  }

  for (const scopeId of visibleScopeIds) {
    const n = g.node(`scope:${scopeId}`)
    if (!n) continue
    const scope = state.scopeNodes[scopeId]
    nodes.push({
      id: `scope:${scopeId}`,
      type: 'scope',
      position: { x: n.x - SCOPE_WIDTH / 2, y: n.y - SCOPE_HEIGHT / 2 },
      data: { ...scope },
    })
  }

  // Build edges from the graph
  for (const e of g.edges()) {
    edges.push({
      id: `${e.v}->${e.w}`,
      source: e.v,
      target: e.w,
      type: 'smoothstep',
      style: { stroke: '#94a3b8', strokeWidth: 1.5 },
    })
  }

  return { nodes, edges }
}
