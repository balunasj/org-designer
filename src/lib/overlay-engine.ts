import type { BaselineData, PersonRecord, TeamRecord } from '@/types/person'
import type { Overlay } from '@/types/overlay'
import type { OrgScopeNode, EffectiveState } from '@/types/org'

export function applyOverlay(baseline: BaselineData, overlay: Overlay): EffectiveState {
  // Deep-copy people and hierarchy so we can mutate freely
  const people: Record<string, PersonRecord> = {}
  for (const [uid, p] of Object.entries(baseline.people)) {
    people[uid] = { ...p }
  }

  const teams: Record<string, TeamRecord> = { ...baseline.teams }
  const scopeNodes: Record<string, OrgScopeNode> = {}
  const scopeAssignments: Record<string, string> = {}

  // Initialize scope nodes from baseline teams
  for (const team of Object.values(baseline.teams)) {
    scopeNodes[team.id] = {
      kind: 'scope',
      id: team.id,
      name: team.name,
      managerUid: team.managerUid,
      teamType: team.type,
      description: team.description || undefined,
    }
    if (team.managerUid) {
      scopeAssignments[team.id] = team.managerUid
    }
  }

  // Apply actions in order
  for (const action of overlay.actions) {
    switch (action.type) {
      case 'move': {
        const person = people[action.uid]
        if (!person) break
        if (action.moveSubtree) {
          // Move the person and all descendants
          const subtree = getSubtree(action.uid, people)
          for (const uid of subtree) {
            if (uid === action.uid) {
              people[uid] = { ...people[uid], managerUid: action.toManagerUid }
            }
            // Descendants retain their existing managerUid within the subtree
          }
        } else {
          // Move just the individual — reports go to former manager's manager
          const orphanManager = action.fromManagerUid
          const directReports = Object.values(people).filter((p) => p.managerUid === action.uid)
          for (const report of directReports) {
            people[report.uid] = { ...people[report.uid], managerUid: orphanManager }
          }
          people[action.uid] = { ...person, managerUid: action.toManagerUid }
        }
        break
      }

      case 'scope_create': {
        scopeNodes[action.scopeId] = {
          kind: 'scope',
          id: action.scopeId,
          name: action.name,
          managerUid: action.parentManagerUid,
        }
        scopeAssignments[action.scopeId] = action.parentManagerUid
        break
      }

      case 'scope_assign': {
        const scope = scopeNodes[action.scopeId]
        if (scope) {
          scopeNodes[action.scopeId] = { ...scope, managerUid: action.toManagerUid }
          scopeAssignments[action.scopeId] = action.toManagerUid
        }
        break
      }

      case 'scope_divide': {
        // Remove original scope, create new sub-scopes under same manager
        const original = scopeNodes[action.originalScopeId]
        const parentManagerUid = original?.managerUid ?? null
        delete scopeNodes[action.originalScopeId]
        delete scopeAssignments[action.originalScopeId]
        for (const ns of action.newScopes) {
          scopeNodes[ns.id] = {
            kind: 'scope',
            id: ns.id,
            name: ns.name,
            managerUid: parentManagerUid,
          }
          if (parentManagerUid) scopeAssignments[ns.id] = parentManagerUid
        }
        break
      }

      case 'scope_rename': {
        const scope = scopeNodes[action.scopeId]
        if (scope) scopeNodes[action.scopeId] = { ...scope, name: action.toName }
        break
      }

      case 'add_person': {
        people[action.person.uid] = { ...action.person, directReports: 0, totalReports: 0 }
        break
      }

      case 'edit_person': {
        const person = people[action.uid]
        if (person) {
          people[action.uid] = { ...person, ...action.updates, uid: action.uid }
        }
        break
      }

      case 'delete_person': {
        // Reassign direct reports to the deleted person's manager
        for (const p of Object.values(people)) {
          if (p.managerUid === action.uid) {
            people[p.uid] = { ...p, managerUid: action.reassignTo }
          }
        }
        delete people[action.uid]
        break
      }
    }
  }

  // Recompute directReports and totalReports from the effective hierarchy
  recomputeCounts(people)

  const hierarchy: Record<string, string | null> = {}
  for (const [uid, p] of Object.entries(people)) {
    hierarchy[uid] = p.managerUid
  }

  return { people, teams, hierarchy, scopeNodes, scopeAssignments }
}

function getSubtree(rootUid: string, people: Record<string, PersonRecord>): string[] {
  const result: string[] = []
  const queue = [rootUid]
  while (queue.length > 0) {
    const uid = queue.shift()!
    result.push(uid)
    for (const [id, p] of Object.entries(people)) {
      if (p.managerUid === uid) queue.push(id)
    }
  }
  return result
}

function recomputeCounts(people: Record<string, PersonRecord>) {
  const directMap: Record<string, number> = {}
  for (const p of Object.values(people)) {
    if (p.managerUid) {
      directMap[p.managerUid] = (directMap[p.managerUid] ?? 0) + 1
    }
  }

  // Total reports requires a bottom-up traversal
  const totalMap: Record<string, number> = {}
  const children: Record<string, string[]> = {}
  for (const p of Object.values(people)) {
    if (p.managerUid) {
      if (!children[p.managerUid]) children[p.managerUid] = []
      children[p.managerUid].push(p.uid)
    }
  }

  function computeTotal(uid: string): number {
    if (totalMap[uid] !== undefined) return totalMap[uid]
    const kids = children[uid] ?? []
    let total = kids.length
    for (const kid of kids) total += computeTotal(kid)
    totalMap[uid] = total
    return total
  }

  for (const uid of Object.keys(people)) {
    people[uid] = {
      ...people[uid],
      directReports: directMap[uid] ?? 0,
      totalReports: computeTotal(uid),
    }
  }
}
