// Produces an abbreviation from a job title.
// "Principal Site Reliability Engineer" → "PSRE"
// "Senior Manager, Engineering" → "SME"
// Strips punctuation and takes the first letter of each meaningful word.

const SKIP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'for', 'in', 'to', 'at',
])

export function roleAbbreviation(title: string): string {
  if (!title) return '—'
  return title
    .replace(/[,;]/g, ' ')
    .split(/[\s\-/]+/)
    .filter((w) => w.length > 0 && !SKIP_WORDS.has(w.toLowerCase()))
    .map((w) => w[0].toUpperCase())
    .join('')
}
