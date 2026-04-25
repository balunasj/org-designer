import { describe, it, expect } from 'vitest'
import { teamColor } from '@/lib/team-colors'

const PALETTE = [
  '#6366f1',
  '#0891b2',
  '#059669',
  '#d97706',
  '#dc2626',
  '#7c3aed',
  '#0284c7',
  '#65a30d',
  '#db2777',
  '#ea580c',
]

describe('teamColor', () => {
  it('returns a valid hex color from the palette', () => {
    const color = teamColor('fleet_experience')
    expect(PALETTE).toContain(color)
  })

  it('is deterministic — same input always returns same color', () => {
    const ids = ['team-alpha', 'fleet', 'hybrid_platforms', 'team_group_123']
    for (const id of ids) {
      expect(teamColor(id)).toBe(teamColor(id))
    }
  })

  it('different team IDs can produce different colors', () => {
    const colors = new Set(['team-a', 'team-b', 'team-c', 'team-d', 'team-e'].map(teamColor))
    // Not all 5 are guaranteed distinct (hash collisions possible), but at least 2 should differ
    expect(colors.size).toBeGreaterThan(1)
  })

  it('handles empty string without throwing', () => {
    expect(() => teamColor('')).not.toThrow()
    expect(PALETTE).toContain(teamColor(''))
  })

  it('handles long team IDs without throwing', () => {
    const longId = 'a'.repeat(1000)
    expect(() => teamColor(longId)).not.toThrow()
    expect(PALETTE).toContain(teamColor(longId))
  })
})
