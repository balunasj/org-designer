#!/usr/bin/env tsx
/**
 * Import script: reads fastrover all_users.json + org repo YAML → data/baseline.json
 * Run with: npm run import
 * No PII is committed — data/ is gitignored.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'
import { glob } from 'glob'
import type { PersonRecord, TeamRecord, BaselineData } from '../src/types/person.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.join(__dirname, '..')
const DATA_DIR = path.join(PROJECT_ROOT, 'data')

// Config — paths to source data
const FASTROVER_PATH =
  process.env.FASTROVER_PATH ?? path.join(process.env.HOME!, 'Projects/fastrover/all_users.json')
const ORG_FLEET_PATH =
  process.env.ORG_FLEET_PATH ??
  path.join(
    process.env.HOME!,
    'Projects/org/config/structures/hybrid_platforms/fleet'
  )
const ROOT_UID = process.env.ROOT_UID ?? 'jlaska'

// ── Types for raw fastrover data ───────────────────────────────────────────

interface FastroverUser {
  uid: string
  cn: string
  displayName?: string
  rhatPreferredLastName?: string
  rhatJobTitle?: string
  rhatJobRole?: string
  rhatGeo?: string
  co?: string
  l?: string
  rhatLocation?: string
  rhatHireDate?: string
  manager?: string
  directReports?: number
  totalReports?: number
}

// ── Types for YAML structures ─────────────────────────────────────────────

interface YamlRoleDef {
  people?: { ids?: string[] }
  types?: string[]
}

interface YamlGroup {
  parent?: string
  type?: { name?: string }
  roles?: YamlRoleDef[]
  people?: { select?: Array<{ include?: Array<{ args?: { group?: string }; func?: string }> }>; ids?: string[] }
}

interface YamlFile {
  name?: string
  tab_name?: string
  description?: string
  group?: YamlGroup
}

// ── Step 1: Load fastrover data ────────────────────────────────────────────

console.log(`Loading fastrover data from ${FASTROVER_PATH}...`)
const allUsers: FastroverUser[] = JSON.parse(fs.readFileSync(FASTROVER_PATH, 'utf-8'))
console.log(`  Loaded ${allUsers.length} users`)

const byUid = new Map(allUsers.map((u) => [u.uid, u]))

// ── Step 2: BFS to collect the org subset ─────────────────────────────────

console.log(`Building org subset from ${ROOT_UID}...`)
const childrenMap = new Map<string, string[]>()
for (const u of allUsers) {
  if (u.manager) {
    if (!childrenMap.has(u.manager)) childrenMap.set(u.manager, [])
    childrenMap.get(u.manager)!.push(u.uid)
  }
}

const orgUids = new Set<string>()
const queue = [ROOT_UID]
while (queue.length > 0) {
  const uid = queue.shift()!
  if (orgUids.has(uid)) continue
  orgUids.add(uid)
  for (const child of childrenMap.get(uid) ?? []) {
    queue.push(child)
  }
}
console.log(`  Org size: ${orgUids.size} people`)

// ── Step 3: Parse org YAML hierarchy ──────────────────────────────────────

console.log(`Parsing org YAML from ${ORG_FLEET_PATH}...`)

const teams: Record<string, TeamRecord> = {}

function yamlIdFromPath(filePath: string): string {
  return path.basename(filePath, '.yaml')
}

function resolveParentId(parentRef: string | undefined): string | null {
  if (!parentRef) return null
  // e.g. "c/structures/hybrid_platforms/fleet/team_groups/fleet_experience.yaml"
  const base = path.basename(parentRef, '.yaml')
  return base === 'org' ? 'fleet' : base
}

function parseYamlFile(filePath: string, type: 'org' | 'team_group' | 'team'): TeamRecord | null {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const doc = yaml.load(raw) as YamlFile
  if (!doc) return null

  const id = type === 'org' ? 'fleet' : yamlIdFromPath(filePath)
  const parentId = resolveParentId(doc.group?.parent)

  // Collect manager uid from roles
  let managerUid: string | null = null
  for (const roleDef of doc.group?.roles ?? []) {
    if (roleDef.types?.includes('manager') && roleDef.people?.ids?.length) {
      managerUid = roleDef.people.ids[0]
      break
    }
  }

  return {
    id,
    name: doc.name ?? id,
    tabName: doc.tab_name ?? '',
    type,
    parentTeamId: parentId,
    managerUid,
    description: doc.description ?? '',
  }
}

// Parse org.yaml (root)
const orgYamlPath = path.join(ORG_FLEET_PATH, 'org.yaml')
const fleetOrg = parseYamlFile(orgYamlPath, 'org')
if (fleetOrg) teams[fleetOrg.id] = fleetOrg

// Parse team_groups
const teamGroupFiles = await glob(path.join(ORG_FLEET_PATH, 'team_groups/*.yaml'))
for (const f of teamGroupFiles) {
  const record = parseYamlFile(f, 'team_group')
  if (record) teams[record.id] = record
}

// Parse teams
const teamFiles = await glob(path.join(ORG_FLEET_PATH, 'teams/*.yaml'))
for (const f of teamFiles) {
  const record = parseYamlFile(f, 'team')
  if (record) teams[record.id] = record
}

console.log(`  Parsed ${Object.keys(teams).length} team/group/org entries`)

// ── Step 4: Build uid → team assignment ────────────────────────────────────
// Strategy: match by manager uid in YAML roles, then fall through to direct
// manager chain. We use the team's managerUid to assign people under that manager.

const managerToTeam = new Map<string, string>()
for (const team of Object.values(teams)) {
  if (team.managerUid) {
    managerToTeam.set(team.managerUid, team.id)
  }
}

// Also parse yaml role assignments per uid for yamlRoles
const uidToYamlRoles = new Map<string, string[]>()

async function loadYamlRoles() {
  const allYamls = [orgYamlPath, ...teamGroupFiles, ...teamFiles]
  for (const f of allYamls) {
    const raw = fs.readFileSync(f, 'utf-8')
    const doc = yaml.load(raw) as YamlFile
    if (!doc?.group?.roles) continue
    for (const roleDef of doc.group.roles) {
      const types = roleDef.types ?? []
      for (const uid of roleDef.people?.ids ?? []) {
        if (!uidToYamlRoles.has(uid)) uidToYamlRoles.set(uid, [])
        uidToYamlRoles.get(uid)!.push(...types)
      }
    }
  }
}
await loadYamlRoles()

// ── Step 5: Build PersonRecord map ────────────────────────────────────────

const people: Record<string, PersonRecord> = {}

for (const uid of orgUids) {
  const u = byUid.get(uid)
  if (!u) continue

  // Find team: direct match or find team whose manager is in this person's ancestry
  let teamId: string | null = managerToTeam.get(uid) ?? null
  if (!teamId && u.manager) {
    // Walk up the manager chain to find the nearest ancestor with a team assignment
    let cur: string | undefined = u.manager
    const seen = new Set<string>()
    while (cur && !seen.has(cur)) {
      seen.add(cur)
      if (managerToTeam.has(cur)) {
        teamId = managerToTeam.get(cur)!
        break
      }
      cur = byUid.get(cur)?.manager
    }
  }

  people[uid] = {
    uid,
    cn: u.cn,
    displayName: u.displayName ?? u.cn,
    rhatPreferredLastName: u.rhatPreferredLastName ?? '',
    rhatJobTitle: u.rhatJobTitle ?? '',
    rhatJobRole: u.rhatJobRole ?? '',
    rhatGeo: u.rhatGeo ?? '',
    co: u.co ?? '',
    l: u.l ?? '',
    rhatLocation: u.rhatLocation ?? '',
    rhatHireDate: u.rhatHireDate ?? '',
    managerUid: u.manager && orgUids.has(u.manager) ? u.manager : null,
    directReports: u.directReports ?? 0,
    totalReports: u.totalReports ?? 0,
    teamId,
    yamlRoles: uidToYamlRoles.get(uid) ?? [],
  }
}

console.log(`  Built ${Object.keys(people).length} PersonRecord entries`)

// ── Step 6: Write baseline.json ────────────────────────────────────────────

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

const baseline: BaselineData = {
  importedAt: new Date().toISOString(),
  rootUid: ROOT_UID,
  people,
  teams,
}

const outputPath = path.join(DATA_DIR, 'baseline.json')
fs.writeFileSync(outputPath, JSON.stringify(baseline, null, 2))
console.log(`\nWrote ${outputPath}`)
console.log(`  People: ${Object.keys(people).length}`)
console.log(`  Teams:  ${Object.keys(teams).length}`)
console.log(`  Managers in org: ${Object.values(people).filter((p) => p.directReports > 0).length}`)
console.log(`  Done.`)
