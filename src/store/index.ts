import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { BaselineData } from '@/types/person'
import type { Overlay, OverlayAction } from '@/types/overlay'
import type { EffectiveState } from '@/types/org'
import { emptyOverlay } from '@/types/overlay'
import { applyOverlay } from '@/lib/overlay-engine'

export interface FilterState {
  geos: string[]
  countries: string[]
  jobRoles: string[]
  titleSearch: string
  managerUid: string | null
  mode: 'highlight' | 'hide'
}

export interface UIState {
  expandedNodes: Set<string>
  selectedNodeId: string | null
  filterMode: 'highlight' | 'hide'
  sidebarTab: 'metrics' | 'filters' | 'scenarios'
}

export interface AppState {
  // Data
  baseline: BaselineData | null
  overlay: Overlay
  undoStack: OverlayAction[][]
  redoStack: OverlayAction[][]
  effectiveState: EffectiveState | null

  // UI
  ui: UIState
  filters: FilterState

  // Scenarios
  currentScenarioName: string

  // Actions
  loadBaseline: () => Promise<void>
  loadScenario: (name: string) => Promise<void>
  saveScenario: (name: string) => Promise<void>

  pushAction: (action: OverlayAction) => void
  undo: () => void
  redo: () => void

  toggleExpanded: (nodeId: string) => void
  expandAll: () => void
  collapseAll: () => void
  setSelected: (nodeId: string | null) => void
  setSidebarTab: (tab: UIState['sidebarTab']) => void

  setFilters: (filters: Partial<FilterState>) => void
  clearFilters: () => void
}

const defaultFilters: FilterState = {
  geos: [],
  countries: [],
  jobRoles: [],
  titleSearch: '',
  managerUid: null,
  mode: 'highlight',
}

const defaultUI: UIState = {
  expandedNodes: new Set(),
  selectedNodeId: null,
  filterMode: 'highlight',
  sidebarTab: 'metrics',
}

function computeEffective(baseline: BaselineData, overlay: Overlay): EffectiveState {
  return applyOverlay(baseline, overlay)
}

export const useAppStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    baseline: null,
    overlay: emptyOverlay(),
    undoStack: [],
    redoStack: [],
    effectiveState: null,
    ui: defaultUI,
    filters: defaultFilters,
    currentScenarioName: 'default',

    loadBaseline: async () => {
      const res = await fetch('/api/baseline')
      if (!res.ok) throw new Error('Failed to load baseline. Run: npm run import')
      const baseline: BaselineData = await res.json()
      const { overlay } = get()
      const effectiveState = computeEffective(baseline, overlay)
      const rootUid = baseline.rootUid
      set({
        baseline,
        effectiveState,
        ui: {
          ...defaultUI,
          // Default: root node expanded
          expandedNodes: new Set([rootUid]),
        },
      })
    },

    loadScenario: async (name: string) => {
      const res = await fetch(`/api/scenarios/${encodeURIComponent(name)}`)
      if (!res.ok) throw new Error(`Scenario "${name}" not found`)
      const scenario = await res.json()
      const overlay: Overlay = scenario.overlay ?? emptyOverlay()
      const { baseline } = get()
      const effectiveState = baseline ? computeEffective(baseline, overlay) : null
      set({ overlay, effectiveState, currentScenarioName: name, undoStack: [], redoStack: [] })
    },

    saveScenario: async (name: string) => {
      const { overlay, baseline } = get()
      const scenario = {
        name,
        baselineImportedAt: baseline?.importedAt ?? '',
        overlay,
      }
      await fetch(`/api/scenarios/${encodeURIComponent(name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scenario),
      })
      set({ currentScenarioName: name })
    },

    pushAction: (action: OverlayAction) => {
      const { overlay, baseline, undoStack } = get()
      const newActions = [...overlay.actions, action]
      const newOverlay: Overlay = { actions: newActions }
      const effectiveState = baseline ? computeEffective(baseline, newOverlay) : null
      set({
        overlay: newOverlay,
        effectiveState,
        undoStack: [...undoStack, [action]],
        redoStack: [],
      })
    },

    undo: () => {
      const { overlay, baseline, undoStack, redoStack } = get()
      if (undoStack.length === 0) return
      const lastGroup = undoStack[undoStack.length - 1]
      const newActions = overlay.actions.slice(0, overlay.actions.length - lastGroup.length)
      const newOverlay: Overlay = { actions: newActions }
      const effectiveState = baseline ? computeEffective(baseline, newOverlay) : null
      set({
        overlay: newOverlay,
        effectiveState,
        undoStack: undoStack.slice(0, -1),
        redoStack: [lastGroup, ...redoStack],
      })
    },

    redo: () => {
      const { overlay, baseline, undoStack, redoStack } = get()
      if (redoStack.length === 0) return
      const nextGroup = redoStack[0]
      const newActions = [...overlay.actions, ...nextGroup]
      const newOverlay: Overlay = { actions: newActions }
      const effectiveState = baseline ? computeEffective(baseline, newOverlay) : null
      set({
        overlay: newOverlay,
        effectiveState,
        undoStack: [...undoStack, nextGroup],
        redoStack: redoStack.slice(1),
      })
    },

    toggleExpanded: (nodeId: string) => {
      const { ui } = get()
      const next = new Set(ui.expandedNodes)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      set({ ui: { ...ui, expandedNodes: next } })
    },

    expandAll: () => {
      const { ui, effectiveState } = get()
      if (!effectiveState) return
      set({ ui: { ...ui, expandedNodes: new Set(Object.keys(effectiveState.people)) } })
    },

    collapseAll: () => {
      const { ui, baseline } = get()
      set({ ui: { ...ui, expandedNodes: new Set(baseline ? [baseline.rootUid] : []) } })
    },

    setSelected: (nodeId: string | null) => {
      const { ui } = get()
      set({ ui: { ...ui, selectedNodeId: nodeId } })
    },

    setSidebarTab: (tab: UIState['sidebarTab']) => {
      const { ui } = get()
      set({ ui: { ...ui, sidebarTab: tab } })
    },

    setFilters: (filters: Partial<FilterState>) => {
      set((state) => ({ filters: { ...state.filters, ...filters } }))
    },

    clearFilters: () => set({ filters: defaultFilters }),
  }))
)
