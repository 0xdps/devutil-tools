import { describe, expect, it } from 'vitest'
import { CASE_STYLES, countGraphemes, processLines, splitWords, textStats } from './text'
import {
  formatUuid,
  generatePassword,
  generateUuids,
  inspectUuid,
  lorem,
  passwordEntropy,
  randomBelow,
  randomInts,
  UUID_NAMESPACES,
} from './random'

const convert = (id: string, s: string) => CASE_STYLES.find((c) => c.id === id)!.convert(s)

describe('splitWords', () => {
  it.each([
    ['HTTPServerError', ['HTTP', 'Server', 'Error']],
    ['user_id-v2', ['user', 'id', 'v2']],
    ['fooBar2Baz', ['foo', 'Bar2', 'Baz']],
    ['  hello   world!  ', ['hello', 'world']],
    ['XMLHttpRequest', ['XML', 'Http', 'Request']],
    ['éclairAuChocolat', ['éclair', 'Au', 'Chocolat']],
  ])('%s', (input, words) => expect(splitWords(input)).toEqual(words))
})

describe('case styles', () => {
  it('converts identifiers correctly (the old converter produced h_t_t_p_server)', () => {
    expect(convert('snake', 'HTTPServer')).toBe('http_server')
    expect(convert('camel', 'user ID number')).toBe('userIdNumber')
    expect(convert('pascal', 'get-user_by.id')).toBe('GetUserById')
    expect(convert('constant', 'maxRetryCount')).toBe('MAX_RETRY_COUNT')
    expect(convert('kebab', 'Some Title Here')).toBe('some-title-here')
    expect(convert('title', "it's a dog's life")).toBe("It's A Dog's Life")
    expect(convert('sentence', 'HELLO THERE. HOW ARE YOU? fine')).toBe('Hello there. How are you? Fine')
    expect(convert('title', 'HTTPServerError')).toBe('Http Server Error')
    expect(convert('sentence', 'userAccountId')).toBe('User account id')
  })
})

describe('textStats', () => {
  it('counts graphemes, words, lines, sentences and bytes', () => {
    const s = textStats('Hello world. 👩‍💻 rocks!\n\nSecond paragraph here.')
    expect(s).toMatchObject({ words: 6, lines: 3, sentences: 3, paragraphs: 2 })
    expect(countGraphemes('👩‍💻')).toBe(1)
    expect(textStats('').words).toBe(0)
    expect(textStats('é').bytes).toBe(2)
  })
})

describe('processLines', () => {
  const text = '  banana\napple\n\nApple\nitem10\nitem2\napple  '
  it('trims, removes empties, dedupes case-insensitively and sorts naturally', () => {
    expect(processLines(text, { trim: true, removeEmpty: true, dedupe: true, caseInsensitive: true, sort: 'natural' })).toBe(
      'apple\nbanana\nitem2\nitem10',
    )
  })
  it('keeps order and blank lines by default', () => {
    expect(processLines('b\n\na', {})).toBe('b\n\na')
    expect(processLines('b\na', { sort: 'reverse' })).toBe('a\nb')
  })
})

describe('secure random', () => {
  it('randomBelow stays in range and covers it', () => {
    const seen = new Set(Array.from({ length: 500 }, () => randomBelow(6)))
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4, 5])
  })
  it('unique ints', () => {
    const vals = randomInts(1, 10, 10, true)
    expect(new Set(vals).size).toBe(10)
    expect(() => randomInts(1, 3, 4, true)).toThrow(/Only 3 unique/)
  })
  it('passwords include every chosen set and respect exclusions', () => {
    for (let i = 0; i < 50; i++) {
      const pw = generatePassword({ length: 8, sets: ['lower', 'upper', 'digits', 'symbols'], excludeAmbiguous: true })
      expect(pw).toHaveLength(8)
      expect(pw).toMatch(/[a-z]/)
      expect(pw).toMatch(/[A-Z]/)
      expect(pw).toMatch(/\d/)
      expect(pw).not.toMatch(/[Il1O0o]/)
    }
    expect(() => generatePassword({ length: 8, sets: [] })).toThrow(/at least one/)
    expect(passwordEntropy({ length: 16, sets: ['lower', 'upper', 'digits'] })).toBe(95)
  })
})

describe('uuid', () => {
  it('v4 and v7 have the right version; v7 sorts by time', () => {
    expect(inspectUuid(generateUuids('v4', 1)[0]).version).toBe(4)
    const [a, b] = generateUuids('v7', 2)
    expect(inspectUuid(a).version).toBe(7)
    expect(a < b).toBe(true)
    expect(Math.abs(inspectUuid(a).timestamp!.getTime() - Date.now())).toBeLessThan(5000)
  })
  it('v5 is deterministic (RFC example: python.org in DNS namespace)', () => {
    expect(generateUuids('v5', 3, { namespace: UUID_NAMESPACES.DNS, name: 'python.org' })).toEqual(['886313e1-3b8a-5372-9b90-0c9aee199e5d'])
    expect(() => generateUuids('v5', 1, { namespace: 'nope', name: 'x' })).toThrow(/namespace/)
  })
  it('inspects v1 timestamps and accepts loose formats', () => {
    // RFC 9562 Appendix A.1 example v1 UUID: 2022-02-22T19:22:22Z
    const info = inspectUuid('{C232AB00-9414-11EC-B3C8-9F6BDECED846}')
    expect(info.version).toBe(1)
    expect(info.timestamp!.toISOString()).toBe('2022-02-22T19:22:22.000Z')
    expect(inspectUuid('urn:uuid:00000000-0000-0000-0000-000000000000').isNil).toBe(true)
    expect(inspectUuid('886313e13b8a53729b900c9aee199e5d').version).toBe(5)
    expect(() => inspectUuid('not-a-uuid')).toThrow(/Not a valid UUID/)
  })
  it('formats', () => {
    expect(formatUuid('886313e1-3b8a-5372-9b90-0c9aee199e5d', { uppercase: true, hyphens: false, braces: true })).toBe(
      '{886313E13B8A53729B900C9AEE199E5D}',
    )
  })
})

describe('lorem', () => {
  it('produces the requested amount and starts classically', () => {
    expect(lorem('words', 7).split(' ')).toHaveLength(7)
    expect(lorem('words', 3)).toBe('Lorem ipsum dolor')
    expect(lorem('paragraphs', 3).split('\n\n')).toHaveLength(3)
    expect(lorem('sentences', 2)).toMatch(/^Lorem ipsum dolor sit amet, /)
  })
})
