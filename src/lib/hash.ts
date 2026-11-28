/**
 * Message digests and HMAC. SHA-* use WebCrypto; MD5 (not in WebCrypto) is
 * implemented here for checksum use. Pure; works in browsers and Node 20+.
 */
import { base64ToBytes, bytesToBase64 } from './encoding'

export type HashAlgorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'
export type HmacAlgorithm = Exclude<HashAlgorithm, 'MD5'>

export const HASH_ALGORITHMS: HashAlgorithm[] = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']
export const HMAC_ALGORITHMS: HmacAlgorithm[] = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']

/** Algorithms that must not be relied on for security. */
export const WEAK_ALGORITHMS = new Set<HashAlgorithm>(['MD5', 'SHA-1'])

const toBuffer = (bytes: Uint8Array) => bytes.slice().buffer as ArrayBuffer

// ── MD5 (RFC 1321) ──────────────────────────────────────────────────

const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21]
const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0)

export function md5(input: Uint8Array): Uint8Array {
  const bitLength = input.length * 8
  const paddedLength = (((input.length + 8) >> 6) + 1) << 6
  const buffer = new Uint8Array(paddedLength)
  buffer.set(input)
  buffer[input.length] = 0x80
  const view = new DataView(buffer.buffer)
  view.setUint32(paddedLength - 8, bitLength >>> 0, true)
  view.setUint32(paddedLength - 4, Math.floor(bitLength / 2 ** 32), true)

  let a0 = 0x67452301
  let b0 = 0xefcdab89
  let c0 = 0x98badcfe
  let d0 = 0x10325476
  const M = new Uint32Array(16)

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i++) M[i] = view.getUint32(offset + i * 4, true)
    let A = a0
    let B = b0
    let C = c0
    let D = d0
    for (let i = 0; i < 64; i++) {
      let F: number
      let g: number
      if (i < 16) {
        F = (B & C) | (~B & D)
        g = i
      } else if (i < 32) {
        F = (D & B) | (~D & C)
        g = (5 * i + 1) % 16
      } else if (i < 48) {
        F = B ^ C ^ D
        g = (3 * i + 5) % 16
      } else {
        F = C ^ (B | ~D)
        g = (7 * i) % 16
      }
      F = (F + A + K[i] + M[g]) >>> 0
      A = D
      D = C
      C = B
      B = (B + ((F << S[i]) | (F >>> (32 - S[i])))) >>> 0
    }
    a0 = (a0 + A) >>> 0
    b0 = (b0 + B) >>> 0
    c0 = (c0 + C) >>> 0
    d0 = (d0 + D) >>> 0
  }

  const out = new Uint8Array(16)
  const outView = new DataView(out.buffer)
  ;[a0, b0, c0, d0].forEach((word, i) => outView.setUint32(i * 4, word, true))
  return out
}

// ── Digest / HMAC ───────────────────────────────────────────────────

export async function digest(algorithm: HashAlgorithm, data: Uint8Array): Promise<Uint8Array> {
  if (algorithm === 'MD5') return md5(data)
  return new Uint8Array(await globalThis.crypto.subtle.digest(algorithm, toBuffer(data)))
}

export async function hmac(algorithm: HmacAlgorithm, key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const subtle = globalThis.crypto.subtle
  // Zero-length HMAC keys are valid per RFC 2104 but rejected by WebCrypto; pad to one zero byte (equivalent).
  const cryptoKey = await subtle.importKey('raw', toBuffer(key.length ? key : new Uint8Array(1)), { name: 'HMAC', hash: algorithm }, false, ['sign'])
  return new Uint8Array(await subtle.sign('HMAC', cryptoKey, toBuffer(data)))
}

// ── Formatting & comparison ─────────────────────────────────────────

export type DigestFormat = 'hex' | 'HEX' | 'base64'

export function toHex(bytes: Uint8Array): string {
  let out = ''
  for (const b of bytes) out += b.toString(16).padStart(2, '0')
  return out
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s+/g, '').replace(/^0x/i, '')
  if (!/^(?:[0-9a-f]{2})*$/i.test(clean)) throw new Error('Not valid hex')
  return new Uint8Array(clean.match(/../g)?.map((h) => parseInt(h, 16)) ?? [])
}

export function formatDigest(bytes: Uint8Array, format: DigestFormat): string {
  if (format === 'base64') return bytesToBase64(bytes)
  const hex = toHex(bytes)
  return format === 'HEX' ? hex.toUpperCase() : hex
}

/** Byte lengths of MD5, SHA-1, SHA-256, SHA-384, SHA-512. */
const DIGEST_LENGTHS = new Set([16, 20, 32, 48, 64])

/** Parses a pasted checksum (hex in any case, or Base64). Returns null unless
 *  it decodes to a plausible digest length. */
export function parseExpectedDigest(input: string): Uint8Array | null {
  const clean = input.trim().split(/\s+/)[0] ?? '' // tolerate "<hash>  filename" lines
  if (!clean) return null
  const candidates: (() => Uint8Array)[] = []
  if (/^(0x)?[0-9a-f]+$/i.test(clean)) candidates.push(() => hexToBytes(clean))
  candidates.push(() => base64ToBytes(clean))
  for (const decode of candidates) {
    try {
      const bytes = decode()
      if (DIGEST_LENGTHS.has(bytes.length)) return bytes
    } catch {
      /* try the next encoding */
    }
  }
  return null
}

/** Constant-time-ish equality (fine for UI; avoids early exit). */
export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}
