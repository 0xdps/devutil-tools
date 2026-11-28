/** Regex evaluation and explanation. Pure; runs in a Web Worker in the app. */

export const REGEX_FLAGS = [
  { flag: 'g', name: 'global', hint: 'Find all matches, not just the first' },
  { flag: 'i', name: 'ignore case', hint: 'Case-insensitive matching' },
  { flag: 'm', name: 'multiline', hint: '^ and $ match at line breaks' },
  { flag: 's', name: 'dotAll', hint: '. also matches newlines' },
  { flag: 'u', name: 'unicode', hint: 'Full Unicode, \\p{…} classes' },
  { flag: 'y', name: 'sticky', hint: 'Match only at lastIndex' },
] as const

export interface RegexGroup {
  index: number
  name?: string
  value: string | undefined
  start?: number
  end?: number
}

export interface RegexMatch {
  index: number
  end: number
  value: string
  groups: RegexGroup[]
}

export interface RegexResult {
  matches: RegexMatch[]
  /** True when the match cap was hit. */
  truncated: boolean
  replaced?: string
}

export const MAX_MATCHES = 5000

export function runRegex(pattern: string, flags: string, text: string, replacement?: string): RegexResult {
  // `d` gives group indices for highlighting; it never changes what matches.
  const regex = new RegExp(pattern, flags.includes('d') ? flags : `${flags}d`)
  const names = new Map<number, string>()
  // Map named groups to their numbers by scanning the pattern for "(?<name>".
  let groupNumber = 0
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '\\') {
      i++
      continue
    }
    if (pattern[i] === '[') {
      // skip character classes
      while (i < pattern.length && pattern[i] !== ']') i += pattern[i] === '\\' ? 2 : 1
      continue
    }
    if (pattern[i] === '(') {
      if (pattern[i + 1] !== '?') groupNumber++
      else if (pattern[i + 2] === '<' && pattern[i + 3] !== '=' && pattern[i + 3] !== '!') {
        groupNumber++
        names.set(groupNumber, pattern.slice(i + 3, pattern.indexOf('>', i)))
      }
    }
  }

  const toMatch = (m: RegExpExecArray): RegexMatch => ({
    index: m.index,
    end: m.index + m[0].length,
    value: m[0],
    groups: m.slice(1).map((value, i) => {
      const range = m.indices?.[i + 1]
      return { index: i + 1, name: names.get(i + 1), value, start: range?.[0], end: range?.[1] }
    }),
  })

  const matches: RegexMatch[] = []
  let truncated = false
  if (regex.global || regex.sticky) {
    regex.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = regex.exec(text)) !== null) {
      if (matches.length >= MAX_MATCHES) {
        truncated = true
        break
      }
      matches.push(toMatch(m))
      if (m[0] === '') regex.lastIndex += 1 // avoid infinite loops on empty matches
      if (!regex.global) break
    }
  } else {
    const m = regex.exec(text)
    if (m) matches.push(toMatch(m))
  }

  const replaced = replacement === undefined ? undefined : text.replace(new RegExp(pattern, flags), replacement)
  return { matches, truncated, replaced }
}

// ── Explanation ─────────────────────────────────────────────────────

export interface RegexToken {
  text: string
  description: string
  /** Nesting depth (groups), for indentation. */
  depth: number
}

const ESCAPES: Record<string, string> = {
  d: 'a digit (0–9)',
  D: 'any character except a digit',
  w: 'a word character (letter, digit or _)',
  W: 'any character except a word character',
  s: 'whitespace (space, tab, newline…)',
  S: 'any character except whitespace',
  b: 'a word boundary',
  B: 'a position that is not a word boundary',
  n: 'a newline',
  r: 'a carriage return',
  t: 'a tab',
  '0': 'the NUL character',
}

/** "a-zA-Z_\\d" → "a–z, A–Z, “_”, a digit (0–9)". */
function describeClass(body: string): string {
  const items: string[] = []
  let i = 0
  while (i < body.length) {
    if (body[i] === '\\') {
      const esc = body[i + 1] ?? ''
      items.push(ESCAPES[esc] ?? `“${esc}”`)
      i += 2
    } else if (body[i + 1] === '-' && i + 2 < body.length) {
      items.push(`${body[i]}–${body[i + 2]}`)
      i += 3
    } else {
      items.push(`“${body[i]}”`)
      i++
    }
  }
  return items.join(', ')
}

function describeQuantifier(q: string): string {
  const lazy = q.endsWith('?') && q.length > 1 ? ' (as few as possible)' : ''
  const core = lazy ? q.slice(0, -1) : q
  if (core === '*') return `zero or more times${lazy}`
  if (core === '+') return `one or more times${lazy}`
  if (core === '?') return 'optionally (zero or one time)'
  const m = core.match(/^\{(\d+)(,(\d*))?\}$/)
  if (!m) return q
  if (!m[2]) return `exactly ${m[1]} time${m[1] === '1' ? '' : 's'}`
  if (!m[3]) return `at least ${m[1]} times${lazy}`
  return `between ${m[1]} and ${m[3]} times${lazy}`
}

/** Tokenizes a pattern into human-readable steps. Best effort; not a full parser. */
export function explainRegex(pattern: string): RegexToken[] {
  const tokens: RegexToken[] = []
  let depth = 0
  let group = 0
  let i = 0
  const push = (text: string, description: string, d = depth) => tokens.push({ text, description, depth: d })

  while (i < pattern.length) {
    const ch = pattern[i]
    let text = ''
    let description = ''
    if (ch === '\\') {
      const next = pattern[i + 1] ?? ''
      if (/[pP]/.test(next) && pattern[i + 2] === '{') {
        const end = pattern.indexOf('}', i)
        text = pattern.slice(i, end + 1)
        description = `${next === 'P' ? 'not ' : ''}a character with Unicode property ${text.slice(3, -1)}`
      } else if (/[1-9]/.test(next)) {
        text = pattern.slice(i, i + 2)
        description = `the same text as group ${next} matched`
      } else if (next === 'k' && pattern[i + 2] === '<') {
        text = pattern.slice(i, pattern.indexOf('>', i) + 1)
        description = `the same text as group “${text.slice(3, -1)}” matched`
      } else if (next === 'u' || next === 'x') {
        const len = next === 'u' ? (pattern[i + 2] === '{' ? pattern.indexOf('}', i) - i + 1 : 6) : 4
        text = pattern.slice(i, i + len)
        description = `the character ${text}`
      } else {
        text = pattern.slice(i, i + 2)
        description = ESCAPES[next] ?? `a literal “${next}”`
      }
    } else if (ch === '[') {
      let j = i + 1
      if (pattern[j] === '^') j++
      if (pattern[j] === ']') j++
      while (j < pattern.length && pattern[j] !== ']') j += pattern[j] === '\\' ? 2 : 1
      text = pattern.slice(i, j + 1)
      const negated = text[1] === '^'
      description = `${negated ? 'any character except' : 'one of:'} ${describeClass(text.slice(negated ? 2 : 1, -1))}`
    } else if (ch === '(') {
      let kind = ''
      if (pattern.startsWith('(?:', i)) kind = 'a non-capturing group'
      else if (pattern.startsWith('(?=', i)) kind = 'followed by (lookahead)'
      else if (pattern.startsWith('(?!', i)) kind = 'not followed by (negative lookahead)'
      else if (pattern.startsWith('(?<=', i)) kind = 'preceded by (lookbehind)'
      else if (pattern.startsWith('(?<!', i)) kind = 'not preceded by (negative lookbehind)'
      else if (pattern.startsWith('(?<', i)) {
        group++
        const name = pattern.slice(i + 3, pattern.indexOf('>', i))
        text = pattern.slice(i, i + 4 + name.length)
        push(text, `start of capture group ${group}, named “${name}”`)
        i += text.length
        depth++
        continue
      } else {
        group++
        kind = `capture group ${group}`
      }
      text = kind.startsWith('capture') ? '(' : pattern.slice(i, pattern[i + 2] === '<' ? i + 4 : i + 3)
      push(text, `start of ${kind}`)
      i += text.length
      depth++
      continue
    } else if (ch === ')') {
      depth = Math.max(0, depth - 1)
      text = ')'
      description = 'end of group'
    } else if (ch === '|') {
      text = '|'
      description = 'or'
    } else if (ch === '.') {
      text = '.'
      description = 'any character (except newline unless the s flag is set)'
    } else if (ch === '^') {
      text = '^'
      description = 'start of the text (or line with the m flag)'
    } else if (ch === '$') {
      text = '$'
      description = 'end of the text (or line with the m flag)'
    } else {
      // run of literal characters
      let j = i
      while (j < pattern.length && !'\\[]().|^$*+?{'.includes(pattern[j])) j++
      if (j === i) j = i + 1
      text = pattern.slice(i, j)
      description = text.length === 1 ? `the character “${text}”` : `the text “${text}”`
    }
    i += text.length
    // attach a following quantifier
    const q = pattern.slice(i).match(/^(\*\??|\+\??|\?\??|\{\d+(,\d*)?\}\??)/)
    if (q && text !== '|' && text !== '^' && text !== '$') {
      if (text.length > 1 && !/^[[\\(]/.test(text) && text !== ')') {
        // quantifier applies only to the last literal character
        push(text.slice(0, -1), `the text “${text.slice(0, -1)}”`)
        text = text.slice(-1)
        description = `the character “${text}”`
      }
      push(`${text}${q[0]}`, `${description}, ${describeQuantifier(q[0])}`)
      i += q[0].length
    } else {
      push(text, description, ch === ')' ? depth : depth)
    }
  }
  return tokens
}
