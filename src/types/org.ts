export type NodeKind = 'person' | 'scope'

export interface OrgPersonNode {
  kind: 'person'
  uid: string
  managerUid: string | null
  children: string[]
}

export interface OrgScopeNode {
  kind: 'scope'
  id: string
  name: string
  managerUid: string | null
  teamType?: 'org' | 'team_group' | 'team'
  memberCount?: number
  description?: string
}

export type OrgNode = OrgPersonNode | OrgScopeNode

export interface EffectiveState {
  people: Record<string, import('./person').PersonRecord>
  teams: Record<string, import('./person').TeamRecord>
  hierarchy: Record<string, string | null>
  scopeNodes: Record<string, OrgScopeNode>
  scopeAssignments: Record<string, string>
}
