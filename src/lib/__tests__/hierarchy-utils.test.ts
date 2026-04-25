import { describe, it, expect } from 'vitest'
import { buildChildrenMap, getSubtreeIds, getSubtreePeople } from '@/lib/hierarchy-utils'
import { makeBaseline } from '@/test/fixtures'

describe('buildChildrenMap', () => {
  it('maps each parent to its direct children', () => {
    const { people } = makeBaseline()
    const map = buildChildrenMap(people)
    expect(map.get('ceo')).toEqual(expect.arrayContaining(['vp1', 'vp2']))
    expect(map.get('vp1')).toEqual(expect.arrayContaining(['mgr1', 'ic1']))
    expect(map.get('vp2')).toBeUndefined() // vp2 has no children
  })

  it('does not include root (null manager) in any parent list', () => {
    const { people } = makeBaseline()
    const map = buildChildrenMap(people)
    for (const children of map.values()) {
      expect(children).not.toContain('ceo')
    }
  })
})

describe('getSubtreeIds', () => {
  it('returns single-element set for a leaf node', () => {
    const { people } = makeBaseline()
    const ids = getSubtreeIds('ic1', people)
    expect(ids).toEqual(new Set(['ic1']))
  })

  it('returns full org for root uid', () => {
    const { people } = makeBaseline()
    const ids = getSubtreeIds('ceo', people)
    expect(ids).toEqual(new Set(['ceo', 'vp1', 'vp2', 'mgr1', 'ic1']))
  })

  it('returns correct subtree for mid-level node', () => {
    const { people } = makeBaseline()
    const ids = getSubtreeIds('vp1', people)
    expect(ids).toEqual(new Set(['vp1', 'mgr1', 'ic1']))
    expect(ids.has('ceo')).toBe(false)
    expect(ids.has('vp2')).toBe(false)
  })

  it('accepts a pre-built childrenMap', () => {
    const { people } = makeBaseline()
    const map = buildChildrenMap(people)
    const ids = getSubtreeIds('vp1', people, map)
    expect(ids.size).toBe(3)
  })
})

describe('getSubtreePeople', () => {
  it('returns all people when rootUid is null', () => {
    const { people } = makeBaseline()
    const result = getSubtreePeople(null, people)
    expect(result).toHaveLength(5)
  })

  it('returns correct people for a subtree root', () => {
    const { people } = makeBaseline()
    const result = getSubtreePeople('vp1', people)
    const uids = result.map((p) => p.uid)
    expect(uids).toEqual(expect.arrayContaining(['vp1', 'mgr1', 'ic1']))
    expect(uids).not.toContain('ceo')
    expect(uids).not.toContain('vp2')
  })
})
