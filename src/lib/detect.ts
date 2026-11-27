/**
 * Guesses what pasted text is and which tools can work with it.
 * Pure and fast: called on every keystroke in the palette.
 */
import { detectFormat } from './detect-format'
import { base64ToBytes } from './encoding'

export interface Suggestion {
  toolId: string
  tab?: string
  /** Shown to the user: "Decode JWT". */
  action: string
  /** What we think it is: "JSON Web Token". */
  kind: string
  /** State handed to the tool (same shape as its share state). */
  input: Record<string, unknown>
}

// Hyphenated (or braced/URN) form. Bare 32-hex is more often an MD5, handled below.
const UUID_RE = /^\{?(urn:uuid:)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}?$/i
const JWT_RE = /^(bearer\s+)?eyJ[\w-]+\.eyJ[\w-]+\.[\w-]*$/i
const CRON_FIELD = '(\\*|\\?|[\\d*,/-]+|[A-Za-z]{3}(-[A-Za-z]{3})?)'
const CRON_RE = new RegExp(`^(@(yearly|annually|monthly|weekly|daily|midnight|hourly)|${CRON_FIELD}(\\s+${CRON_FIELD}){4})$`)
const HEX_COLOR_RE = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const COLOR_FN_RE = /^(rgba?|hsla?|hwb|oklch)\(.+\)$/i
const HASH_LENGTHS: Record<number, string> = { 32: 'MD5', 40: 'SHA-1', 64: 'SHA-256', 96: 'SHA-384', 128: 'SHA-512' }

function isPrintableUtf8(bytes: Uint8Array): boolean {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    const printable = text.replace(/[\x00-\x08\x0e-\x1f\x7f]/g, '')
    return text.length > 0 && printable.length / text.length > 0.95
  } catch {
    return false
  }
}

function looksLikeBase64(t: string): boolean {
  if (t.length < 8 || !/^[A-Za-z0-9+/_-]+={0,2}$/.test(t)) return false
  // Plain words and hex digests are valid "base64" too; require some mix.
  if (/^[a-z]+$/i.test(t) || /^[0-9a-f]+$/i.test(t)) return false
  try {
    return isPrintableUtf8(base64ToBytes(t))
  } catch {
    return false
  }
}

export function detectContent(raw: string): Suggestion[] {
  const text = raw.trim()
  if (text.length < 3) return []
  const out: Suggestion[] = []
  const single = !text.includes('\n')

  if (single && JWT_RE.test(text)) {
    out.push({ toolId: 'jwt-decoder', action: 'Decode and verify', kind: 'JSON Web Token', input: { token: text } })
  }
  if (single && UUID_RE.test(text)) {
    out.push({ toolId: 'generators', tab: 'uuid', action: 'Inspect UUID', kind: 'UUID', input: { inspect: text } })
  }
  if (single && /^-?\d{9,19}(\.\d+)?$/.test(text)) {
    const digits = text.replace(/^-/, '').split('.')[0].length
    const seconds = Number(text) / (digits <= 11 ? 1 : digits <= 14 ? 1e3 : digits <= 17 ? 1e6 : 1e9)
    if (seconds > 0 && seconds < 4_102_444_800) {
      out.push({ toolId: 'timestamp-tools', action: 'Convert timestamp', kind: 'Unix timestamp', input: { input: text } })
    }
  }
  if (single && /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/.test(text)) {
    out.push({ toolId: 'timestamp-tools', action: 'Convert date', kind: 'ISO 8601 date', input: { input: text } })
  }
  if (single && CRON_RE.test(text) && !/^\d+$/.test(text.replace(/\s/g, ''))) {
    out.push({ toolId: 'timestamp-tools', tab: 'cron', action: 'Explain schedule', kind: 'Cron expression', input: { expr: text } })
  }
  if (single && (HEX_COLOR_RE.test(text) || COLOR_FN_RE.test(text))) {
    out.push({ toolId: 'color-picker', action: 'Open color', kind: 'Color', input: { color: text } })
  }
  if (single && /^https?:\/\/\S+$/i.test(text)) {
    out.push({ toolId: 'url-tools', action: 'Inspect URL', kind: 'URL', input: { input: text } })
    out.push({ toolId: 'qr-code', action: 'Make a QR code', kind: 'URL', input: { text } })
  }
  if (single && HASH_LENGTHS[text.length] && /^[0-9a-f]+$/i.test(text)) {
    out.push({ toolId: 'hash-verify', action: `Verify a ${HASH_LENGTHS[text.length]} checksum`, kind: `${HASH_LENGTHS[text.length]} hash`, input: { expected: text } })
    if (text.length === 32) out.push({ toolId: 'generators', tab: 'uuid', action: 'Inspect as UUID', kind: 'UUID without hyphens', input: { inspect: text } })
  }

  const format = detectFormat(text)
  if (format === 'json') {
    out.push({ toolId: 'code-json', action: 'Format JSON', kind: 'JSON', input: { language: 'json', input: text } })
    out.push({ toolId: 'code-json', tab: 'jsonpath', action: 'Query with JSONPath', kind: 'JSON', input: { json: text } })
    out.push({ toolId: 'data-transform', action: 'Convert to YAML, CSV…', kind: 'JSON', input: { from: 'json', input: text } })
  } else if (format === 'xml' && /^<(!doctype\s+html|html|head|body|div|p|span|section|main)\b/i.test(text)) {
    out.push({ toolId: 'code-json', action: 'Format HTML', kind: 'HTML', input: { language: 'html', input: text } })
    out.push({ toolId: 'html-playground', action: 'Preview HTML', kind: 'HTML', input: { html: text } })
  } else if (format && !single) {
    const label = format.toUpperCase()
    out.push({ toolId: 'data-transform', action: `Convert ${label} to JSON`, kind: label, input: { from: format, to: 'json', input: text } })
  }

  if (single && !out.length && /%[0-9a-f]{2}/i.test(text)) {
    out.push({ toolId: 'encoding', action: 'URL-decode', kind: 'Percent-encoded text', input: { scheme: 'url', mode: 'decode', input: text } })
  }
  if (single && !out.length && looksLikeBase64(text)) {
    const urlSafe = /[-_]/.test(text)
    out.push({ toolId: 'encoding', action: 'Decode Base64', kind: urlSafe ? 'Base64URL' : 'Base64', input: { scheme: urlSafe ? 'base64url' : 'base64', mode: 'decode', input: text } })
  }
  if (!single && /^#{1,6}\s|\n#{1,6}\s|\n[-*]\s|\[.+\]\(.+\)/.test(text) && !out.length) {
    out.push({ toolId: 'markdown-previewer', action: 'Preview Markdown', kind: 'Markdown', input: { markdown: text } })
  }
  return out
}
