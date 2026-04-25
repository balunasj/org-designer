// Deterministic palette — same teamId always gets the same color
const PALETTE = [
  '#6366f1', // indigo
  '#0891b2', // cyan
  '#059669', // emerald
  '#d97706', // amber
  '#dc2626', // red
  '#7c3aed', // violet
  '#0284c7', // sky
  '#65a30d', // lime
  '#db2777', // pink
  '#ea580c', // orange
]

function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0
  }
  return h
}

export function teamColor(teamId: string): string {
  return PALETTE[hashId(teamId) % PALETTE.length]
}
