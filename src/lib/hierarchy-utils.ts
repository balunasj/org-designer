import type { PersonRecord } from '@/types/person'

/** Build a parent→children lookup in a single O(n) scan. */
export function buildChildrenMap(
  people: Record<string, { managerUid: string | null }>
): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const [id, p] of Object.entries(people)) {
    if (p.managerUid === null) continue
    const siblings = map.get(p.managerUid)
    if (siblings) siblings.push(id)
    else map.set(p.managerUid, [id])
  }
  return map
}

/** Collect all UIDs in the subtree rooted at rootUid (inclusive).
 *  Pass a pre-built childrenMap for O(subtree) performance; omit to build on the fly. */
export function getSubtreeIds(
  rootUid: string,
  people: Record<string, { managerUid: string | null }>,
  childrenMap?: Map<string, string[]>
): Set<string> {
  const map = childrenMap ?? buildChildrenMap(people)
  const result = new Set<string>()
  const queue = [rootUid]
  while (queue.length > 0) {
    const uid = queue.shift()!
    result.add(uid)
    const children = map.get(uid)
    if (children) for (const child of children) if (!result.has(child)) queue.push(child)
  }
  return result
}

/** Return PersonRecord[] for a subtree. If rootUid is null, return all people. */
export function getSubtreePeople(
  rootUid: string | null,
  people: Record<string, PersonRecord>,
  childrenMap?: Map<string, string[]>
): PersonRecord[] {
  if (rootUid === null) return Object.values(people)
  const ids = getSubtreeIds(rootUid, people, childrenMap)
  return Object.values(people).filter((p) => ids.has(p.uid))
}
