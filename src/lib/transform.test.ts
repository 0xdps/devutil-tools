import { describe, expect, it } from 'vitest'
import { convertData, detectFormat, flattenRow, parseData, type DataFormat } from './transform'

const sample = { name: 'devutil', version: 2, tags: ['a', 'b'], owner: { login: 'ada', site: 'https://x.dev' }, active: true }

describe('round trips through every structured format', () => {
  for (const fmt of ['json', 'yaml', 'toml'] as DataFormat[]) {
    it(`json → ${fmt} → json`, () => {
      const there = convertData('json', fmt, JSON.stringify(sample)).output
      expect(JSON.parse(convertData(fmt, 'json', there).output)).toEqual(sample)
    })
  }
  it('json → xml → json keeps a single-key root', () => {
    const xml = convertData('json', 'xml', JSON.stringify({ project: { name: 'x', stars: 5 } }))
    expect(xml.output).toContain('<project>')
    expect(xml.output).not.toContain('<root>')
    expect(xml.warnings).toEqual([])
    expect(JSON.parse(convertData('xml', 'json', xml.output).output)).toEqual({ project: { name: 'x', stars: 5 } })
  })
})

describe('CSV', () => {
  it('flattens nested objects instead of writing [object Object]', () => {
    const { output, warnings } = convertData('json', 'csv', JSON.stringify([sample]))
    expect(output.split('\r\n')[0]).toBe('name,version,tags,owner.login,owner.site,active')
    expect(output).not.toContain('[object Object]')
    expect(output).toContain('"[""a"",""b""]"')
    expect(warnings[0]).toMatch(/flattened/)
  })
  it('unions columns across rows', () => {
    expect(convertData('json', 'csv', '[{"a":1},{"b":2}]').output).toBe('a,b\r\n1,\r\n,2')
  })
  it('parses typed values and auto-detects the delimiter', () => {
    expect(parseData('csv', 'id;ok;name\n1;true;x\n2;false;y')).toEqual([
      { id: 1, ok: true, name: 'x' },
      { id: 2, ok: false, name: 'y' },
    ])
  })
  it('flattenRow', () => expect(flattenRow({ a: { b: { c: 1 } }, d: [] })).toEqual({ 'a.b.c': 1, d: '[]' }))
})

describe('TOML', () => {
  it('wraps top-level arrays as [[items]]', () => {
    const { output, warnings } = convertData('json', 'toml', '[{"a":1},{"a":2}]')
    expect(output).toContain('[[items]]')
    expect(warnings[0]).toMatch(/\[\[items\]\]/)
  })
  it('drops nulls with a warning instead of failing', () => {
    const { output, warnings } = convertData('json', 'toml', '{"a":1,"b":null,"c":{"d":null}}')
    expect(output.trim()).toBe('a = 1\n\n[c]')
    expect(warnings[0]).toMatch(/2 fields were dropped: b, c.d/)
  })
  it('rejects scalars', () => expect(() => convertData('json', 'toml', '42')).toThrow(/table/))
})

describe('errors', () => {
  it('surfaces parser messages', () => {
    expect(() => convertData('json', 'yaml', '{"a": }')).toThrow()
    expect(() => convertData('yaml', 'json', 'a: [1, 2')).toThrow()
    expect(() => convertData('toml', 'json', 'a = ')).toThrow()
  })
})

describe('detectFormat', () => {
  it.each([
    ['{"a":1}', 'json'],
    ['<a>1</a>', 'xml'],
    ['title = "x"\n[owner]\nname = "y"', 'toml'],
    ['name: x\nlist:\n  - 1', 'yaml'],
    ['a,b\n1,2', 'csv'],
  ])('%s → %s', (text, fmt) => expect(detectFormat(text)).toBe(fmt))
})
