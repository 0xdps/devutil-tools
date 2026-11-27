/**
 * Cryptographically secure random generators and UUID helpers.
 * All randomness comes from crypto.getRandomValues, with rejection sampling
 * so every value is equally likely (no modulo bias).
 */
import { v1, v4, v5, v7, parse as parseUuid, validate as validateUuid, version as uuidVersion } from 'uuid'

// ── Secure integers ─────────────────────────────────────────────────

/** Uniform integer in [0, n). n must be ≤ 2^32. */
export function randomBelow(n: number): number {
  if (!Number.isInteger(n) || n < 1 || n > 2 ** 32) throw new RangeError('n must be an integer in 1…2^32')
  const limit = Math.floor(2 ** 32 / n) * n
  const buf = new Uint32Array(1)
  for (;;) {
    globalThis.crypto.getRandomValues(buf)
    if (buf[0] < limit) return buf[0] % n
  }
}

/** Uniform integer in [min, max] (inclusive). */
export function randomInt(min: number, max: number): number {
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max)) throw new Error('Min and max must be whole numbers')
  if (min > max) throw new Error('Min must not be greater than max')
  const span = max - min + 1
  if (span > 2 ** 32) throw new Error('Range is too large (max 4,294,967,296 values)')
  return min + randomBelow(span)
}

export function randomInts(min: number, max: number, count: number, unique: boolean): number[] {
  if (unique && count > max - min + 1) throw new Error(`Only ${max - min + 1} unique values exist between ${min} and ${max}`)
  if (!unique) return Array.from({ length: count }, () => randomInt(min, max))
  const seen = new Set<number>()
  while (seen.size < count) seen.add(randomInt(min, max))
  return [...seen]
}

export function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes)
  globalThis.crypto.getRandomValues(buf)
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ── Passwords / strings ─────────────────────────────────────────────

export const CHARSETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>?/~',
} as const

export type CharsetName = keyof typeof CHARSETS
const AMBIGUOUS = /[Il1O0o|`'"]/g

export interface PasswordOptions {
  length: number
  sets: CharsetName[]
  excludeAmbiguous?: boolean
}

/** Random string that contains at least one character from each chosen set. */
export function generatePassword({ length, sets, excludeAmbiguous = false }: PasswordOptions): string {
  if (sets.length === 0) throw new Error('Choose at least one character set')
  const pools = sets.map((s) => (excludeAmbiguous ? CHARSETS[s].replace(AMBIGUOUS, '') : CHARSETS[s]))
  if (length < pools.length) throw new Error(`Length must be at least ${pools.length} to include every chosen set`)
  const all = pools.join('')
  const chars = pools.map((p) => p[randomBelow(p.length)])
  while (chars.length < length) chars.push(all[randomBelow(all.length)])
  // Fisher–Yates so the guaranteed characters aren't always first.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomBelow(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

/** Bits of entropy of a uniformly random string from the given options. */
export function passwordEntropy({ length, sets, excludeAmbiguous = false }: PasswordOptions): number {
  const size = sets.reduce((n, s) => n + (excludeAmbiguous ? CHARSETS[s].replace(AMBIGUOUS, '') : CHARSETS[s]).length, 0)
  return size ? Math.floor(length * Math.log2(size)) : 0
}

// ── UUIDs ───────────────────────────────────────────────────────────

export type UuidVersion = 'v4' | 'v7' | 'v1' | 'v5'

export const UUID_NAMESPACES = {
  DNS: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  URL: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
  OID: '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
  X500: '6ba7b814-9dad-11d1-80b4-00c04fd430c8',
} as const

export interface UuidFormat {
  uppercase?: boolean
  hyphens?: boolean
  braces?: boolean
}

export function formatUuid(id: string, { uppercase = false, hyphens = true, braces = false }: UuidFormat): string {
  let out = hyphens ? id : id.replace(/-/g, '')
  if (uppercase) out = out.toUpperCase()
  return braces ? `{${out}}` : out
}

export function generateUuids(versionName: UuidVersion, count: number, named?: { namespace: string; name: string }): string[] {
  if (versionName === 'v5') {
    if (!named || !validateUuid(named.namespace)) throw new Error('The namespace must be a valid UUID')
    // v5 is deterministic: the same namespace + name always gives the same UUID.
    return [v5(named.name, named.namespace)]
  }
  const gen: () => string = versionName === 'v7' ? () => v7() : versionName === 'v1' ? () => v1() : () => v4()
  return Array.from({ length: count }, () => gen())
}

export interface UuidInfo {
  version: number
  variant: string
  /** Embedded creation time for v1, v6 and v7. */
  timestamp?: Date
  isNil: boolean
  isMax: boolean
}

/** Validates and describes a UUID (accepts braces, uppercase, no hyphens, urn:uuid:). */
export function inspectUuid(input: string): UuidInfo {
  let s = input.trim().replace(/^urn:uuid:/i, '').replace(/^\{|\}$/g, '').toLowerCase()
  if (/^[0-9a-f]{32}$/.test(s)) s = `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`
  const isNil = s === '00000000-0000-0000-0000-000000000000'
  const isMax = s === 'ffffffff-ffff-ffff-ffff-ffffffffffff'
  if (!isNil && !isMax && !validateUuid(s)) throw new Error('Not a valid UUID')
  const bytes = parseUuid(s)
  const version = isNil || isMax ? 0 : uuidVersion(s)
  const v = bytes[8] >> 4
  const variant = v < 8 ? 'NCS (reserved)' : v < 12 ? 'RFC 9562' : v < 14 ? 'Microsoft (reserved)' : 'Future (reserved)'

  let timestamp: Date | undefined
  const hex = s.replace(/-/g, '')
  if (version === 7) {
    timestamp = new Date(parseInt(hex.slice(0, 12), 16))
  } else if (version === 1 || version === 6) {
    // 60-bit count of 100ns intervals since 1582-10-15
    const ts =
      version === 1
        ? BigInt(`0x${hex.slice(13, 16)}${hex.slice(8, 12)}${hex.slice(0, 8)}`)
        : BigInt(`0x${hex.slice(0, 12)}${hex.slice(13, 16)}`)
    timestamp = new Date(Number((ts - 122_192_928_000_000_000n) / 10_000n))
  }
  return { version, variant, timestamp, isNil, isMax }
}

// ── Lorem ipsum ─────────────────────────────────────────────────────

const LOREM_WORDS =
  'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum'.split(
    ' ',
  )

const word = () => LOREM_WORDS[randomBelow(LOREM_WORDS.length)]
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function sentence(): string {
  const n = 6 + randomBelow(9)
  const words = Array.from({ length: n }, word)
  if (n > 9) words[3 + randomBelow(n - 6)] += ','
  return `${capitalize(words.join(' '))}.`
}

function paragraph(): string {
  return Array.from({ length: 4 + randomBelow(4) }, sentence).join(' ')
}

export type LoremUnit = 'paragraphs' | 'sentences' | 'words'

export function lorem(unit: LoremUnit, count: number, startWithLorem = true): string {
  let out: string
  if (unit === 'words') out = Array.from({ length: count }, word).join(' ')
  else if (unit === 'sentences') out = Array.from({ length: count }, sentence).join(' ')
  else out = Array.from({ length: count }, paragraph).join('\n\n')
  if (startWithLorem && out) {
    const classic = 'Lorem ipsum dolor sit amet'
    if (unit === 'words') {
      const words = out.split(' ')
      out = [...classic.split(' ').slice(0, count), ...words.slice(5)].slice(0, count).join(' ')
    } else {
      out = `${classic}, ${out.charAt(0).toLowerCase()}${out.slice(1)}`
    }
  }
  return out
}
