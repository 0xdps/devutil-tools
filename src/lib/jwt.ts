/**
 * JWT decoding and local signature verification (WebCrypto).
 * Pure and portable: works in browsers and Node 20+ (globalThis.crypto.subtle).
 */
import { base64ToBytes } from './encoding'

export type JsonObject = Record<string, unknown>

export interface DecodedJwt {
  header: JsonObject
  payload: JsonObject
  /** Base64URL signature segment, as it appears in the token. */
  signature: string
  /** `header.payload` — the bytes the signature covers. */
  signingInput: string
}

export class JwtError extends Error {
  constructor(
    message: string,
    readonly part: 'format' | 'header' | 'payload',
  ) {
    super(message)
    this.name = 'JwtError'
  }
}

const utf8 = new TextDecoder('utf-8', { fatal: true })

function decodeSegment(segment: string, part: 'header' | 'payload'): JsonObject {
  const label = part === 'header' ? 'Header' : 'Payload'
  let text: string
  try {
    text = utf8.decode(base64ToBytes(segment))
  } catch {
    throw new JwtError(`${label} is not valid Base64URL`, part)
  }
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    throw new JwtError(`${label} is not valid JSON`, part)
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new JwtError(`${label} must be a JSON object`, part)
  }
  return value as JsonObject
}

/** Decodes a compact JWS. Accepts surrounding whitespace and a "Bearer " prefix. */
export function decodeJwt(input: string): DecodedJwt {
  const token = input.trim().replace(/^bearer\s+/i, '')
  const parts = token.split('.')
  if (parts.length === 5) {
    throw new JwtError('This is an encrypted token (JWE). Its payload cannot be read without the private key.', 'format')
  }
  if (parts.length !== 3) {
    throw new JwtError(`A JWT has 3 dot-separated parts; this has ${parts.length}`, 'format')
  }
  const [h, p, signature] = parts
  return {
    header: decodeSegment(h, 'header'),
    payload: decodeSegment(p, 'payload'),
    signature,
    signingInput: `${h}.${p}`,
  }
}

// ── Claims ──────────────────────────────────────────────────────────

export const CLAIM_LABELS: Record<string, string> = {
  iss: 'Issuer',
  sub: 'Subject',
  aud: 'Audience',
  exp: 'Expires at',
  nbf: 'Not before',
  iat: 'Issued at',
  jti: 'JWT ID',
  auth_time: 'Authenticated at',
  updated_at: 'Updated at',
  azp: 'Authorized party',
  scope: 'Scope',
  nonce: 'Nonce',
  sid: 'Session ID',
  alg: 'Algorithm',
  typ: 'Type',
  kid: 'Key ID',
  cty: 'Content type',
}

/** NumericDate claims (seconds since epoch). */
export const TIME_CLAIMS = new Set(['exp', 'nbf', 'iat', 'auth_time', 'updated_at'])

export type TokenState = 'valid' | 'expired' | 'not-yet-valid' | 'no-expiry'

export interface TokenStatus {
  state: TokenState
  /** Seconds until exp (negative when expired). */
  expiresIn?: number
  /** Seconds until nbf when not yet valid. */
  validIn?: number
}

export function tokenStatus(payload: JsonObject, nowMs = Date.now()): TokenStatus {
  const now = nowMs / 1000
  const exp = typeof payload.exp === 'number' ? payload.exp : undefined
  const nbf = typeof payload.nbf === 'number' ? payload.nbf : undefined
  if (nbf !== undefined && now < nbf) return { state: 'not-yet-valid', validIn: nbf - now, expiresIn: exp && exp - now }
  if (exp === undefined) return { state: 'no-expiry' }
  return exp <= now ? { state: 'expired', expiresIn: exp - now } : { state: 'valid', expiresIn: exp - now }
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
  ['second', 1],
]

/** "in 3 hours", "2 days ago". */
export function formatRelative(seconds: number, locale?: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const abs = Math.abs(seconds)
  const [unit, size] = UNITS.find(([, s]) => abs >= s) ?? ['second', 1]
  return rtf.format(Math.round(seconds / size), unit)
}

// ── Signature verification ─────────────────────────────────────────

type HashName = 'SHA-256' | 'SHA-384' | 'SHA-512'

interface AlgSpec {
  kind: 'hmac' | 'rsa' | 'pss' | 'ec'
  hash: HashName
  curve?: 'P-256' | 'P-384' | 'P-521'
  saltLength?: number
}

const ALGS: Record<string, AlgSpec> = {
  HS256: { kind: 'hmac', hash: 'SHA-256' },
  HS384: { kind: 'hmac', hash: 'SHA-384' },
  HS512: { kind: 'hmac', hash: 'SHA-512' },
  RS256: { kind: 'rsa', hash: 'SHA-256' },
  RS384: { kind: 'rsa', hash: 'SHA-384' },
  RS512: { kind: 'rsa', hash: 'SHA-512' },
  PS256: { kind: 'pss', hash: 'SHA-256', saltLength: 32 },
  PS384: { kind: 'pss', hash: 'SHA-384', saltLength: 48 },
  PS512: { kind: 'pss', hash: 'SHA-512', saltLength: 64 },
  ES256: { kind: 'ec', hash: 'SHA-256', curve: 'P-256' },
  ES384: { kind: 'ec', hash: 'SHA-384', curve: 'P-384' },
  ES512: { kind: 'ec', hash: 'SHA-512', curve: 'P-521' },
}

export const SUPPORTED_ALGS = Object.keys(ALGS)

export function keyKindFor(alg: unknown): 'secret' | 'public-key' | 'unsupported' {
  const spec = typeof alg === 'string' ? ALGS[alg] : undefined
  if (!spec) return 'unsupported'
  return spec.kind === 'hmac' ? 'secret' : 'public-key'
}

function pemToDer(pem: string): Uint8Array {
  const match = pem.match(/-----BEGIN ([A-Z ]+)-----([\s\S]+?)-----END \1-----/)
  if (!match) throw new Error('Paste a PEM public key (-----BEGIN PUBLIC KEY-----) or a JWK')
  if (match[1] !== 'PUBLIC KEY') {
    throw new Error(`Expected a “PUBLIC KEY” (SPKI) PEM, got “${match[1]}”`)
  }
  return base64ToBytes(match[2])
}

const toBuffer = (bytes: Uint8Array) => bytes.slice().buffer as ArrayBuffer

async function importVerifyKey(spec: AlgSpec, key: string, secretEncoding: 'utf8' | 'base64'): Promise<CryptoKey> {
  const subtle = globalThis.crypto.subtle
  if (spec.kind === 'hmac') {
    const raw = secretEncoding === 'base64' ? base64ToBytes(key) : new TextEncoder().encode(key)
    if (raw.length === 0) throw new Error('Enter the secret')
    return subtle.importKey('raw', toBuffer(raw), { name: 'HMAC', hash: spec.hash }, false, ['verify'])
  }
  const params =
    spec.kind === 'ec'
      ? { name: 'ECDSA', namedCurve: spec.curve! }
      : { name: spec.kind === 'pss' ? 'RSA-PSS' : 'RSASSA-PKCS1-v1_5', hash: spec.hash }
  const trimmed = key.trim()
  if (trimmed.startsWith('{')) {
    let jwk: JsonWebKey
    try {
      jwk = JSON.parse(trimmed) as JsonWebKey
    } catch {
      throw new Error('The JWK is not valid JSON')
    }
    return subtle.importKey('jwk', jwk, params, false, ['verify'])
  }
  return subtle.importKey('spki', toBuffer(pemToDer(trimmed)), params, false, ['verify'])
}

/**
 * Verifies the token's signature locally. Resolves true/false; rejects with a
 * readable Error when the algorithm is unsupported or the key can't be used.
 */
export async function verifyJwtSignature(
  jwt: DecodedJwt,
  key: string,
  { secretEncoding = 'utf8' }: { secretEncoding?: 'utf8' | 'base64' } = {},
): Promise<boolean> {
  const alg = jwt.header.alg
  if (alg === 'none') throw new Error('alg “none” means the token is unsigned. Never accept it.')
  const spec = typeof alg === 'string' ? ALGS[alg] : undefined
  if (!spec) throw new Error(`Algorithm “${String(alg)}” is not supported (supported: ${SUPPORTED_ALGS.join(', ')})`)

  let cryptoKey: CryptoKey
  try {
    cryptoKey = await importVerifyKey(spec, key, secretEncoding)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(/^(Enter|Paste|Expected|The JWK)/.test(msg) ? msg : `This key can't be used with ${alg}: ${msg}`)
  }

  let signature: Uint8Array
  try {
    signature = base64ToBytes(jwt.signature)
  } catch {
    return false
  }
  const algorithm =
    spec.kind === 'hmac'
      ? { name: 'HMAC' }
      : spec.kind === 'rsa'
        ? { name: 'RSASSA-PKCS1-v1_5' }
        : spec.kind === 'pss'
          ? { name: 'RSA-PSS', saltLength: spec.saltLength! }
          : { name: 'ECDSA', hash: spec.hash }
  return globalThis.crypto.subtle.verify(
    algorithm,
    cryptoKey,
    toBuffer(signature),
    toBuffer(new TextEncoder().encode(jwt.signingInput)),
  )
}
