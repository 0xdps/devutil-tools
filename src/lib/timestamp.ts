/** Timestamp parsing and formatting. Pure; depends only on Date and Intl. */

export type EpochUnit = 's' | 'ms' | 'us' | 'ns'

export const UNIT_LABELS: Record<EpochUnit, string> = {
  s: 'seconds',
  ms: 'milliseconds',
  us: 'microseconds',
  ns: 'nanoseconds',
}

const UNIT_TO_MS: Record<EpochUnit, number> = { s: 1000, ms: 1, us: 1e-3, ns: 1e-6 }

export interface ParsedTime {
  date: Date
  /** How the input was read: an epoch unit, or "date" for a date string. */
  source: EpochUnit | 'date'
}

/** Guess the epoch unit from the integer digit count (works for years 1973–5138). */
export function detectUnit(digits: number): EpochUnit {
  if (digits <= 11) return 's'
  if (digits <= 14) return 'ms'
  if (digits <= 17) return 'us'
  return 'ns'
}

/**
 * Parses an epoch number (auto-detecting its unit unless `unit` is given) or a
 * date string (ISO 8601, RFC 2822, …). Throws a readable Error otherwise.
 */
export function parseTimeInput(input: string, unit: EpochUnit | 'auto' = 'auto'): ParsedTime {
  const raw = input.trim().replace(/[_,\s](?=\d)/g, '')
  if (!raw) throw new Error('Enter a timestamp or a date')

  if (/^[-+]?\d+(\.\d+)?$/.test(raw)) {
    const integerDigits = raw.replace(/^[-+]/, '').split('.')[0].replace(/^0+(?=\d)/, '').length
    const resolved = unit === 'auto' ? detectUnit(integerDigits) : unit
    const ms = Number(raw) * UNIT_TO_MS[resolved]
    const date = new Date(ms)
    if (!Number.isFinite(ms) || Number.isNaN(date.getTime())) throw new Error('That timestamp is out of range')
    return { date, source: resolved }
  }

  const date = new Date(input.trim())
  if (Number.isNaN(date.getTime())) {
    throw new Error('Not a recognised timestamp or date. Try 1700000000, 2024-03-15T10:30:00Z or “Mar 15 2024 10:30”.')
  }
  return { date, source: 'date' }
}

/** ISO 8601 week number and ISO week-year. */
export function isoWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1)
  return { year: d.getUTCFullYear(), week: Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7) }
}

function pad(n: number, len = 2) {
  return String(Math.abs(n)).padStart(len, '0')
}

/** ISO 8601 in local time with numeric offset, e.g. 2024-03-15T16:00:00.000+05:30 */
export function toLocalIso(date: Date): string {
  const offset = -date.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}` +
    `${sign}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`
  )
}

export interface TimeFormat {
  id: string
  label: string
  value: string
}

export function formatAll(date: Date, locale?: string): TimeFormat[] {
  const ms = date.getTime()
  const week = isoWeek(date)
  const local = new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'long' }).format(date)
  const utc = new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'long', timeZone: 'UTC' }).format(date)
  return [
    { id: 'unix-s', label: 'Unix seconds', value: String(Math.floor(ms / 1000)) },
    { id: 'unix-ms', label: 'Unix milliseconds', value: String(ms) },
    { id: 'iso-utc', label: 'ISO 8601 (UTC)', value: date.toISOString() },
    { id: 'iso-local', label: 'ISO 8601 (local)', value: toLocalIso(date) },
    { id: 'rfc2822', label: 'RFC 2822 / HTTP', value: date.toUTCString() },
    { id: 'local', label: 'Local time', value: local },
    { id: 'utc', label: 'UTC', value: utc },
    { id: 'week', label: 'ISO week', value: `${week.year}-W${pad(week.week)}, day ${date.getDay() || 7} of 7` },
  ]
}
