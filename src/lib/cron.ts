/**
 * Standard 5-field cron (minute hour day-of-month month day-of-week):
 * parsing and next-run calculation. Supports *, lists, ranges, steps,
 * month/day names, 7 = Sunday, and the @hourly/@daily… macros.
 * Day-of-month and day-of-week follow Vixie cron: when both are restricted,
 * a day matches if EITHER matches.
 */

export interface CronField {
  name: string
  min: number
  max: number
  names?: string[]
}

export const CRON_FIELDS: CronField[] = [
  { name: 'Minute', min: 0, max: 59 },
  { name: 'Hour', min: 0, max: 23 },
  { name: 'Day of month', min: 1, max: 31 },
  { name: 'Month', min: 1, max: 12, names: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] },
  { name: 'Day of week', min: 0, max: 7, names: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] },
]

export const CRON_MACROS: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
}

export interface ParsedCron {
  /** Expanded 5-field expression (macros resolved). */
  expression: string
  fields: string[]
  minutes: Set<number>
  hours: Set<number>
  daysOfMonth: Set<number>
  months: Set<number>
  daysOfWeek: Set<number>
  domRestricted: boolean
  dowRestricted: boolean
}

function parseValue(token: string, field: CronField): number {
  const upper = token.toUpperCase()
  const named = field.names?.indexOf(upper) ?? -1
  if (named >= 0) return named + (field.name === 'Month' ? 1 : 0)
  if (!/^\d+$/.test(token)) throw new Error(`${field.name}: “${token}” is not a number${field.names ? ' or name' : ''}`)
  const n = Number(token)
  if (n < field.min || n > field.max) throw new Error(`${field.name}: ${n} is outside ${field.min}–${field.max}`)
  return n
}

function parseField(source: string, field: CronField): Set<number> {
  const values = new Set<number>()
  for (const part of source.split(',')) {
    if (!part) throw new Error(`${field.name}: empty list item`)
    const [range, stepText] = part.split('/')
    const step = stepText === undefined ? 1 : Number(stepText)
    if (!Number.isInteger(step) || step < 1) throw new Error(`${field.name}: step “${stepText}” must be a positive integer`)
    let start: number
    let end: number
    if (range === '*') {
      start = field.min
      end = field.name === 'Day of week' ? 6 : field.max
    } else if (range.includes('-')) {
      const [a, b] = range.split('-')
      start = parseValue(a, field)
      end = parseValue(b, field)
      if (start > end) throw new Error(`${field.name}: range ${range} goes backwards`)
    } else {
      start = parseValue(range, field)
      end = stepText === undefined ? start : field.max
    }
    for (let v = start; v <= end; v += step) values.add(field.name === 'Day of week' && v === 7 ? 0 : v)
  }
  return values
}

export function parseCron(input: string): ParsedCron {
  const trimmed = input.trim()
  const expression = CRON_MACROS[trimmed.toLowerCase()] ?? trimmed
  if (trimmed.toLowerCase() === '@reboot') throw new Error('@reboot runs at startup and has no schedule')
  const fields = expression.split(/\s+/)
  if (fields.length !== 5) {
    throw new Error(
      fields.length === 6
        ? 'Expected 5 fields; this has 6. Seconds-based (Quartz/Spring) cron is not supported here.'
        : `Expected 5 fields (minute hour day month weekday); got ${fields.length}`,
    )
  }
  const [mi, h, dom, mo, dow] = fields.map((f, i) => parseField(f, CRON_FIELDS[i]))
  return {
    expression,
    fields,
    minutes: mi,
    hours: h,
    daysOfMonth: dom,
    months: mo,
    daysOfWeek: dow,
    domRestricted: fields[2] !== '*',
    dowRestricted: fields[4] !== '*',
  }
}

function dayMatches(cron: ParsedCron, d: Date): boolean {
  const dom = cron.daysOfMonth.has(d.getDate())
  const dow = cron.daysOfWeek.has(d.getDay())
  if (cron.domRestricted && cron.dowRestricted) return dom || dow
  if (cron.domRestricted) return dom
  if (cron.dowRestricted) return dow
  return true
}

/** The next `count` run times strictly after `from`, in local time. */
export function nextRuns(cron: ParsedCron, from: Date, count = 5): Date[] {
  const runs: Date[] = []
  const d = new Date(from.getTime())
  d.setSeconds(0, 0)
  d.setMinutes(d.getMinutes() + 1)
  const limit = from.getTime() + 5 * 366 * 86_400_000 // impossible schedules (e.g. Feb 30) stop here

  while (runs.length < count && d.getTime() <= limit) {
    if (!cron.months.has(d.getMonth() + 1)) {
      d.setMonth(d.getMonth() + 1, 1)
      d.setHours(0, 0)
    } else if (!dayMatches(cron, d)) {
      d.setDate(d.getDate() + 1)
      d.setHours(0, 0)
    } else if (!cron.hours.has(d.getHours())) {
      d.setHours(d.getHours() + 1, 0)
    } else if (!cron.minutes.has(d.getMinutes())) {
      d.setMinutes(d.getMinutes() + 1)
    } else {
      runs.push(new Date(d.getTime()))
      d.setMinutes(d.getMinutes() + 1)
    }
  }
  return runs
}
