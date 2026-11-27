/** Time zone math on top of Intl (handles DST and fractional offsets). Pure. */

export interface ZoneCity {
  zone: string
  city: string
  country: string
}

/** Friendly names for common zones; any other IANA zone is still supported. */
export const CITIES: ZoneCity[] = [
  { zone: 'UTC', city: 'UTC', country: 'Coordinated Universal Time' },
  { zone: 'America/Los_Angeles', city: 'San Francisco / Los Angeles', country: 'United States' },
  { zone: 'America/Denver', city: 'Denver', country: 'United States' },
  { zone: 'America/Phoenix', city: 'Phoenix', country: 'United States' },
  { zone: 'America/Chicago', city: 'Chicago', country: 'United States' },
  { zone: 'America/New_York', city: 'New York', country: 'United States' },
  { zone: 'America/Anchorage', city: 'Anchorage', country: 'United States' },
  { zone: 'Pacific/Honolulu', city: 'Honolulu', country: 'United States' },
  { zone: 'America/Toronto', city: 'Toronto', country: 'Canada' },
  { zone: 'America/Vancouver', city: 'Vancouver', country: 'Canada' },
  { zone: 'America/Halifax', city: 'Halifax', country: 'Canada' },
  { zone: 'America/Mexico_City', city: 'Mexico City', country: 'Mexico' },
  { zone: 'America/Bogota', city: 'Bogotá', country: 'Colombia' },
  { zone: 'America/Lima', city: 'Lima', country: 'Peru' },
  { zone: 'America/Santiago', city: 'Santiago', country: 'Chile' },
  { zone: 'America/Sao_Paulo', city: 'São Paulo', country: 'Brazil' },
  { zone: 'America/Argentina/Buenos_Aires', city: 'Buenos Aires', country: 'Argentina' },
  { zone: 'Atlantic/Reykjavik', city: 'Reykjavík', country: 'Iceland' },
  { zone: 'Europe/London', city: 'London', country: 'United Kingdom' },
  { zone: 'Europe/Dublin', city: 'Dublin', country: 'Ireland' },
  { zone: 'Europe/Lisbon', city: 'Lisbon', country: 'Portugal' },
  { zone: 'Europe/Paris', city: 'Paris', country: 'France' },
  { zone: 'Europe/Berlin', city: 'Berlin', country: 'Germany' },
  { zone: 'Europe/Amsterdam', city: 'Amsterdam', country: 'Netherlands' },
  { zone: 'Europe/Madrid', city: 'Madrid', country: 'Spain' },
  { zone: 'Europe/Rome', city: 'Rome', country: 'Italy' },
  { zone: 'Europe/Zurich', city: 'Zurich', country: 'Switzerland' },
  { zone: 'Europe/Stockholm', city: 'Stockholm', country: 'Sweden' },
  { zone: 'Europe/Warsaw', city: 'Warsaw', country: 'Poland' },
  { zone: 'Europe/Athens', city: 'Athens', country: 'Greece' },
  { zone: 'Europe/Helsinki', city: 'Helsinki', country: 'Finland' },
  { zone: 'Europe/Kyiv', city: 'Kyiv', country: 'Ukraine' },
  { zone: 'Europe/Istanbul', city: 'Istanbul', country: 'Türkiye' },
  { zone: 'Europe/Moscow', city: 'Moscow', country: 'Russia' },
  { zone: 'Africa/Casablanca', city: 'Casablanca', country: 'Morocco' },
  { zone: 'Africa/Lagos', city: 'Lagos', country: 'Nigeria' },
  { zone: 'Africa/Cairo', city: 'Cairo', country: 'Egypt' },
  { zone: 'Africa/Johannesburg', city: 'Johannesburg', country: 'South Africa' },
  { zone: 'Africa/Nairobi', city: 'Nairobi', country: 'Kenya' },
  { zone: 'Asia/Dubai', city: 'Dubai', country: 'United Arab Emirates' },
  { zone: 'Asia/Riyadh', city: 'Riyadh', country: 'Saudi Arabia' },
  { zone: 'Asia/Tehran', city: 'Tehran', country: 'Iran' },
  { zone: 'Asia/Karachi', city: 'Karachi', country: 'Pakistan' },
  { zone: 'Asia/Kolkata', city: 'Mumbai / Delhi / Bengaluru', country: 'India' },
  { zone: 'Asia/Kathmandu', city: 'Kathmandu', country: 'Nepal' },
  { zone: 'Asia/Dhaka', city: 'Dhaka', country: 'Bangladesh' },
  { zone: 'Asia/Bangkok', city: 'Bangkok', country: 'Thailand' },
  { zone: 'Asia/Jakarta', city: 'Jakarta', country: 'Indonesia' },
  { zone: 'Asia/Singapore', city: 'Singapore', country: 'Singapore' },
  { zone: 'Asia/Kuala_Lumpur', city: 'Kuala Lumpur', country: 'Malaysia' },
  { zone: 'Asia/Manila', city: 'Manila', country: 'Philippines' },
  { zone: 'Asia/Hong_Kong', city: 'Hong Kong', country: 'Hong Kong' },
  { zone: 'Asia/Shanghai', city: 'Beijing / Shanghai', country: 'China' },
  { zone: 'Asia/Taipei', city: 'Taipei', country: 'Taiwan' },
  { zone: 'Asia/Seoul', city: 'Seoul', country: 'South Korea' },
  { zone: 'Asia/Tokyo', city: 'Tokyo', country: 'Japan' },
  { zone: 'Australia/Perth', city: 'Perth', country: 'Australia' },
  { zone: 'Australia/Adelaide', city: 'Adelaide', country: 'Australia' },
  { zone: 'Australia/Brisbane', city: 'Brisbane', country: 'Australia' },
  { zone: 'Australia/Sydney', city: 'Sydney / Melbourne', country: 'Australia' },
  { zone: 'Pacific/Auckland', city: 'Auckland', country: 'New Zealand' },
]

const byZone = new Map(CITIES.map((c) => [c.zone, c]))

export function isValidZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone })
    return true
  } catch {
    return false
  }
}

/** Every IANA zone the runtime knows, with friendly names where we have them. */
export function allZones(): ZoneCity[] {
  const supported: string[] =
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : CITIES.map((c) => c.zone)
  const seen = new Set<string>()
  const out: ZoneCity[] = []
  for (const c of CITIES) {
    seen.add(c.zone)
    out.push(c)
  }
  for (const zone of supported) if (!seen.has(zone)) out.push(describeZone(zone))
  return out
}

export function describeZone(zone: string): ZoneCity {
  const known = byZone.get(zone)
  if (known) return known
  const parts = zone.split('/')
  return { zone, city: parts[parts.length - 1].replace(/_/g, ' '), country: parts[0] }
}

export interface ZonedParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  weekday: number // 0 = Sunday
}

const partsFormatters = new Map<string, Intl.DateTimeFormat>()

export function zonedParts(zone: string, date: Date): ZonedParts {
  let fmt = partsFormatters.get(zone)
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'short',
    })
    partsFormatters.set(zone, fmt)
  }
  const get = (type: string) => fmt!.formatToParts(date).find((p) => p.type === type)?.value ?? ''
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')),
  }
}

/** Minutes east of UTC at `date` (e.g. +330 for India, −240 for New York in summer). */
export function offsetMinutes(zone: string, date: Date): number {
  const p = zonedParts(zone, date)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute)
  return Math.round((asUtc - Math.floor(date.getTime() / 60_000) * 60_000) / 60_000)
}

export function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? '−' : '+'
  const abs = Math.abs(minutes)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`
}

/** "+5h 30m", "−8h", "same time". */
export function formatDifference(minutes: number): string {
  if (minutes === 0) return 'same time'
  const sign = minutes < 0 ? '−' : '+'
  const abs = Math.abs(minutes)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `${sign}${h ? `${h}h` : ''}${h && m ? ' ' : ''}${m ? `${m}m` : ''}`
}

/** The UTC instant at which the wall clock in `zone` shows the given local time. */
export function zonedTimeToUtc(zone: string, year: number, month: number, day: number, hour: number, minute: number): Date {
  const naive = Date.UTC(year, month - 1, day, hour, minute)
  // Two passes settle DST boundaries (the offset can differ either side of the guess).
  let guess = new Date(naive - offsetMinutes(zone, new Date(naive)) * 60_000)
  guess = new Date(naive - offsetMinutes(zone, guess) * 60_000)
  return guess
}

/** Short zone name like "PST", "CEST", or "GMT+5:30" when there's no abbreviation. */
export function zoneAbbreviation(zone: string, date: Date): string {
  const part = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'short' }).formatToParts(date).find((p) => p.type === 'timeZoneName')
  return part?.value ?? ''
}

export type HourKind = 'night' | 'early' | 'work' | 'evening'

/** Classifies a local hour for the meeting planner. */
export function hourKind(hour: number): HourKind {
  if (hour >= 9 && hour < 18) return 'work'
  if (hour >= 7 && hour < 9) return 'early'
  if (hour >= 18 && hour < 22) return 'evening'
  return 'night'
}

/**
 * For the 24 hours of `baseDay` in `baseZone`, returns the hour offsets (0–23)
 * where every zone is inside working hours (9:00–18:00 local).
 */
export function sharedWorkingHours(baseZone: string, baseDay: { year: number; month: number; day: number }, zones: string[]): number[] {
  const hours: number[] = []
  for (let h = 0; h < 24; h++) {
    const instant = zonedTimeToUtc(baseZone, baseDay.year, baseDay.month, baseDay.day, h, 0)
    if (zones.every((z) => hourKind(zonedParts(z, instant).hour) === 'work')) hours.push(h)
  }
  return hours
}
