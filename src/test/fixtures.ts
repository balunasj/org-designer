import type { PersonRecord, TeamRecord, BaselineData } from '@/types/person'

export function makePerson(overrides: Partial<PersonRecord> = {}): PersonRecord {
  return {
    uid: 'test-uid',
    cn: 'Test Person',
    displayName: 'Test',
    rhatPreferredLastName: 'Person',
    rhatJobTitle: 'Software Engineer',
    rhatJobRole: 'Engineering',
    rhatGeo: 'NA',
    co: 'US',
    l: 'Raleigh',
    rhatLocation: 'Remote',
    rhatHireDate: '20200101',
    managerUid: null,
    directReports: 0,
    totalReports: 0,
    teamId: null,
    yamlRoles: [],
    ...overrides,
  }
}

export function makeTeam(overrides: Partial<TeamRecord> = {}): TeamRecord {
  return {
    id: 'team-a',
    name: 'Team A',
    tabName: 'team-a',
    type: 'team',
    parentTeamId: null,
    managerUid: null,
    description: '',
    ...overrides,
  }
}

/**
 * A small 5-person, 3-level org:
 *
 *   ceo
 *   ├── vp1  (managerUid: ceo)
 *   │   ├── mgr1  (managerUid: vp1)
 *   │   └── ic1   (managerUid: vp1)
 *   └── vp2  (managerUid: ceo)
 */
export function makeBaseline(overrides: Partial<BaselineData> = {}): BaselineData {
  const people: Record<string, PersonRecord> = {
    ceo: makePerson({
      uid: 'ceo',
      cn: 'Ada CEO',
      displayName: 'Ada',
      managerUid: null,
      rhatGeo: 'NA',
      co: 'US',
      rhatJobRole: 'Senior Leadership',
      teamId: 'team-a',
    }),
    vp1: makePerson({
      uid: 'vp1',
      cn: 'Bob VP',
      displayName: 'Bob',
      managerUid: 'ceo',
      rhatGeo: 'EMEA',
      co: 'DE',
      rhatJobRole: 'Engineering',
      teamId: 'team-a',
    }),
    vp2: makePerson({
      uid: 'vp2',
      cn: 'Carol VP',
      displayName: 'Carol',
      managerUid: 'ceo',
      rhatGeo: 'APAC',
      co: 'AU',
      rhatJobRole: 'Engineering',
      teamId: 'team-b',
    }),
    mgr1: makePerson({
      uid: 'mgr1',
      cn: 'Dave Mgr',
      displayName: 'Dave',
      managerUid: 'vp1',
      rhatGeo: 'NA',
      co: 'CA',
      rhatJobRole: 'Engineering',
      teamId: 'team-a',
    }),
    ic1: makePerson({
      uid: 'ic1',
      cn: 'Eve IC',
      displayName: 'Eve',
      managerUid: 'vp1',
      rhatGeo: 'NA',
      co: 'US',
      rhatJobTitle: 'Senior Engineer',
      teamId: 'team-a',
    }),
  }

  const teams: Record<string, TeamRecord> = {
    'team-a': makeTeam({ id: 'team-a', name: 'Team Alpha', managerUid: 'vp1' }),
    'team-b': makeTeam({ id: 'team-b', name: 'Team Beta', managerUid: 'vp2', type: 'team_group' }),
  }

  return {
    importedAt: '2025-01-01T00:00:00.000Z',
    rootUid: 'ceo',
    people,
    teams,
    ...overrides,
  }
}
