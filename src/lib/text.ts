/** Text transforms: case conversion, statistics and line operations. Pure. */

// ── Case conversion ─────────────────────────────────────────────────

/**
 * Splits text into words, understanding existing identifiers:
 * "HTTPServerError" → HTTP Server Error, "user_id-v2" → user id v2.
 * Digits stay attached to their word ("Bar2Baz" → Bar2 Baz).
 */
export function splitWords(input: string): string[] {
  return (
    input
      .replace(/([\p{Ll}\d])(\p{Lu})/gu, '$1 $2') // fooBar → foo Bar
      .replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, '$1 $2') // HTTPServer → HTTP Server
      .match(/[\p{L}\p{N}]+/gu) ?? []
  )
}

/** Identifiers (no whitespace) are split into words first; prose is kept as-is. */
const asProse = (s: string) => (/\s/.test(s.trim()) ? s : splitWords(s).join(' '))

const lower = (w: string) => w.toLocaleLowerCase()
const upper = (w: string) => w.toLocaleUpperCase()
const cap = (w: string) => upper(w.charAt(0)) + lower(w.slice(1))

export interface CaseStyle {
  id: string
  label: string
  convert: (input: string) => string
}

export const CASE_STYLES: CaseStyle[] = [
  { id: 'camel', label: 'camelCase', convert: (s) => splitWords(s).map((w, i) => (i ? cap(w) : lower(w))).join('') },
  { id: 'pascal', label: 'PascalCase', convert: (s) => splitWords(s).map(cap).join('') },
  { id: 'snake', label: 'snake_case', convert: (s) => splitWords(s).map(lower).join('_') },
  { id: 'constant', label: 'CONSTANT_CASE', convert: (s) => splitWords(s).map(upper).join('_') },
  { id: 'kebab', label: 'kebab-case', convert: (s) => splitWords(s).map(lower).join('-') },
  { id: 'train', label: 'Train-Case', convert: (s) => splitWords(s).map(cap).join('-') },
  { id: 'dot', label: 'dot.case', convert: (s) => splitWords(s).map(lower).join('.') },
  { id: 'path', label: 'path/case', convert: (s) => splitWords(s).map(lower).join('/') },
  { id: 'title', label: 'Title Case', convert: (s) => asProse(s).replace(/[\p{L}\p{N}]+(?:['’][\p{L}]+)?/gu, cap) },
  {
    id: 'sentence',
    label: 'Sentence case',
    convert: (s) => lower(asProse(s)).replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (_, pre: string, ch: string) => pre + upper(ch)),
  },
  { id: 'lower', label: 'lower case', convert: lower },
  { id: 'upper', label: 'UPPER CASE', convert: upper },
]

// ── Statistics ──────────────────────────────────────────────────────

export interface TextStats {
  characters: number
  charactersNoSpaces: number
  words: number
  lines: number
  sentences: number
  paragraphs: number
  bytes: number
  /** Minutes at 230 words/min. */
  readingMinutes: number
  /** Minutes at 150 words/min. */
  speakingMinutes: number
}

const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null

/** Counts user-perceived characters (an emoji like 👩‍💻 is 1, not 5). */
export function countGraphemes(s: string): number {
  if (!segmenter) return [...s].length
  let n = 0
  for (const _ of segmenter.segment(s)) n++ // eslint-disable-line @typescript-eslint/no-unused-vars
  return n
}

export function textStats(text: string): TextStats {
  const trimmed = text.trim()
  const words = trimmed ? (trimmed.match(/[\p{L}\p{N}][\p{L}\p{N}'’_-]*/gu) ?? []).length : 0
  return {
    characters: countGraphemes(text),
    charactersNoSpaces: countGraphemes(text.replace(/\s/g, '')),
    words,
    lines: text ? text.split(/\r\n|\r|\n/).length : 0,
    sentences: trimmed ? trimmed.split(/(?<=[.!?…])\s+/).filter((s) => /[\p{L}\p{N}]/u.test(s)).length : 0,
    paragraphs: trimmed ? trimmed.split(/(?:\r?\n\s*){2,}/).filter((p) => p.trim()).length : 0,
    bytes: new TextEncoder().encode(text).length,
    readingMinutes: words / 230,
    speakingMinutes: words / 150,
  }
}

// ── Line operations (applied in a fixed, predictable order) ────────

export type SortMode = 'none' | 'asc' | 'desc' | 'natural' | 'length' | 'reverse' | 'shuffle'

export interface LineOptions {
  trim?: boolean
  collapseSpaces?: boolean
  removeEmpty?: boolean
  dedupe?: boolean
  caseInsensitive?: boolean
  sort?: SortMode
}

export function processLines(text: string, opts: LineOptions, random: () => number = Math.random): string {
  let lines = text.split(/\r\n|\r|\n/)
  if (opts.trim) lines = lines.map((l) => l.trim())
  if (opts.collapseSpaces) lines = lines.map((l) => l.replace(/[ \t]{2,}/g, ' '))
  if (opts.removeEmpty) lines = lines.filter((l) => l.trim() !== '')
  if (opts.dedupe) {
    const seen = new Set<string>()
    lines = lines.filter((l) => {
      const key = opts.caseInsensitive ? l.toLocaleLowerCase() : l
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }
  const collator = new Intl.Collator(undefined, { sensitivity: opts.caseInsensitive ? 'base' : 'variant' })
  const natural = new Intl.Collator(undefined, { numeric: true, sensitivity: opts.caseInsensitive ? 'base' : 'variant' })
  switch (opts.sort) {
    case 'asc':
      lines = [...lines].sort(collator.compare)
      break
    case 'desc':
      lines = [...lines].sort((a, b) => collator.compare(b, a))
      break
    case 'natural':
      lines = [...lines].sort(natural.compare)
      break
    case 'length':
      lines = [...lines].sort((a, b) => a.length - b.length || collator.compare(a, b))
      break
    case 'reverse':
      lines = [...lines].reverse()
      break
    case 'shuffle':
      lines = [...lines]
      for (let i = lines.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1))
        ;[lines[i], lines[j]] = [lines[j], lines[i]]
      }
      break
  }
  return lines.join('\n')
}
