import { describe, it, expect } from 'vitest'
import { applyOverlay } from '@/lib/overlay-engine'
import { makeBaseline, makePerson } from '@/test/fixtures'
import type { Overlay } from '@/types/overlay'

const empty: Overlay = { actions: [] }

describe('applyOverlay — empty overlay', () => {
  it('returns all baseline people unchanged', () => {
    const bl = makeBaseline()
    const result = applyOverlay(bl, empty)
    expect(Object.keys(result.people)).toEqual(expect.arrayContaining(Object.keys(bl.people)))
  })

  it('initializes scope nodes from baseline teams', () => {
    const bl = makeBaseline()
    const result = applyOverlay(bl, empty)
    expect(result.scopeNodes['team-a']).toMatchObject({ id: 'team-a', name: 'Team Alpha' })
    expect(result.scopeNodes['team-b']).toMatchObject({ id: 'team-b', name: 'Team Beta' })
  })

  it('recomputes report counts correctly', () => {
    const bl = makeBaseline()
    const result = applyOverlay(bl, empty)
    expect(result.people['ceo'].directReports).toBe(2)
    expect(result.people['ceo'].totalReports).toBe(4)
    expect(result.people['vp1'].directReports).toBe(2)
    expect(result.people['vp1'].totalReports).toBe(2)
    expect(result.people['ic1'].directReports).toBe(0)
  })
})

describe('applyOverlay — move (subtree)', () => {
  it('moves person and subtree to new manager', () => {
    const bl = makeBaseline()
    const overlay: Overlay = {
      actions: [
        {
          type: 'move',
          uid: 'vp1',
          fromManagerUid: 'ceo',
          toManagerUid: 'vp2',
          moveSubtree: true,
          timestamp: '',
        },
      ],
    }
    const result = applyOverlay(bl, overlay)
    expect(result.people['vp1'].managerUid).toBe('vp2')
    // Descendants retain their existing manager within subtree
    expect(result.people['mgr1'].managerUid).toBe('vp1')
    expect(result.people['ic1'].managerUid).toBe('vp1')
  })
})

describe('applyOverlay — move (individual only)', () => {
  it('moves person only; direct reports go to old manager', () => {
    const bl = makeBaseline()
    const overlay: Overlay = {
      actions: [
        {
          type: 'move',
          uid: 'vp1',
          fromManagerUid: 'ceo',
          toManagerUid: 'vp2',
          moveSubtree: false,
          timestamp: '',
        },
      ],
    }
    const result = applyOverlay(bl, overlay)
    expect(result.people['vp1'].managerUid).toBe('vp2')
    expect(result.people['mgr1'].managerUid).toBe('ceo')
    expect(result.people['ic1'].managerUid).toBe('ceo')
  })
})

describe('applyOverlay — add_person', () => {
  it('inserts new person with zero report counts', () => {
    const bl = makeBaseline()
    const newPerson = makePerson({ uid: 'new1', cn: 'New Hire', managerUid: 'vp2' })
    const overlay: Overlay = {
      actions: [{ type: 'add_person', person: newPerson, timestamp: '' }],
    }
    const result = applyOverlay(bl, overlay)
    expect(result.people['new1']).toBeDefined()
    expect(result.people['new1'].managerUid).toBe('vp2')
    expect(result.people['new1'].directReports).toBe(0)
    expect(result.people['vp2'].directReports).toBe(1)
  })
})

describe('applyOverlay — edit_person', () => {
  it('merges updates onto existing person', () => {
    const bl = makeBaseline()
    const overlay: Overlay = {
      actions: [
        {
          type: 'edit_person',
          uid: 'ic1',
          updates: { cn: 'Eve Updated', rhatJobTitle: 'Staff Engineer' },
          timestamp: '',
        },
      ],
    }
    const result = applyOverlay(bl, overlay)
    expect(result.people['ic1'].cn).toBe('Eve Updated')
    expect(result.people['ic1'].rhatJobTitle).toBe('Staff Engineer')
    expect(result.people['ic1'].uid).toBe('ic1') // uid cannot be overridden
  })
})

describe('applyOverlay — delete_person', () => {
  it('removes person and reassigns their reports', () => {
    const bl = makeBaseline()
    const overlay: Overlay = {
      actions: [
        {
          type: 'delete_person',
          uid: 'vp1',
          reassignTo: 'ceo',
          timestamp: '',
        },
      ],
    }
    const result = applyOverlay(bl, overlay)
    expect(result.people['vp1']).toBeUndefined()
    expect(result.people['mgr1'].managerUid).toBe('ceo')
    expect(result.people['ic1'].managerUid).toBe('ceo')
    expect(result.people['ceo'].directReports).toBe(3) // vp2 + mgr1 + ic1
  })

  it('handles delete with reassignTo null', () => {
    const bl = makeBaseline()
    const overlay: Overlay = {
      actions: [{ type: 'delete_person', uid: 'ic1', reassignTo: null, timestamp: '' }],
    }
    const result = applyOverlay(bl, overlay)
    expect(result.people['ic1']).toBeUndefined()
    expect(result.people['vp1'].directReports).toBe(1) // mgr1 only
  })
})

describe('applyOverlay — scope_create', () => {
  it('adds new scope node', () => {
    const bl = makeBaseline()
    const overlay: Overlay = {
      actions: [
        {
          type: 'scope_create',
          scopeId: 'scope-new',
          name: 'New Scope',
          parentManagerUid: 'ceo',
          timestamp: '',
        },
      ],
    }
    const result = applyOverlay(bl, overlay)
    expect(result.scopeNodes['scope-new']).toMatchObject({
      id: 'scope-new',
      name: 'New Scope',
      managerUid: 'ceo',
    })
    expect(result.scopeAssignments['scope-new']).toBe('ceo')
  })
})

describe('applyOverlay — scope_assign', () => {
  it('moves scope to a new manager', () => {
    const bl = makeBaseline()
    const overlay: Overlay = {
      actions: [
        {
          type: 'scope_assign',
          scopeId: 'team-a',
          fromManagerUid: 'vp1',
          toManagerUid: 'ceo',
          timestamp: '',
        },
      ],
    }
    const result = applyOverlay(bl, overlay)
    expect(result.scopeNodes['team-a'].managerUid).toBe('ceo')
  })
})

describe('applyOverlay — scope_rename', () => {
  it('renames scope in place', () => {
    const bl = makeBaseline()
    const overlay: Overlay = {
      actions: [
        {
          type: 'scope_rename',
          scopeId: 'team-a',
          fromName: 'Team Alpha',
          toName: 'Team Alpha Renamed',
          timestamp: '',
        },
      ],
    }
    const result = applyOverlay(bl, overlay)
    expect(result.scopeNodes['team-a'].name).toBe('Team Alpha Renamed')
    expect(result.scopeNodes['team-a'].managerUid).toBe('vp1') // unchanged
  })
})

describe('applyOverlay — scope_divide', () => {
  it('removes original scope and creates new sub-scopes', () => {
    const bl = makeBaseline()
    const overlay: Overlay = {
      actions: [
        {
          type: 'scope_divide',
          originalScopeId: 'team-a',
          newScopes: [
            { id: 'team-a1', name: 'Alpha East' },
            { id: 'team-a2', name: 'Alpha West' },
          ],
          timestamp: '',
        },
      ],
    }
    const result = applyOverlay(bl, overlay)
    expect(result.scopeNodes['team-a']).toBeUndefined()
    expect(result.scopeNodes['team-a1']).toMatchObject({ name: 'Alpha East', managerUid: 'vp1' })
    expect(result.scopeNodes['team-a2']).toMatchObject({ name: 'Alpha West', managerUid: 'vp1' })
  })
})
