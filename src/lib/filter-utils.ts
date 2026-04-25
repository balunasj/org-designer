import type { PersonRecord } from '@/types/person'
import type { FilterState } from '@/store'

function isUnderManager(
  person: PersonRecord,
  managerUid: string,
  people: Record<string, PersonRecord>
): boolean {
  let cur = person.managerUid
  while (cur) {
    if (cur === managerUid) return true
    cur = people[cur]?.managerUid ?? null
  }
  return false
}

export function matchesFilter(
  person: PersonRecord,
  filters: FilterState,
  people: Record<string, PersonRecord>
): boolean {
  if (filters.managerUid && !isUnderManager(person, filters.managerUid, people)) return false
  if (filters.geos.length > 0 && !filters.geos.includes(person.rhatGeo)) return false
  if (filters.countries.length > 0 && !filters.countries.includes(person.co)) return false
  if (filters.jobRoles.length > 0 && !filters.jobRoles.includes(person.rhatJobRole)) return false
  if (filters.teams.length > 0 && !filters.teams.includes(person.teamId ?? '')) return false
  if (filters.titleSearch) {
    const search = filters.titleSearch.toLowerCase()
    const inTitle = person.rhatJobTitle.toLowerCase().includes(search)
    const inName = person.cn.toLowerCase().includes(search)
    if (!inTitle && !inName) return false
  }
  return true
}

export function hasActiveFilters(filters: FilterState): boolean {
  return (
    filters.geos.length > 0 ||
    filters.countries.length > 0 ||
    filters.jobRoles.length > 0 ||
    filters.teams.length > 0 ||
    filters.titleSearch.length > 0 ||
    filters.managerUid !== null
  )
}

export function computeFilteredIds(
  people: Record<string, PersonRecord>,
  filters: FilterState
): { matchIds: Set<string>; ancestorIds: Set<string> } {
  const matchIds = new Set<string>()
  for (const [uid, person] of Object.entries(people)) {
    if (matchesFilter(person, filters, people)) matchIds.add(uid)
  }

  // For hide mode: preserve ancestors of matches so the tree stays connected
  const ancestorIds = new Set<string>()
  for (const uid of matchIds) {
    let cur = people[uid]?.managerUid
    while (cur && !ancestorIds.has(cur) && !matchIds.has(cur)) {
      ancestorIds.add(cur)
      cur = people[cur]?.managerUid ?? null
    }
  }

  return { matchIds, ancestorIds }
}
