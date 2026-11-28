import { describe, expect, it } from 'vitest'
import { describeJsonError, findJsonErrorOffset, formatCode, formatJson, minifyCode, minifyCss, queryJsonPath } from './code-format'

describe('JSON', () => {
  it('formats with indent, tabs and sorted keys', () => {
    expect(formatJson('{"b":1,"a":{"d":2,"c":3}}', { indent: 2, sortKeys: true })).toBe('{\n  "a": {\n    "c": 3,\n    "d": 2\n  },\n  "b": 1\n}')
    expect(formatJson('[1]', { indent: 0 })).toBe('[\n\t1\n]')
  })
  it('reports line and column', () => {
    const text = '{\n  "a": 1,\n  "b": }'
    let message = ''
    try {
      JSON.parse(text)
    } catch (e) {
      message = describeJsonError(text, e)
    }
    expect(message).toBe('Line 3, column 8: unexpected “}”')
  })
  it('locates other common mistakes', () => {
    const describe = (text: string) => {
      try {
        JSON.parse(text)
        return 'ok'
      } catch (e) {
        return describeJsonError(text, e)
      }
    }
    expect(describe('{"a": 1,}')).toBe('Line 1, column 9: unexpected “}”') // trailing comma
    expect(describe("{'a': 1}")).toBe('Line 1, column 2: unexpected “\'”') // single quotes
    expect(describe('{"a": 1')).toBe('Line 1, column 8: unexpected end of input')
    expect(describe('[1] x')).toBe('Line 1, column 5: unexpected “x”')
    expect(findJsonErrorOffset('{"a": [1, {"b": "\\u00e9"}], "c": -1.5e3}')).toBe(-1)
  })
  it('minifies', async () => expect(await minifyCode('json', '{ "a" : [ 1 , 2 ] }')).toBe('{"a":[1,2]}'))
})

describe('CSS minify', () => {
  it('collapses whitespace but keeps strings, selectors and license comments', () => {
    const css = `/*! keep */\n/* drop */\n.a  >  .b ,\n.c { content: "a  b ;}" ;  margin : 0 auto ; }\n@media (max-width: 600px) { .d { color: red } }`
    expect(minifyCss(css)).toBe('/*! keep */.a>.b,.c{content:"a  b ;}";margin:0 auto}@media (max-width:600px){.d{color:red}}')
  })
})

describe('Prettier (lazy)', () => {
  it('formats JavaScript', async () => {
    expect(await formatCode('javascript', 'const a={b:1,c:[1,2]};function f(x){return x*2}', { indent: 2 })).toBe(
      'const a = { b: 1, c: [1, 2] };\nfunction f(x) {\n  return x * 2;\n}\n',
    )
  })
  it('formats HTML with embedded CSS', async () => {
    const out = await formatCode('html', '<div><style>a{color:red}</style><p>hi</p></div>', { indent: 4 })
    expect(out).toContain('    <style>')
    expect(out).toContain('color: red;')
  })
  it('reports syntax errors on one line', async () => {
    await expect(formatCode('javascript', 'function (', { indent: 2 })).rejects.toThrow(/^(?!.*\n)/)
  })
})

describe('Terser (lazy)', () => {
  it('minifies JavaScript safely (strings and ASI intact)', async () => {
    const out = await minifyCode('javascript', 'const greeting = "hello   world"\nconst n = 1\nexport { greeting, n }')
    expect(out).toContain('"hello   world"')
    expect(out).not.toContain('\n')
  })
})

describe('JSONPath', () => {
  const data = { store: { book: [{ title: 'A', price: 8 }, { title: 'B', price: 22 }], bike: { price: 19 } } }
  it('supports wildcards, recursive descent and filters', async () => {
    expect((await queryJsonPath(data, '$.store.book[*].title')).map((m) => m.value)).toEqual(['A', 'B'])
    expect((await queryJsonPath(data, '$..price')).map((m) => m.value)).toEqual([8, 22, 19])
    const cheap = await queryJsonPath(data, '$.store.book[?(@.price < 10)]')
    expect(cheap).toEqual([{ path: "$['store']['book'][0]", value: { title: 'A', price: 8 } }])
  })
  it('does not execute arbitrary code in filters', async () => {
    await expect(queryJsonPath(data, '$..book[?(globalThis.pwned = 1)]')).rejects.toThrow()
    expect((globalThis as Record<string, unknown>).pwned).toBeUndefined()
  })
})
