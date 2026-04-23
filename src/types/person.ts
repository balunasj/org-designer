export interface PersonRecord {
  uid: string
  cn: string
  displayName: string
  rhatPreferredLastName: string
  rhatJobTitle: string
  rhatJobRole: string
  rhatGeo: string
  co: string
  l: string
  rhatLocation: string
  rhatHireDate: string
  managerUid: string | null
  directReports: number
  totalReports: number
  teamId: string | null
  yamlRoles: string[]
}

export interface TeamRecord {
  id: string
  name: string
  tabName: string
  type: 'org' | 'team_group' | 'team'
  parentTeamId: string | null
  managerUid: string | null
  description: string
}

export interface BaselineData {
  importedAt: string
  rootUid: string
  people: Record<string, PersonRecord>
  teams: Record<string, TeamRecord>
}
