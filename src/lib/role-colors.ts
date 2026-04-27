export const ROLE_COLORS: Record<string, string> = {
  Engineering: '#0066CC',
  'Quality Engineering': '#5C940D',
  'Program/Project Management': '#E67700',
  'Senior Leadership': '#862E9C',
  'Site Reliability Engineering': '#D63384',
  'Product Security': '#E03131',
  'Product Management': '#1098AD',
}

export const DEFAULT_ROLE_COLOR = '#868E96'

export function roleColor(jobRole: string): string {
  return ROLE_COLORS[jobRole] ?? DEFAULT_ROLE_COLOR
}

export const ROLE_LABELS: Array<{ role: string; color: string }> = [
  ...Object.entries(ROLE_COLORS).map(([role, color]) => ({ role, color })),
  { role: 'Unknown', color: DEFAULT_ROLE_COLOR },
]
