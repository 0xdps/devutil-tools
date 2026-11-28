import { describe, expect, it } from 'vitest'
import { bytesEqual, digest, formatDigest, hexToBytes, hmac, md5, parseExpectedDigest, toHex } from './hash'
import { estimatePassword, formatDuration } from './password'

const utf8 = (s: string) => new TextEncoder().encode(s)

describe('md5 (RFC 1321 test suite)', () => {
  it.each([
    ['', 'd41d8cd98f00b204e9800998ecf8427e'],
    ['a', '0cc175b9c0f1b6a831c399e269772661'],
    ['abc', '900150983cd24fb0d6963f7d28e17f72'],
    ['message digest', 'f96b697d7cb7938d525a2f31aaf161d0'],
    ['abcdefghijklmnopqrstuvwxyz', 'c3fcd3d76192e4007dfb496cca67e13b'],
    ['ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 'd174ab98d277d9f5a5611c2c9f419d9f'],
    ['1234567890'.repeat(8), '57edf4a22be3c955ac49da2e2107b67a'],
  ])('md5(%j)', (input, expected) => expect(toHex(md5(utf8(input)))).toBe(expected))

  it('handles the 55/56/64-byte padding boundaries', () => {
    expect(toHex(md5(utf8('a'.repeat(55))))).toBe('ef1772b6dff9a122358552954ad0df65')
    expect(toHex(md5(utf8('a'.repeat(56))))).toBe('3b0c8ac703f828b04c6c197006d17218')
    expect(toHex(md5(utf8('a'.repeat(64))))).toBe('014842d480b571495a4a0363793f7367')
  })
})

describe('SHA via WebCrypto', () => {
  it('SHA-1/256/512 of "abc" (FIPS 180 vectors)', async () => {
    expect(toHex(await digest('SHA-1', utf8('abc')))).toBe('a9993e364706816aba3e25717850c26c9cd0d89d')
    expect(toHex(await digest('SHA-256', utf8('abc')))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    expect(toHex(await digest('SHA-512', utf8('abc')))).toMatch(/^ddaf35a193617aba/)
  })
})

describe('hmac (RFC 4231 test case 2)', () => {
  it('HMAC-SHA256 with key "Jefe"', async () => {
    const mac = await hmac('SHA-256', utf8('Jefe'), utf8('what do ya want for nothing?'))
    expect(toHex(mac)).toBe('5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843')
  })
  it('accepts an empty key', async () => {
    expect(toHex(await hmac('SHA-256', new Uint8Array(), utf8('')))).toBe('b613679a0814d9ec772f95d778c35fc5ff1697c493715653c6c712144292c5ad')
  })
})

describe('formatting & comparison', () => {
  it('formats', () => {
    const bytes = hexToBytes('deadBEEF')
    expect(formatDigest(bytes, 'hex')).toBe('deadbeef')
    expect(formatDigest(bytes, 'HEX')).toBe('DEADBEEF')
    expect(formatDigest(bytes, 'base64')).toBe('3q2+7w==')
  })
  it('parses pasted checksums in hex, 0x-hex, base64 and sha256sum lines', () => {
    const md5Hex = '900150983cd24fb0d6963f7d28e17f72' // md5("abc")
    const bytes = hexToBytes(md5Hex)
    for (const s of [md5Hex.toUpperCase(), `0x${md5Hex}`, 'kAFQmDzST7DWlj99KOF/cg==', `${md5Hex}  ubuntu.iso`]) {
      expect(bytesEqual(parseExpectedDigest(s)!, bytes), s).toBe(true)
    }
    expect(parseExpectedDigest('not a hash!')).toBeNull()
    expect(parseExpectedDigest('deadbeef')).toBeNull() // too short to be a digest
  })
})

describe('password estimate', () => {
  it('rates common and patterned passwords as weak', () => {
    for (const pw of ['password', 'P@ssw0rd', 'qwerty123', 'Summer2024!', 'aaaaaaaaaa', 'abcd1234']) {
      expect(estimatePassword(pw).score, pw).toBeLessThanOrEqual(1)
    }
  })
  it('rates long random and passphrase-style passwords as strong', () => {
    expect(estimatePassword('k#9Vq!2mZr@7Lx$4').score).toBe(4)
    expect(estimatePassword('correct horse battery staple').score).toBeGreaterThanOrEqual(3)
  })
  it('explains why', () => {
    expect(estimatePassword('qwertyuiop').warnings.join(' ')).toMatch(/common|Keyboard/)
  })
  it('formats durations', () => {
    expect(formatDuration(0.2)).toBe('instantly')
    expect(formatDuration(90)).toBe('2 minutes')
    expect(formatDuration(1e20)).toBe('centuries')
  })
})
