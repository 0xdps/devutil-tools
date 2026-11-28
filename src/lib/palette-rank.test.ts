import { describe, expect, it } from 'vitest'
import { paletteScore } from './palette-rank'

const rank = (query: string, items: Record<string, string[]>) =>
  Object.entries(items)
    .map(([id, terms]) => [id, paletteScore(terms, query)] as const)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)

const items = {
  encoding: ['Encode / Decode', 'base64', 'url encode', 'data uri', 'Base64, Base32, Base58, URL, HTML entities, Data URI'],
  generators: ['Generators', 'uuid', 'guid', 'password', 'UUIDs (v4, v7, v5), passwords, random numbers, Lorem Ipsum'],
  jwt: ['JWT Decoder', 'jwt', 'token', 'bearer', 'Decode JSON Web Tokens and verify their signatures'],
  url: ['URL Tools', 'url', 'query string', 'Parse URLs, build query strings, encode components'],
  hash: ['Hash & Verify', 'hash', 'md5', 'sha256', 'Hash text or files, verify checksums, HMAC, password strength'],
}

describe('paletteScore', () => {
  it('puts exact keyword matches first', () => {
    expect(rank('uuid', items)[0]).toBe('generators')
    expect(rank('jwt', items)[0]).toBe('jwt')
    expect(rank('base64', items)[0]).toBe('encoding')
    expect(rank('md5', items)[0]).toBe('hash')
  })
  it('prefers name prefixes over description mentions', () => {
    expect(rank('enc', items)[0]).toBe('encoding')
    expect(rank('url', items)[0]).toBe('url') // not encoding, whose keywords also contain "url encode"
  })
  it('matches words in descriptions last, and tolerates typos in names', () => {
    expect(rank('checksums', items)).toEqual(['hash'])
    expect(rank('gn', items)).toEqual([]) // too short to fuzzy-match
    expect(rank('gnrtrs', items)).toEqual(['generators'])
  })
  it('hides non-matches and shows everything for an empty query', () => {
    expect(rank('zzzz', items)).toEqual([])
    expect(rank('', items)).toHaveLength(5)
  })
})
