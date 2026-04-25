import type { PersonRecord } from '@/types/person'

export interface SearchResult {
  uid: string
  person: PersonRecord
  score: number
}

export function searchPeople(
  query: string,
  people: Record<string, PersonRecord>,
  limit: number,
): { results: SearchResult[]; totalMatches: number } {
  const q = query.trim().toLowerCase()
  if (!q) return { results: [], totalMatches: 0 }

  const scored: SearchResult[] = []

  for (const person of Object.values(people)) {
    const score = scorePerson(q, person)
    if (score > 0) scored.push({ uid: person.uid, person, score })
  }

  scored.sort((a, b) => b.score - a.score || a.person.cn.localeCompare(b.person.cn))

  return {
    results: scored.slice(0, limit),
    totalMatches: scored.length,
  }
}

function scorePerson(q: string, p: PersonRecord): number {
  const cn = p.cn.toLowerCase()
  const display = p.displayName.toLowerCase()
  const uid = p.uid.toLowerCase()
  const title = (p.rhatJobTitle ?? '').toLowerCase()
  const geo = (p.rhatGeo ?? '').toLowerCase()
  const country = (p.co ?? '').toLowerCase()

  // Exact match on primary identifiers
  if (uid === q || cn === q || display === q) return 1000

  // Starts-with on name or uid
  if (uid.startsWith(q) || cn.startsWith(q) || display.startsWith(q)) return 500

  // Starts-with on secondary fields
  if (title.startsWith(q) || geo.startsWith(q) || country.startsWith(q)) return 300

  // Substring in any field
  if (
    uid.includes(q) ||
    cn.includes(q) ||
    display.includes(q) ||
    title.includes(q) ||
    geo.includes(q) ||
    country.includes(q)
  )
    return 100

  return 0
}
