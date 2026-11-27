import { describe, expect, it } from 'vitest'
import { parseUrl, urlParts, withParams } from './url'

describe('parseUrl', () => {
  it('parses components and decodes query params, keeping duplicates', () => {
    const { url, params, assumedScheme } = parseUrl('https://api.example.com:8080/v1/users?tag=a&tag=b&q=hello%20world#top')
    expect(assumedScheme).toBe(false)
    expect(url.port).toBe('8080')
    expect(params).toEqual([
      { key: 'tag', value: 'a' },
      { key: 'tag', value: 'b' },
      { key: 'q', value: 'hello world' },
    ])
  })

  it('assumes https for bare hosts, including host:port', () => {
    expect(parseUrl('example.com/a').url.href).toBe('https://example.com/a')
    const local = parseUrl('localhost:3000/x')
    expect(local.assumedScheme).toBe(true)
    expect(local.url.port).toBe('3000')
  })

  it('explains invalid input', () => {
    expect(() => parseUrl('')).toThrow(/Enter a URL/)
    expect(() => parseUrl('/just/a/path')).toThrow(/relative path/)
    expect(() => parseUrl('http://exa mple.com')).toThrow(/Not a valid URL/)
  })
})

describe('withParams', () => {
  it('rebuilds the query string and drops empty keys', () => {
    const { url } = parseUrl('https://x.dev/p?a=1#h')
    expect(withParams(url, [{ key: 'a', value: '1 2' }, { key: '', value: 'x' }, { key: 'b', value: '&' }])).toBe(
      'https://x.dev/p?a=1+2&b=%26#h',
    )
    expect(withParams(url, [])).toBe('https://x.dev/p#h')
  })
})

describe('urlParts', () => {
  it('lists non-empty parts with decoded path and default ports', () => {
    const parts = urlParts(parseUrl('https://user:p%40ss@x.dev/caf%C3%A9').url)
    const byId = Object.fromEntries(parts.map((p) => [p.id, p.value]))
    expect(byId).toMatchObject({ protocol: 'https', username: 'user', password: 'p@ss', port: '443 (default)', pathname: '/café' })
    expect(byId.hash).toBeUndefined()
  })
})
