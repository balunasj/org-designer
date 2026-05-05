import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '@/store'
import { applyOverlay } from '@/lib/overlay-engine'
import { makeBaseline } from '@/test/fixtures'
import { emptyOverlay } from '@/types/overlay'

const baseline = makeBaseline()
const initialEffective = applyOverlay(baseline, emptyOverlay())

function resetStore() {
  // Merge (no replace flag) to preserve action functions defined in the store creator
  useAppStore.setState({
    baseline,
    overlay: emptyOverlay(),
    effectiveState: initialEffective,
    undoStack: [],
    redoStack: [],
    ui: {
      expandedNodes: new Set(['ceo']),
      selectedNodeId: null,
      selectedNodeIds: new Set(),
      pendingDeleteUids: null,
      sidebarTab: 'metrics',
      viewRootUid: null,
      hiddenPeersOf: new Set(),
      fitViewTarget: null,
      fitViewIntent: null,
      openMenuNodeId: null,
    },
    filters: {
      geos: [],
      countries: [],
      jobRoles: [],
      teams: [],
      jobTitles: [],
      peopleType: 'all',
      mode: 'highlight',
    },
  })
}

beforeEach(resetStore)

describe('pushAction', () => {
  it('appends action to overlay and rebuilds effectiveState', () => {
    const action = {
      type: 'move' as const,
      uid: 'vp1',
      fromManagerUid: 'ceo',
      toManagerUid: 'vp2',
      moveSubtree: true,
      timestamp: '',
    }
    useAppStore.getState().pushAction(action)
    const state = useAppStore.getState()
    expect(state.overlay.actions).toHaveLength(1)
    expect(state.effectiveState!.people['vp1'].managerUid).toBe('vp2')
  })

  it('adds one undo group and clears redo stack', () => {
    const action = {
      type: 'move' as const,
      uid: 'ic1',
      fromManagerUid: 'vp1',
      toManagerUid: 'vp2',
      moveSubtree: true,
      timestamp: '',
    }
    useAppStore.getState().pushAction(action)
    const state = useAppStore.getState()
    expect(state.undoStack).toHaveLength(1)
    expect(state.redoStack).toHaveLength(0)
  })
})

describe('pushActions', () => {
  it('groups multiple actions into one undo entry', () => {
    const actions = [
      {
        type: 'move' as const,
        uid: 'vp1',
        fromManagerUid: 'ceo',
        toManagerUid: 'vp2',
        moveSubtree: true,
        timestamp: '',
      },
      {
        type: 'move' as const,
        uid: 'ic1',
        fromManagerUid: 'vp1',
        toManagerUid: 'vp2',
        moveSubtree: true,
        timestamp: '',
      },
    ]
    useAppStore.getState().pushActions(actions)
    const state = useAppStore.getState()
    expect(state.overlay.actions).toHaveLength(2)
    expect(state.undoStack).toHaveLength(1)
    expect(state.undoStack[0]).toHaveLength(2)
  })

  it('is a no-op for empty array', () => {
    useAppStore.getState().pushActions([])
    expect(useAppStore.getState().overlay.actions).toHaveLength(0)
    expect(useAppStore.getState().undoStack).toHaveLength(0)
  })
})

describe('undo / redo', () => {
  it('undo reverses last action group', () => {
    const action = {
      type: 'move' as const,
      uid: 'vp1',
      fromManagerUid: 'ceo',
      toManagerUid: 'vp2',
      moveSubtree: true,
      timestamp: '',
    }
    useAppStore.getState().pushAction(action)
    expect(useAppStore.getState().effectiveState!.people['vp1'].managerUid).toBe('vp2')

    useAppStore.getState().undo()
    expect(useAppStore.getState().effectiveState!.people['vp1'].managerUid).toBe('ceo')
    expect(useAppStore.getState().undoStack).toHaveLength(0)
    expect(useAppStore.getState().redoStack).toHaveLength(1)
  })

  it('redo re-applies undone group', () => {
    const action = {
      type: 'move' as const,
      uid: 'vp1',
      fromManagerUid: 'ceo',
      toManagerUid: 'vp2',
      moveSubtree: true,
      timestamp: '',
    }
    useAppStore.getState().pushAction(action)
    useAppStore.getState().undo()
    useAppStore.getState().redo()
    expect(useAppStore.getState().effectiveState!.people['vp1'].managerUid).toBe('vp2')
    expect(useAppStore.getState().redoStack).toHaveLength(0)
  })

  it('undo is a no-op when stack is empty', () => {
    useAppStore.getState().undo()
    expect(useAppStore.getState().overlay.actions).toHaveLength(0)
  })

  it('pushAction after undo clears redo stack', () => {
    const a1 = {
      type: 'move' as const,
      uid: 'vp1',
      fromManagerUid: 'ceo',
      toManagerUid: 'vp2',
      moveSubtree: true,
      timestamp: '',
    }
    const a2 = {
      type: 'move' as const,
      uid: 'ic1',
      fromManagerUid: 'vp1',
      toManagerUid: 'ceo',
      moveSubtree: true,
      timestamp: '',
    }
    useAppStore.getState().pushAction(a1)
    useAppStore.getState().undo()
    useAppStore.getState().pushAction(a2)
    expect(useAppStore.getState().redoStack).toHaveLength(0)
  })
})

describe('setSelected', () => {
  it('single select replaces the selection set', () => {
    useAppStore.getState().setSelected('vp1')
    expect(useAppStore.getState().ui.selectedNodeIds).toEqual(new Set(['vp1']))
    useAppStore.getState().setSelected('ic1')
    expect(useAppStore.getState().ui.selectedNodeIds).toEqual(new Set(['ic1']))
  })

  it('additive select toggles nodes in the set', () => {
    useAppStore.getState().setSelected('vp1')
    useAppStore.getState().setSelected('ic1', true)
    expect(useAppStore.getState().ui.selectedNodeIds).toEqual(new Set(['vp1', 'ic1']))
    useAppStore.getState().setSelected('vp1', true) // deselect
    expect(useAppStore.getState().ui.selectedNodeIds).toEqual(new Set(['ic1']))
  })

  it('null clears selection', () => {
    useAppStore.getState().setSelected('vp1')
    useAppStore.getState().setSelected(null)
    expect(useAppStore.getState().ui.selectedNodeIds.size).toBe(0)
    expect(useAppStore.getState().ui.selectedNodeId).toBeNull()
  })
})

describe('requestDelete / confirmDelete / cancelDelete', () => {
  it('requestDelete filters out root (null managerUid)', () => {
    useAppStore.getState().requestDelete(['ceo', 'vp1'])
    expect(useAppStore.getState().ui.pendingDeleteUids).toEqual(['vp1'])
  })

  it('cancelDelete clears pendingDeleteUids', () => {
    useAppStore.getState().requestDelete(['vp1'])
    useAppStore.getState().cancelDelete()
    expect(useAppStore.getState().ui.pendingDeleteUids).toBeNull()
  })

  it('confirmDelete pushes delete actions and clears selection', () => {
    useAppStore.getState().setSelected('vp1')
    useAppStore.getState().requestDelete(['vp1'])
    useAppStore.getState().confirmDelete()
    const state = useAppStore.getState()
    expect(state.ui.pendingDeleteUids).toBeNull()
    expect(state.ui.selectedNodeIds.size).toBe(0)
    expect(state.effectiveState!.people['vp1']).toBeUndefined()
  })

  it('confirmDelete is undoable as a single group', () => {
    useAppStore.getState().requestDelete(['mgr1', 'ic1'])
    useAppStore.getState().confirmDelete()
    expect(useAppStore.getState().undoStack).toHaveLength(1)
    useAppStore.getState().undo()
    expect(useAppStore.getState().effectiveState!.people['mgr1']).toBeDefined()
    expect(useAppStore.getState().effectiveState!.people['ic1']).toBeDefined()
  })
})
