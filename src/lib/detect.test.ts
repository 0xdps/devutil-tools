import { describe, expect, it } from 'vitest'
import { detectContent } from './detect'

const first = (text: string) => detectContent(text)[0]
const ids = (text: string) => detectContent(text).map((s) => (s.tab ? `${s.toolId}/${s.tab}` : s.toolId))

describe('detectContent', () => {
  it('recognises tokens and identifiers', () => {
    expect(first('Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2ln')).toMatchObject({ toolId: 'jwt-decoder', kind: 'JSON Web Token' })
    expect(first('886313e1-3b8a-5372-9b90-0c9aee199e5d')).toMatchObject({ toolId: 'generators', tab: 'uuid', input: { inspect: '886313e1-3b8a-5372-9b90-0c9aee199e5d' } })
  })
  it('recognises times and schedules', () => {
    expect(first('1700000000')).toMatchObject({ toolId: 'timestamp-tools', input: { input: '1700000000' } })
    expect(first('1700000000000').toolId).toBe('timestamp-tools')
    expect(first('2024-03-15T10:30:00Z').kind).toBe('ISO 8601 date')
    expect(first('*/5 * * * *')).toMatchObject({ tab: 'cron', input: { expr: '*/5 * * * *' } })
    expect(first('0 9 * * MON-FRI').tab).toBe('cron')
    expect(first('@daily').tab).toBe('cron')
  })
  it('does not mistake ordinary numbers for timestamps or cron', () => {
    expect(detectContent('12345')).toEqual([])
    expect(detectContent('1 2 3 4 5')).toEqual([])
  })
  it('recognises URLs, colors and hashes', () => {
    expect(ids('https://example.com/a?b=1')).toEqual(['url-tools', 'qr-code'])
    expect(first('#0ea5e9').toolId).toBe('color-picker')
    expect(first('oklch(70% 0.15 230)').toolId).toBe('color-picker')
    expect(ids('d41d8cd98f00b204e9800998ecf8427e')).toEqual(['hash-verify', 'generators/uuid']) // MD5 first, UUID second
    expect(first('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855').kind).toBe('SHA-256 hash')
  })
  it('recognises structured data', () => {
    expect(ids('{"a": 1, "b": [1, 2]}')).toEqual(['code-json', 'code-json/jsonpath', 'data-transform'])
    expect(first('name: devutil\nversion: 2')).toMatchObject({ toolId: 'data-transform', input: { from: 'yaml', to: 'json' } })
    expect(first('id,name\n1,Ada')).toMatchObject({ input: { from: 'csv' } })
    expect(ids('<div><p>Hello</p></div>')).toEqual(['code-json', 'html-playground'])
  })
  it('recognises encodings', () => {
    expect(first('SGVsbG8sIFdvcmxkIQ==')).toMatchObject({ toolId: 'encoding', input: { scheme: 'base64', mode: 'decode' } })
    expect(first('hello%20world%21')).toMatchObject({ input: { scheme: 'url', mode: 'decode' } })
    expect(detectContent('password')).toEqual([]) // plain words are not Base64
  })
  it('recognises Markdown', () => {
    expect(first('# Title\n\nSome text with a [link](https://x.dev)')?.toolId).toBe('markdown-previewer')
  })
})
