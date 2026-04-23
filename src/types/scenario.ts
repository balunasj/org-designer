import type { Overlay } from './overlay'

export interface Scenario {
  name: string
  createdAt: string
  updatedAt: string
  baselineImportedAt: string
  overlay: Overlay
}
