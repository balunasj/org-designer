import { describe, it, expect } from 'vitest'
import { searchPeople } from '@/lib/search-utils'
import { makeBaseline, makePerson } from '@/test/fixtures'

describe('searchPeople', () => {
  it('returns empty results for empty query', () => {
    const { people } = makeBaseline()
    const { results, totalMatches } = searchPeople('', people, 10)
    expect(results).toHaveLength(0)
    expect(totalMatches).toBe(0)
  })

  it('returns empty results for whitespace-only query', () => {
    const { people } = makeBaseline()
    const { results } = searchPeople('   ', people, 10)
    expect(results).toHaveLength(0)
  })

  it('exact match on cn scores 1000', () => {
    const { people } = makeBaseline()
    const { results } = searchPeople('Ada CEO', people, 10)
    expect(results[0].uid).toBe('ceo')
    expect(results[0].score).toBe(1000)
  })

  it('exact match on uid scores 1000', () => {
    const { people } = makeBaseline()
    const { results } = searchPeople('ic1', people, 10)
    expect(results[0].score).toBe(1000)
  })

  it('starts-with on name scores 500', () => {
    const { people } = makeBaseline()
    // 'Bob VP' starts with 'Bob V' but is not an exact match
    const { results } = searchPeople('Bob V', people, 10)
    expect(results[0].uid).toBe('vp1')
    expect(results[0].score).toBe(500)
  })

  it('starts-with on job title scores 300', () => {
    const people = {
      p1: makePerson({
        uid: 'p1',
        cn: 'Zara Unique',
        displayName: 'Zara',
        jobTitle: 'Staff Engineer',
      }),
    }
    const { results } = searchPeople('staff', people, 10)
    expect(results[0].score).toBe(300)
  })

  it('substring match scores 100', () => {
    const people = {
      p1: makePerson({
        uid: 'p1',
        cn: 'Unique Name Zz',
        displayName: 'Unique',
        jobTitle: 'Distinguished Engineer',
      }),
    }
    const { results } = searchPeople('guished', people, 10)
    expect(results[0].score).toBe(100)
  })

  it('respects the limit parameter', () => {
    const { people } = makeBaseline()
    const { results, totalMatches } = searchPeople('e', people, 2)
    expect(results.length).toBeLessThanOrEqual(2)
    expect(totalMatches).toBeGreaterThanOrEqual(results.length)
  })

  it('sorts by score descending, then alphabetically', () => {
    // Two people with same score: substring match in both
    const people = {
      z: makePerson({ uid: 'z', cn: 'Zebra Engineer', displayName: 'Zebra', jobTitle: '' }),
      a: makePerson({ uid: 'a', cn: 'Apple Engineer', displayName: 'Apple', jobTitle: '' }),
    }
    const { results } = searchPeople('engineer', people, 10)
    expect(results[0].uid).toBe('a') // 'Apple' < 'Zebra' alphabetically
    expect(results[1].uid).toBe('z')
  })

  it('returns 0 matches for query with no hits', () => {
    const { people } = makeBaseline()
    const { totalMatches } = searchPeople('xyzzy-no-match', people, 10)
    expect(totalMatches).toBe(0)
  })
})
