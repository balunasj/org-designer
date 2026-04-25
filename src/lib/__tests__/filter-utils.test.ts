import { describe, it, expect } from 'vitest'
import { matchesFilter, hasActiveFilters, computeFilteredIds } from '@/lib/filter-utils'
import { makeBaseline } from '@/test/fixtures'
import type { FilterState } from '@/store'

const defaultFilters: FilterState = {
  geos: [],
  countries: [],
  jobRoles: [],
  teams: [],
  titleSearch: '',
  managerUid: null,
  mode: 'highlight',
}

describe('hasActiveFilters', () => {
  it('returns false for default (empty) filters', () => {
    expect(hasActiveFilters(defaultFilters)).toBe(false)
  })

  it('returns true when any filter is set', () => {
    expect(hasActiveFilters({ ...defaultFilters, geos: ['NA'] })).toBe(true)
    expect(hasActiveFilters({ ...defaultFilters, titleSearch: 'eng' })).toBe(true)
    expect(hasActiveFilters({ ...defaultFilters, managerUid: 'vp1' })).toBe(true)
    expect(hasActiveFilters({ ...defaultFilters, teams: ['team-a'] })).toBe(true)
  })
})

describe('matchesFilter', () => {
  const bl = makeBaseline()
  const { people } = bl

  it('passes with no active filters', () => {
    expect(matchesFilter(people['ic1'], defaultFilters, people)).toBe(true)
  })

  it('filters by geo', () => {
    const f = { ...defaultFilters, geos: ['EMEA'] }
    expect(matchesFilter(people['vp1'], f, people)).toBe(true) // vp1 is EMEA
    expect(matchesFilter(people['ic1'], f, people)).toBe(false) // ic1 is NA
  })

  it('filters by country', () => {
    const f = { ...defaultFilters, countries: ['AU'] }
    expect(matchesFilter(people['vp2'], f, people)).toBe(true)
    expect(matchesFilter(people['ic1'], f, people)).toBe(false)
  })

  it('filters by job role', () => {
    const f = { ...defaultFilters, jobRoles: ['Senior Leadership'] }
    expect(matchesFilter(people['ceo'], f, people)).toBe(true)
    expect(matchesFilter(people['vp1'], f, people)).toBe(false)
  })

  it('filters by team', () => {
    const f = { ...defaultFilters, teams: ['team-b'] }
    expect(matchesFilter(people['vp2'], f, people)).toBe(true)
    expect(matchesFilter(people['vp1'], f, people)).toBe(false)
  })

  it('filters by title search (substring in title)', () => {
    const f = { ...defaultFilters, titleSearch: 'Senior' }
    expect(matchesFilter(people['ic1'], f, people)).toBe(true) // rhatJobTitle: 'Senior Engineer'
    expect(matchesFilter(people['vp1'], f, people)).toBe(false)
  })

  it('filters by title search (substring in name)', () => {
    const f = { ...defaultFilters, titleSearch: 'Dave' }
    expect(matchesFilter(people['mgr1'], f, people)).toBe(true)
    expect(matchesFilter(people['ic1'], f, people)).toBe(false)
  })

  it('filters by managerUid (shows only people under that manager)', () => {
    const f = { ...defaultFilters, managerUid: 'vp1' }
    expect(matchesFilter(people['mgr1'], f, people)).toBe(true)
    expect(matchesFilter(people['ic1'], f, people)).toBe(true)
    expect(matchesFilter(people['vp2'], f, people)).toBe(false)
    expect(matchesFilter(people['ceo'], f, people)).toBe(false)
  })

  it('managerUid filter does not include the manager themselves', () => {
    const f = { ...defaultFilters, managerUid: 'vp1' }
    expect(matchesFilter(people['vp1'], f, people)).toBe(false)
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
    const f = { ...defaultFilters, titleSearch: 'Eve' }
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
})
