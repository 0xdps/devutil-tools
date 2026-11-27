/**
 * Text encoders/decoders. Pure and portable (browser + Node): no DOM access,
 * so they can move into the shared core package unchanged.
 */

export type EncodingScheme = 'base64' | 'base64url' | 'url' | 'html' | 'base32' | 'base58' | 'datauri'

const utf8Encoder = new TextEncoder()
const utf8Decoder = new TextDecoder('utf-8', { fatal: true })

function decodeUtf8(bytes: Uint8Array): string {
  try {
    return utf8Decoder.decode(bytes)
  } catch {
    throw new Error('Decoded bytes are not valid UTF-8 text')
  }
}

// ── Base64 ──────────────────────────────────────────────────────────

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

export function bytesToBase64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0)
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63]
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63] : '='
    out += i + 2 < bytes.length ? B64[n & 63] : '='
  }
  return out
}

export function base64ToBytes(input: string): Uint8Array {
  const clean = input.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '')
  if (!/^[A-Za-z0-9+/]*$/.test(clean)) throw new Error('Invalid Base64: unexpected character')
  if (clean.length % 4 === 1) throw new Error('Invalid Base64: wrong length')
  const bytes: number[] = []
  let buffer = 0
  let bits = 0
  for (const ch of clean) {
    buffer = (buffer << 6) | B64.indexOf(ch)
    bits += 6
    if (bits >= 8) {
      bits -= 8
      bytes.push((buffer >> bits) & 0xff)
    }
  }
  return new Uint8Array(bytes)
}

export const encodeBase64 = (text: string) => bytesToBase64(utf8Encoder.encode(text))
export const decodeBase64 = (text: string) => decodeUtf8(base64ToBytes(text))

export const encodeBase64Url = (text: string) =>
  encodeBase64(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
export const decodeBase64Url = decodeBase64 // base64ToBytes accepts both alphabets

// ── URL ─────────────────────────────────────────────────────────────

export const encodeURL = (text: string) => encodeURIComponent(text)
export function decodeURL(text: string): string {
  try {
    return decodeURIComponent(text.replace(/\+/g, ' '))
  } catch {
    throw new Error('Invalid URL encoding: malformed % sequence')
  }
}

// ── HTML entities ───────────────────────────────────────────────────

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  copy: '©', reg: '®', trade: '™', hellip: '…', mdash: '—', ndash: '–',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»',
  euro: '€', pound: '£', yen: '¥', cent: '¢', sect: '§', deg: '°',
  plusmn: '±', times: '×', divide: '÷', middot: '·', bull: '•', para: '¶',
}

export function encodeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function decodeHTML(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10)
      return Number.isFinite(code) && code <= 0x10ffff ? String.fromCodePoint(code) : match
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match
  })
}

// ── Base32 (RFC 4648) ───────────────────────────────────────────────

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function encodeBase32(text: string): string {
  const bytes = utf8Encoder.encode(text)
  let out = ''
  let buffer = 0
  let bits = 0
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte
    bits += 8
    while (bits >= 5) {
      bits -= 5
      out += B32[(buffer >> bits) & 31]
    }
  }
  if (bits > 0) out += B32[(buffer << (5 - bits)) & 31]
  while (out.length % 8 !== 0) out += '='
  return out
}

export function decodeBase32(text: string): string {
  const clean = text.replace(/\s+/g, '').replace(/=+$/, '').toUpperCase()
  const bytes: number[] = []
  let buffer = 0
  let bits = 0
  for (const ch of clean) {
    const idx = B32.indexOf(ch)
    if (idx === -1) throw new Error(`Invalid Base32 character “${ch}”`)
    buffer = (buffer << 5) | idx
    bits += 5
    if (bits >= 8) {
      bits -= 8
      bytes.push((buffer >> bits) & 0xff)
    }
  }
  return decodeUtf8(new Uint8Array(bytes))
}

// ── Base58 (Bitcoin alphabet) ───────────────────────────────────────

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

export function encodeBase58(text: string): string {
  const bytes = utf8Encoder.encode(text)
  if (bytes.length === 0) return ''
  let num = 0n
  for (const byte of bytes) num = num * 256n + BigInt(byte)
  let out = ''
  while (num > 0n) {
    out = B58[Number(num % 58n)] + out
    num /= 58n
  }
  for (const byte of bytes) {
    if (byte !== 0) break
    out = '1' + out
  }
  return out
}

export function decodeBase58(text: string): string {
  const clean = text.trim()
  let num = 0n
  for (const ch of clean) {
    const idx = B58.indexOf(ch)
    if (idx === -1) throw new Error(`Invalid Base58 character “${ch}”`)
    num = num * 58n + BigInt(idx)
  }
  const bytes: number[] = []
  while (num > 0n) {
    bytes.unshift(Number(num % 256n))
    num /= 256n
  }
  for (const ch of clean) {
    if (ch !== '1') break
    bytes.unshift(0)
  }
  return decodeUtf8(new Uint8Array(bytes))
}

// ── Data URI ────────────────────────────────────────────────────────

export const encodeDataURI = (text: string) => `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`

export function decodeDataURI(text: string): string {
  const match = text.trim().match(/^data:([^,]*?),(.*)$/s)
  if (!match) throw new Error('Invalid Data URI: expected “data:[<type>][;base64],<data>”')
  const [, meta, data] = match
  return /;base64$/i.test(meta) ? decodeBase64(data) : decodeURL(data)
}

// ── Dispatch ────────────────────────────────────────────────────────

const codecs: Record<EncodingScheme, { encode: (s: string) => string; decode: (s: string) => string }> = {
  base64: { encode: encodeBase64, decode: decodeBase64 },
  base64url: { encode: encodeBase64Url, decode: decodeBase64Url },
  url: { encode: encodeURL, decode: decodeURL },
  html: { encode: encodeHTML, decode: decodeHTML },
  base32: { encode: encodeBase32, decode: decodeBase32 },
  base58: { encode: encodeBase58, decode: decodeBase58 },
  datauri: { encode: encodeDataURI, decode: decodeDataURI },
}

export function transform(scheme: EncodingScheme, mode: 'encode' | 'decode', input: string): string {
  return codecs[scheme][mode](input)
}
