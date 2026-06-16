import { describe, it, expect } from 'vitest'
import {
  matchesFilter,
  hasActiveFilters,
  computeFilteredIds,
  computeExcludedIds,
} from '@/lib/filter-utils'
import { makeBaseline, makePerson } from '@/test/fixtures'
import type { FilterState } from '@/store'

const defaultFilters: FilterState = {
  geos: [],
  countries: [],
  jobRoles: [],
  teams: [],
  jobTitles: [],
  peopleType: 'all',
  mode: 'highlight',
}

describe('hasActiveFilters', () => {
  it('returns false for default (empty) filters', () => {
    expect(hasActiveFilters(defaultFilters)).toBe(false)
  })

  it('returns true when any filter is set', () => {
    expect(hasActiveFilters({ ...defaultFilters, geos: ['NA'] })).toBe(true)
    expect(hasActiveFilters({ ...defaultFilters, jobTitles: ['Senior Engineer'] })).toBe(true)
    expect(hasActiveFilters({ ...defaultFilters, teams: ['team-a'] })).toBe(true)
  })

  it('returns true when peopleType is managers', () => {
    expect(hasActiveFilters({ ...defaultFilters, peopleType: 'managers' })).toBe(true)
  })

  it('returns true when peopleType is ics', () => {
    expect(hasActiveFilters({ ...defaultFilters, peopleType: 'ics' })).toBe(true)
  })

  it('returns false when peopleType is all', () => {
    expect(hasActiveFilters({ ...defaultFilters, peopleType: 'all' })).toBe(false)
  })
})

describe('matchesFilter', () => {
  const bl = makeBaseline()
  const { people } = bl

  it('passes with no active filters', () => {
    expect(matchesFilter(people['ic1'], defaultFilters)).toBe(true)
  })

  it('filters by geo', () => {
    const f = { ...defaultFilters, geos: ['EMEA'] }
    expect(matchesFilter(people['vp1'], f)).toBe(true) // vp1 is EMEA
    expect(matchesFilter(people['ic1'], f)).toBe(false) // ic1 is NA
  })

  it('filters by country', () => {
    const f = { ...defaultFilters, countries: ['AU'] }
    expect(matchesFilter(people['vp2'], f)).toBe(true)
    expect(matchesFilter(people['ic1'], f)).toBe(false)
  })

  it('filters by job role', () => {
    const f = { ...defaultFilters, jobRoles: ['Senior Leadership'] }
    expect(matchesFilter(people['ceo'], f)).toBe(true)
    expect(matchesFilter(people['vp1'], f)).toBe(false)
  })

  it('filters by team', () => {
    const f = { ...defaultFilters, teams: ['team-b'] }
    expect(matchesFilter(people['vp2'], f)).toBe(true)
    expect(matchesFilter(people['vp1'], f)).toBe(false)
  })

  it('treats null teamId as empty string when filtering by team', () => {
    const person = makePerson({ uid: 'nobody', teamId: null })
    // null teamId → '' which is not in ['team-a'], so person fails the filter
    expect(matchesFilter(person, { ...defaultFilters, teams: ['team-a'] })).toBe(false)
    // no teams filter → person passes
    expect(matchesFilter(person, defaultFilters)).toBe(true)
  })

  it('filters by exact jobTitle selection', () => {
    const f = { ...defaultFilters, jobTitles: ['Senior Engineer'] }
    expect(matchesFilter(people['ic1'], f)).toBe(true) // jobTitle: 'Senior Engineer'
    expect(matchesFilter(people['vp1'], f)).toBe(false)
  })

  it('filters by multiple selected job titles (OR within the set)', () => {
    // ic1 has 'Senior Engineer'; ceo/vp1/vp2/mgr1 have default 'Software Engineer'
    // Selecting both titles should match everyone; selecting an absent title should not
    const fBoth = { ...defaultFilters, jobTitles: ['Senior Engineer', 'Software Engineer'] }
    expect(matchesFilter(people['ic1'], fBoth)).toBe(true)
    expect(matchesFilter(people['ceo'], fBoth)).toBe(true)

    const fAbsent = { ...defaultFilters, jobTitles: ['Senior Engineer', 'Staff Architect'] }
    expect(matchesFilter(people['ic1'], fAbsent)).toBe(true) // Senior Engineer matches
    expect(matchesFilter(people['ceo'], fAbsent)).toBe(false) // Software Engineer not in list
  })

  it('peopleType managers: includes people with directReports > 0', () => {
    const f = { ...defaultFilters, peopleType: 'managers' as const }
    expect(matchesFilter(people['ceo'], f)).toBe(true) // directReports: 2
    expect(matchesFilter(people['vp1'], f)).toBe(true) // directReports: 2
    expect(matchesFilter(people['vp2'], f)).toBe(false) // directReports: 0
    expect(matchesFilter(people['mgr1'], f)).toBe(false) // directReports: 0
    expect(matchesFilter(people['ic1'], f)).toBe(false) // directReports: 0
  })

  it('peopleType ics: includes people with directReports === 0', () => {
    const f = { ...defaultFilters, peopleType: 'ics' as const }
    expect(matchesFilter(people['ic1'], f)).toBe(true)
    expect(matchesFilter(people['mgr1'], f)).toBe(true)
    expect(matchesFilter(people['vp2'], f)).toBe(true)
    expect(matchesFilter(people['vp1'], f)).toBe(false)
    expect(matchesFilter(people['ceo'], f)).toBe(false)
  })

  it('peopleType all: passes everyone', () => {
    const f = { ...defaultFilters, peopleType: 'all' as const }
    expect(matchesFilter(people['ceo'], f)).toBe(true)
    expect(matchesFilter(people['ic1'], f)).toBe(true)
  })
})

describe('computeFilteredIds', () => {
  it('returns all people when no filters active', () => {
    const bl = makeBaseline()
    const { matchIds } = computeFilteredIds(bl.people, defaultFilters)
    expect(matchIds.size).toBe(5)
  })

  it('preserves ancestors in ancestorIds for hide mode', () => {
    const bl = makeBaseline()
    // Filter to only ic1 (deep leaf). Ancestors vp1 and ceo must be preserved.
    const f = { ...defaultFilters, jobTitles: ['Senior Engineer'] }
    const { matchIds, ancestorIds } = computeFilteredIds(bl.people, f)
    expect(matchIds.has('ic1')).toBe(true)
    expect(ancestorIds.has('vp1')).toBe(true)
    expect(ancestorIds.has('ceo')).toBe(true)
    // Ancestors are not in matchIds
    expect(matchIds.has('vp1')).toBe(false)
  })

  it('does not duplicate ancestor in both sets', () => {
    const bl = makeBaseline()
    const f = { ...defaultFilters, geos: ['EMEA'] }
    const { matchIds, ancestorIds } = computeFilteredIds(bl.people, f)
    for (const uid of matchIds) {
      expect(ancestorIds.has(uid)).toBe(false)
    }
  })

  it('managers filter returns only people with directReports > 0', () => {
    const bl = makeBaseline()
    const f = { ...defaultFilters, peopleType: 'managers' as const }
    const { matchIds } = computeFilteredIds(bl.people, f)
    expect(matchIds.has('ceo')).toBe(true)
    expect(matchIds.has('vp1')).toBe(true)
    expect(matchIds.has('vp2')).toBe(false)
    expect(matchIds.has('mgr1')).toBe(false)
    expect(matchIds.has('ic1')).toBe(false)
  })
})

describe('computeExcludedIds', () => {
  // Fixture tree:
  //   ceo (NA, US, Senior Leadership, team-a)
  //   ├── vp1 (EMEA, DE, Engineering, team-a)  directReports: 2
  //   │   ├── mgr1 (NA, CA, Engineering, team-a)
  //   │   └── ic1  (NA, US, Engineering, team-a, jobTitle: Senior Engineer)
  //   └── vp2 (APAC, AU, Engineering, team-b)

  it('returns all IDs when no active filters', () => {
    const bl = makeBaseline()
    const visible = computeExcludedIds(bl.people, defaultFilters)
    expect(visible.size).toBe(5)
  })

  it('excludes a leaf node only when it matches', () => {
    const bl = makeBaseline()
    // Exclude ic1 (Senior Engineer) — leaf, no subtree
    const f = { ...defaultFilters, jobTitles: ['Senior Engineer'] }
    const visible = computeExcludedIds(bl.people, f)
    expect(visible.has('ic1')).toBe(false)
    expect(visible.has('vp1')).toBe(true)
    expect(visible.has('mgr1')).toBe(true)
    expect(visible.has('vp2')).toBe(true)
    expect(visible.has('ceo')).toBe(true)
    expect(visible.size).toBe(4)
  })

  it('excludes an entire subtree when the root of that subtree matches', () => {
    const bl = makeBaseline()
    // Exclude EMEA: vp1 matches → vp1 + mgr1 + ic1 removed
    const f = { ...defaultFilters, geos: ['EMEA'] }
    const visible = computeExcludedIds(bl.people, f)
    expect(visible.has('vp1')).toBe(false)
    expect(visible.has('mgr1')).toBe(false)
    expect(visible.has('ic1')).toBe(false)
    expect(visible.has('ceo')).toBe(true)
    expect(visible.has('vp2')).toBe(true)
    expect(visible.size).toBe(2)
  })

  it('returns empty set when the org root matches (entire tree excluded)', () => {
    const bl = makeBaseline()
    // ceo is Senior Leadership; excluding it removes everyone
    const f = { ...defaultFilters, jobRoles: ['Senior Leadership'] }
    const visible = computeExcludedIds(bl.people, f)
    expect(visible.size).toBe(0)
  })

  it('excludes two disjoint subtrees when both roots match', () => {
    const bl = makeBaseline()
    // countries: ['DE', 'AU'] matches vp1 (DE, subtree: vp1+mgr1+ic1) and vp2 (AU, leaf)
    const f = { ...defaultFilters, countries: ['DE', 'AU'] }
    const visible = computeExcludedIds(bl.people, f)
    expect(visible.has('ceo')).toBe(true)
    expect(visible.has('vp1')).toBe(false)
    expect(visible.has('mgr1')).toBe(false)
    expect(visible.has('ic1')).toBe(false)
    expect(visible.has('vp2')).toBe(false)
    expect(visible.size).toBe(1)
  })

  it('excludes only APAC subtree (leaf) when vp2 matches', () => {
    const bl = makeBaseline()
    const f = { ...defaultFilters, geos: ['APAC'] }
    const visible = computeExcludedIds(bl.people, f)
    expect(visible.has('vp2')).toBe(false)
    expect(visible.has('ceo')).toBe(true)
    expect(visible.has('vp1')).toBe(true)
    expect(visible.has('mgr1')).toBe(true)
    expect(visible.has('ic1')).toBe(true)
    expect(visible.size).toBe(4)
  })
})
