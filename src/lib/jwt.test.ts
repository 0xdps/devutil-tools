import { describe, expect, it } from 'vitest'
import { bytesToBase64 } from './encoding'
import { decodeJwt, formatRelative, JwtError, tokenStatus, verifyJwtSignature } from './jwt'

const b64url = (bytes: Uint8Array) => bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const seg = (obj: unknown) => b64url(new TextEncoder().encode(JSON.stringify(obj)))
const subtle = globalThis.crypto.subtle

async function sign(header: object, payload: object, algorithm: AlgorithmIdentifier | RsaPssParams | EcdsaParams, key: CryptoKey) {
  const input = `${seg(header)}.${seg(payload)}`
  const sig = new Uint8Array(await subtle.sign(algorithm, key, new TextEncoder().encode(input)))
  return `${input}.${b64url(sig)}`
}

async function spkiPem(key: CryptoKey) {
  const der = new Uint8Array(await subtle.exportKey('spki', key))
  return `-----BEGIN PUBLIC KEY-----\n${bytesToBase64(der).replace(/(.{64})/g, '$1\n')}\n-----END PUBLIC KEY-----`
}

describe('decodeJwt', () => {
  it('decodes Base64URL segments containing - and _ (atob would fail)', () => {
    // "subject?>>" encodes to a payload containing "_" and "-"
    const token = `${seg({ alg: 'HS256' })}.${seg({ sub: 'ü?>>~~', n: 'ÿÿ' })}.sig`
    expect(token).toMatch(/[-_]/)
    expect(decodeJwt(token).payload).toEqual({ sub: 'ü?>>~~', n: 'ÿÿ' })
  })

  it('strips a Bearer prefix and whitespace', () => {
    const token = `${seg({ alg: 'none' })}.${seg({ a: 1 })}.`
    expect(decodeJwt(`  Bearer ${token}\n`).payload).toEqual({ a: 1 })
  })

  it('reports which part is broken', () => {
    expect(() => decodeJwt('abc.def')).toThrow(/3 dot-separated parts; this has 2/)
    expect(() => decodeJwt(`${seg({ a: 1 })}.!!!.x`)).toThrowError(expect.objectContaining({ part: 'payload' }))
    expect(() => decodeJwt(`${b64url(new TextEncoder().encode('nope'))}.${seg({})}.x`)).toThrow(/Header is not valid JSON/)
    expect(() => decodeJwt(`${seg([1])}.${seg({})}.x`)).toThrow(/must be a JSON object/)
  })

  it('explains encrypted tokens', () => {
    expect(() => decodeJwt('a.b.c.d.e')).toThrow(JwtError)
    expect(() => decodeJwt('a.b.c.d.e')).toThrow(/JWE/)
  })
})

describe('tokenStatus', () => {
  const now = 1_700_000_000_000
  it('valid / expired / not yet valid / no expiry', () => {
    expect(tokenStatus({ exp: 1_700_000_060 }, now)).toEqual({ state: 'valid', expiresIn: 60 })
    expect(tokenStatus({ exp: 1_699_999_000 }, now).state).toBe('expired')
    expect(tokenStatus({ nbf: 1_700_000_100, exp: 1_700_001_000 }, now).state).toBe('not-yet-valid')
    expect(tokenStatus({ sub: 'x' }, now)).toEqual({ state: 'no-expiry' })
  })
})

describe('formatRelative', () => {
  it('picks a sensible unit', () => {
    expect(formatRelative(3 * 3600, 'en')).toBe('in 3 hours')
    expect(formatRelative(-2 * 86400, 'en')).toBe('2 days ago')
  })
})

describe('verifyJwtSignature', () => {
  const payload = { sub: '123', name: 'Ada' }

  it('HS256 with a UTF-8 and a Base64 secret', async () => {
    const secret = 'a-string-secret-at-least-256-bits-long'
    const key = await subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const jwt = decodeJwt(await sign({ alg: 'HS256', typ: 'JWT' }, payload, 'HMAC', key))
    expect(await verifyJwtSignature(jwt, secret)).toBe(true)
    expect(await verifyJwtSignature(jwt, 'wrong-secret')).toBe(false)
    const b64secret = bytesToBase64(new TextEncoder().encode(secret))
    expect(await verifyJwtSignature(jwt, b64secret, { secretEncoding: 'base64' })).toBe(true)
  })

  it('RS256 with a PEM public key, and rejects a tampered payload', async () => {
    const pair = await subtle.generateKey(
      { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
      true,
      ['sign', 'verify'],
    )
    const token = await sign({ alg: 'RS256' }, payload, 'RSASSA-PKCS1-v1_5', pair.privateKey)
    const pem = await spkiPem(pair.publicKey)
    expect(await verifyJwtSignature(decodeJwt(token), pem)).toBe(true)
    const [h, , s] = token.split('.')
    expect(await verifyJwtSignature(decodeJwt(`${h}.${seg({ ...payload, admin: true })}.${s}`), pem)).toBe(false)
  })

  it('ES256 with a JWK public key', async () => {
    const pair = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
    const token = await sign({ alg: 'ES256' }, payload, { name: 'ECDSA', hash: 'SHA-256' }, pair.privateKey)
    const jwk = JSON.stringify(await subtle.exportKey('jwk', pair.publicKey))
    expect(await verifyJwtSignature(decodeJwt(token), jwk)).toBe(true)
  })

  it('refuses alg none and unsupported algorithms with a reason', async () => {
    await expect(verifyJwtSignature(decodeJwt(`${seg({ alg: 'none' })}.${seg({})}.`), 'x')).rejects.toThrow(/unsigned/)
    await expect(verifyJwtSignature(decodeJwt(`${seg({ alg: 'EdDSA' })}.${seg({})}.x`), 'x')).rejects.toThrow(/not supported/)
  })

  it('explains a wrong key format', async () => {
    const jwt = decodeJwt(`${seg({ alg: 'RS256' })}.${seg({})}.x`)
    await expect(verifyJwtSignature(jwt, 'not a key')).rejects.toThrow(/PEM public key/)
    await expect(verifyJwtSignature(jwt, '-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----')).rejects.toThrow(/PUBLIC KEY/)
  })
})
