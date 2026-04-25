# Org Designer

An interactive org chart tool for exploring, visualizing, and redesigning team structure — without touching the source of truth.

## The Problem It Solves

Engineering managers need to explore org structure changes before committing to them: rebalancing span-of-control, modelling reorgs, identifying geo imbalances, or preparing headcount conversations. Existing tools are either static (PowerPoint, Lucidchart) or live-edit (which is dangerous). Org Designer sits in between: it pulls a snapshot of your org from LDAP and lets you experiment with structure through drag-and-drop, saving named "scenarios" you can share or revisit.

## Screenshot

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Org Designer  [default]          [⤢] [⤡] [↺] [↻]              [↓ Export]  │
├──────────────┬──────────────────────────────────────────────────────────────┤
│ 📊 Metrics   │                                                              │
│ 🔍 Filters   │         ┌────────────────────┐                              │
│ ↕ Import/Exp │         │  Alex Rivera   ENG │                              │
│ ⚙ Configure  │         │  VP Engineering    │  ← root node                 │
│              │         │  Americas · US     │                              │
│ ──────────── │         │  ■ 4 / 127         │                              │
│ Metrics tab  │         └─────────┬──────────┘                              │
│              │          ┌────────┴────────┐                                │
│ People: 127  │          ▼                 ▼                                │
│ Managers: 14 │  ┌──────────────┐  ┌──────────────┐                        │
│ Geo spread:  │  │ Jamie Chen   │  │ Morgan Patel  │                        │
│  APAC  18%   │  │ Sr. Mgr SWE  │  │ Sr. Mgr QE   │                        │
│  EMEA  31%   │  │ APAC · SG    │  │ EMEA · GB    │                        │
│  NA    51%   │  │ ■ 3 / 42     │  │ ■ 3 / 31     │                        │
│              │  └──────────────┘  └──────────────┘                        │
│ ──────────── │                                                              │
│ Role Legend  │  Drag a card onto another to reparent. Hold Shift to move   │
│ 🔵 Engineer  │  the individual only (reports stay with old manager).        │
│ 🟢 Manager   │                                                              │
│ 🟡 Architect │                                                              │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

## Quickstart

**Prerequisites:** Node 20+, Python 3.10+, VPN access to Red Hat LDAP (for data refresh only)

```bash
# 1. Install dependencies
npm install

# 2. Fetch org data from LDAP (requires VPN + ldap-utils)
make fetch-users

# 3. Import and process into baseline snapshot
npm run import         # or: make import

# 4. Start the dev server
make dev               # starts Vite (port 5173) + API server (port 3001)
```

Open http://localhost:5173.

If you already have a `data/baseline.json` from a colleague, skip steps 2–3 and go straight to `make dev`.

## User Guide

### Navigating the Chart

| Action | How |
|--------|-----|
| Expand a manager's reports | Click the chevron at the bottom of their card |
| Expand all / Collapse all | Toolbar buttons (⤢ / ⤡) |
| Pan | Click and drag the canvas |
| Zoom | Scroll wheel |
| Select a node | Click it |

### Reparenting (Drag to Reorg)

Drag a card on top of another card to make them the new manager. The card must visually overlap the target — a green highlight indicates the drop target. Release to reparent.

- **Default (Shift not held):** moves the person *and their entire subtree* to the new parent
- **Hold Shift:** moves only the individual; their direct reports are re-parented to their old manager

Reparents are recorded as overlay actions on top of the baseline. Use **Undo / Redo** (↺/↻) to step through changes.

### Scenarios

Named sets of changes saved to `scenarios/`. Use the **Import/Export** tab to:
- Save the current overlay as a named scenario
- Load a saved scenario
- Delete scenarios
- Copy a deep-link URL to share the current scenario view

### Filters

The **Filters** tab lets you narrow the chart by geo, country, job role, or name/title search.

- **Highlight mode:** non-matching cards dim to 25% opacity
- **Hide mode:** non-matching cards (and their orphaned branches) are removed from the layout

### Configure

| Setting | Description |
|---------|-------------|
| Job Title | Show/hide the full job title line |
| Location | Show/hide Geo · Country |
| City | Show/hide city/locality |
| Hire Date | Show/hide hire date (YYYY-MM-DD) |
| Tenure | Show/hide years of tenure (e.g. "8 years", "<1 year") |
| Team | Show/hide the YAML team assignment |
| Report Counts | Show/hide direct/total report count on manager cards |
| Card Density | Compact / Default / Comfortable — controls spacing between cards |
| Layout Direction | Vertical (top-to-bottom) or Horizontal (left-to-right) |
| Snap to Grid | When ON, releasing a drag without reparenting snaps the card back to its layout position |

## Architecture

```
org-designer/
├── server/index.ts          # Express API (port 3001)
│   ├── GET  /api/baseline   # serves data/baseline.json
│   └── CRUD /api/scenarios/:name
│
├── src/
│   ├── App.tsx              # root: loads baseline + optional ?scenario= URL param
│   ├── store/index.ts       # Zustand store: baseline, overlay, undo/redo, filters, config
│   │
│   ├── types/
│   │   ├── person.ts        # PersonRecord, TeamRecord, BaselineData
│   │   ├── overlay.ts       # OverlayAction union (move, scope_*)
│   │   └── org.ts           # EffectiveState, OrgNode types
│   │
│   ├── lib/
│   │   ├── overlay-engine.ts  # applyOverlay(): applies actions to baseline → EffectiveState
│   │   ├── layout-engine.ts   # computeLayout(): dagre graph → React Flow nodes/edges
│   │   ├── filter-utils.ts    # matchesFilter(), computeFilteredIds()
│   │   ├── role-colors.ts     # job role → color mapping
│   │   └── role-abbreviation.ts
│   │
│   ├── components/
│   │   ├── chart/
│   │   │   ├── OrgChart.tsx   # React Flow canvas, drag-and-drop, filter application
│   │   │   ├── PersonNode.tsx # card renderer (all field toggles, handle direction)
│   │   │   └── ScopeNode.tsx  # team/scope label node
│   │   ├── layout/
│   │   │   ├── Toolbar.tsx    # undo/redo, expand/collapse, export (PNG/SVG/PDF)
│   │   │   └── Sidebar.tsx    # tab switcher
│   │   └── panels/
│   │       ├── MetricsDashboard.tsx
│   │       ├── FilterPanel.tsx
│   │       ├── ScenarioPanel.tsx
│   │       └── ConfigPanel.tsx
│   │
│   └── main.tsx
│
├── scripts/
│   ├── import.ts            # reads all_users.json + org YAML → data/baseline.json
│   ├── ldif_to_json.py      # converts ldapsearch output to JSON
│   └── enrich_users.py      # adds geocoding + report counts
│
└── data/                    # gitignored — contains PII
    ├── all_users.json        # raw LDAP dump (generated by make fetch-users)
    └── baseline.json         # processed snapshot (generated by npm run import)
```

### Data Flow

```
LDAP  →  ldif_to_json.py  →  enrich_users.py  →  all_users.json
                                                         │
org YAML repo ──────────────────────────────────────────┤
                                                         ▼
                                                   import.ts
                                                         │
                                                         ▼
                                                  baseline.json  ←── API server
                                                                          │
                                                                          ▼
                                                              React app (Vite)
                                                                          │
                                                              overlay actions (in memory)
                                                                          │
                                                                          ▼
                                                              EffectiveState (computed)
                                                                          │
                                                                          ▼
                                                              dagre layout → React Flow
```

### Key Design Decisions

**Overlay pattern:** All reorg changes are stored as an ordered list of actions (`OverlayAction[]`) applied on top of an immutable baseline. Nothing is ever written back to LDAP or the org YAML. This makes undo/redo trivial and keeps experimentation safe.

**Controlled React Flow:** `nodes` are stored in local `useState`, seeded from the dagre layout. `onNodesChange` + `applyNodeChanges` allows drag position updates without losing layout. When the effective state changes (reparent, expand/collapse), the layout re-seeds from dagre with CSS transition animations.

**No PII in git:** `data/` is gitignored. The baseline is regenerated locally from LDAP.

## Build Pipeline

```bash
make fetch-users   # LDAP → data/all_users.json  (needs VPN + ldap-utils)
npm run import     # all_users.json + org YAML → data/baseline.json
npm run build      # TypeScript compile + Vite bundle → dist/
make check         # TypeScript type-check only (no emit)
```

Production build output lands in `dist/` and can be served as a static site alongside the API server (`npm run server`).

## Makefile Reference

| Target | Description |
|--------|-------------|
| `make dev` | Start dev server (Vite + API) — requires baseline.json |
| `make fetch-users` | Re-fetch from LDAP → all_users.json (VPN required) |
| `make import` | Rebuild baseline.json from all_users.json + org YAML |
| `make build` | Production bundle |
| `make check` | Type-check without building |
| `make clean` | Remove dist/ and data/ |
| `make clean-baseline` | Remove baseline.json only (keep all_users.json) |
