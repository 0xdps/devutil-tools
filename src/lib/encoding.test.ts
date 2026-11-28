import { describe, expect, it } from 'vitest'
import {
  decodeBase32,
  decodeBase58,
  decodeBase64,
  decodeDataURI,
  decodeHTML,
  decodeURL,
  encodeBase32,
  encodeBase58,
  encodeBase64,
  encodeBase64Url,
  encodeHTML,
  transform,
  type EncodingScheme,
} from './encoding'

const samples = ['', 'f', 'fo', 'foo', 'foob', 'fooba', 'foobar', 'héllo wörld 👋', '<a href="x">&\'</a>', '\u0000\u0000abc']
const schemes: EncodingScheme[] = ['base64', 'base64url', 'url', 'html', 'base32', 'base58', 'datauri']

describe('round trips', () => {
  for (const scheme of schemes) {
    it(`${scheme} decodes what it encodes`, () => {
      for (const s of samples) {
        expect(transform(scheme, 'decode', transform(scheme, 'encode', s))).toBe(s)
      }
    })
  }
})

describe('RFC 4648 test vectors', () => {
  const vectors: [string, string, string][] = [
    ['', '', ''],
    ['f', 'Zg==', 'MY======'],
    ['fo', 'Zm8=', 'MZXQ===='],
    ['foo', 'Zm9v', 'MZXW6==='],
    ['foob', 'Zm9vYg==', 'MZXW6YQ='],
    ['fooba', 'Zm9vYmE=', 'MZXW6YTB'],
    ['foobar', 'Zm9vYmFy', 'MZXW6YTBOI======'],
  ]
  it.each(vectors)('%j', (plain, b64, b32) => {
    expect(encodeBase64(plain)).toBe(b64)
    expect(encodeBase32(plain)).toBe(b32)
  })
})

describe('base64', () => {
  it('encodes UTF-8', () => expect(encodeBase64('✓')).toBe('4pyT'))
  it('ignores whitespace and missing padding when decoding', () => expect(decodeBase64(' Zm9v\nYg ')).toBe('foob'))
  it('url-safe variant has no padding or +/', () => expect(encodeBase64Url('ûÿ')).toBe('w7vDvw'))
  it('rejects invalid characters', () => expect(() => decodeBase64('Zm9v*')).toThrow(/unexpected character/))
})

describe('base32', () => {
  it('is case-insensitive', () => expect(decodeBase32('mzxw6ytboi======')).toBe('foobar'))
  it('rejects characters outside the alphabet', () => expect(() => decodeBase32('MZXW1')).toThrow(/Invalid Base32/))
})

describe('base58', () => {
  it('matches the Bitcoin alphabet', () => expect(encodeBase58('Hello World!')).toBe('2NEpo7TZRRrLZSi2U'))
  it('preserves leading zero bytes', () => expect(decodeBase58(encodeBase58('\u0000x'))).toBe('\u0000x'))
  it('rejects ambiguous characters', () => expect(() => decodeBase58('0OIl')).toThrow(/Invalid Base58/))
})

describe('url', () => {
  it('decodes + as space', () => expect(decodeURL('a+b%20c')).toBe('a b c'))
  it('reports malformed sequences', () => expect(() => decodeURL('%E0%A4%A')).toThrow(/malformed/))
})

describe('html', () => {
  it('escapes the five special characters', () => expect(encodeHTML(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;'))
  it('decodes named and numeric entities', () => expect(decodeHTML('&copy; &#169; &#xA9; &unknown;')).toBe('© © © &unknown;'))
})

describe('data URI', () => {
  it('decodes base64 payloads', () => expect(decodeDataURI('data:text/plain;base64,aGk=')).toBe('hi'))
  it('rejects non data URIs', () => expect(() => decodeDataURI('hello')).toThrow(/Invalid Data URI/))
})
