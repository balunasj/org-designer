export interface MoveAction {
  type: 'move'
  uid: string
  fromManagerUid: string | null
  toManagerUid: string | null
  moveSubtree: boolean
  timestamp: string
}

export interface ScopeCreation {
  type: 'scope_create'
  scopeId: string
  name: string
  parentManagerUid: string
  timestamp: string
}

export interface ScopeDivision {
  type: 'scope_divide'
  originalScopeId: string
  newScopes: Array<{ id: string; name: string }>
  timestamp: string
}

export interface ScopeAssignment {
  type: 'scope_assign'
  scopeId: string
  fromManagerUid: string | null
  toManagerUid: string
  timestamp: string
}

export interface ScopeRename {
  type: 'scope_rename'
  scopeId: string
  fromName: string
  toName: string
  timestamp: string
}

export type OverlayAction =
  | MoveAction
  | ScopeCreation
  | ScopeDivision
  | ScopeAssignment
  | ScopeRename

export interface Overlay {
  actions: OverlayAction[]
}

export const emptyOverlay = (): Overlay => ({ actions: [] })
