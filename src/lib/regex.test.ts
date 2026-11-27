import { describe, expect, it } from 'vitest'
import { explainRegex, runRegex } from './regex'

describe('runRegex', () => {
  it('finds all matches with numbered and named groups and their positions', () => {
    const { matches } = runRegex('(?<year>\\d{4})-(\\d{2})', 'g', 'from 2024-01 to 2025-12')
    expect(matches).toHaveLength(2)
    expect(matches[1]).toMatchObject({ index: 16, end: 23, value: '2025-12' })
    expect(matches[1].groups).toEqual([
      { index: 1, name: 'year', value: '2025', start: 16, end: 20 },
      { index: 2, name: undefined, value: '12', start: 21, end: 23 },
    ])
  })
  it('returns only the first match without g', () => {
    expect(runRegex('a', '', 'aaa').matches).toHaveLength(1)
  })
  it('does not loop forever on empty matches', () => {
    expect(runRegex('x*', 'g', 'abc').matches).toHaveLength(4)
  })
  it('caps very large result sets', () => {
    const r = runRegex('.', 'gs', 'a'.repeat(6000))
    expect(r.truncated).toBe(true)
    expect(r.matches).toHaveLength(5000)
  })
  it('previews replacements with $1 and $<name>', () => {
    expect(runRegex('(?<first>\\w+) (\\w+)', 'g', 'Ada Lovelace', '$2, $<first>').replaced).toBe('Lovelace, Ada')
  })
  it('handles parentheses inside classes and escapes when naming groups', () => {
    const { matches } = runRegex('[(]\\((?<inner>\\w+)\\)', '', '((x)')
    expect(matches[0].groups[0]).toMatchObject({ name: 'inner', value: 'x' })
  })
  it('throws on invalid patterns', () => {
    expect(() => runRegex('(', 'g', 'x')).toThrow()
  })
})

describe('explainRegex', () => {
  const describe_ = (p: string) => explainRegex(p).map((t) => `${t.text} → ${t.description}`)
  it('explains an email-like pattern', () => {
    expect(describe_('^[\\w.]+@\\w+\\.com$')).toEqual([
      '^ → start of the text (or line with the m flag)',
      '[\\w.]+ → one of: a word character (letter, digit or _), “.”, one or more times',
      '@ → the character “@”',
      '\\w+ → a word character (letter, digit or _), one or more times',
      '\\. → a literal “.”',
      'com → the text “com”',
      '$ → end of the text (or line with the m flag)',
    ])
  })
  it('handles groups, alternation, lazy and counted quantifiers', () => {
    const out = describe_('(?<id>\\d{2,4}?)|(?:ab)*')
    expect(out[0]).toBe('(?<id> → start of capture group 1, named “id”')
    expect(out[1]).toBe('\\d{2,4}? → a digit (0–9), between 2 and 4 times (as few as possible)')
    expect(out).toContain('| → or')
    expect(out).toContain('(?: → start of a non-capturing group')
    expect(out.at(-1)).toBe(')* → end of group, zero or more times')
  })
  it('applies a quantifier to the last literal character only', () => {
    expect(describe_('abc+')).toEqual(['ab → the text “ab”', 'c+ → the character “c”, one or more times'])
  })
})
