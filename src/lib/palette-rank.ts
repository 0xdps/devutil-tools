/**
 * Ranks palette items for a query. cmdk's default fuzzy score treats long
 * descriptions like names, so "uuid" can rank Encode/Decode (whose description
 * mentions "URI") above the UUID generator. This prefers, in order: exact
 * keyword, name prefix, keyword prefix, whole-word match, substring. Returns
 * 0 (hidden) when nothing matches.
 *
 * `terms[0]` is the item's name; the rest are keywords and a description.
 */
export function paletteScore(terms: string[], search: string): number {
  const q = search.trim().toLowerCase()
  if (!q) return 1
  const [name = '', ...rest] = terms.map((t) => t.toLowerCase())
  const keywords = rest.slice(0, -1) // the last term is the (long) description
  const description = rest[rest.length - 1] ?? ''

  if (name === q || keywords.includes(q)) return 1
  if (name.startsWith(q)) return 0.9
  if (keywords.some((k) => k.startsWith(q))) return 0.8
  const word = new RegExp(`(^|[^a-z0-9])${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
  if (word.test(name)) return 0.7
  if (keywords.some((k) => word.test(k))) return 0.6
  if (name.includes(q) || keywords.some((k) => k.includes(q))) return 0.4
  if (word.test(description)) return 0.25
  // Typo tolerance: all query letters appear in order in the name.
  if (q.length >= 3) {
    let i = 0
    for (const ch of name) if (ch === q[i]) i++
    if (i === q.length) return 0.1
  }
  return 0
}
