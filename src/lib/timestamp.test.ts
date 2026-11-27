import { describe, expect, it } from 'vitest'
import { detectUnit, formatAll, isoWeek, parseTimeInput } from './timestamp'
import { nextRuns, parseCron } from './cron'

describe('parseTimeInput', () => {
  const iso = '2023-11-14T22:13:20.000Z'
  it.each([
    ['1700000000', 's'],
    ['1700000000000', 'ms'],
    ['1700000000000000', 'us'],
    ['1700000000000000000', 'ns'],
    ['1_700_000_000', 's'],
  ])('auto-detects %s as %s', (input, unit) => {
    const { date, source } = parseTimeInput(input)
    expect(source).toBe(unit)
    expect(date.toISOString()).toBe(iso)
  })

  it('respects an explicit unit and fractional seconds', () => {
    expect(parseTimeInput('1700000000', 'ms').date.toISOString()).toBe('1970-01-20T16:13:20.000Z')
    expect(parseTimeInput('1700000000.5').date.getUTCMilliseconds()).toBe(500)
  })

  it('handles negative epochs and date strings', () => {
    expect(parseTimeInput('-86400').date.toISOString()).toBe('1969-12-31T00:00:00.000Z')
    expect(parseTimeInput('2024-03-15T10:30:00Z')).toMatchObject({ source: 'date' })
  })

  it('explains bad input', () => {
    expect(() => parseTimeInput('')).toThrow(/Enter/)
    expect(() => parseTimeInput('next tuesday-ish')).toThrow(/Not a recognised/)
  })

  it('detectUnit boundaries', () => {
    expect(detectUnit(10)).toBe('s')
    expect(detectUnit(13)).toBe('ms')
  })
})

describe('formats', () => {
  it('ISO week handles year boundaries', () => {
    expect(isoWeek(new Date(2021, 0, 3))).toEqual({ year: 2020, week: 53 })
    expect(isoWeek(new Date(2024, 11, 30))).toEqual({ year: 2025, week: 1 })
  })
  it('includes the core representations', () => {
    const ids = formatAll(new Date(0)).map((f) => f.id)
    expect(ids).toEqual(expect.arrayContaining(['unix-s', 'unix-ms', 'iso-utc', 'rfc2822', 'local']))
  })
})

describe('cron', () => {
  const from = new Date(2024, 0, 31, 10, 7) // Wed 31 Jan 2024 10:07 local
  const fmt = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`

  it('steps and ranges', () => {
    expect(nextRuns(parseCron('*/15 9-17 * * *'), from, 3).map(fmt)).toEqual(['2024-1-31 10:15', '2024-1-31 10:30', '2024-1-31 10:45'])
  })

  it('names, macros and weekday 7 = Sunday', () => {
    expect(parseCron('@daily').expression).toBe('0 0 * * *')
    expect([...parseCron('0 0 * * 7').daysOfWeek]).toEqual([0])
    expect(nextRuns(parseCron('30 8 * FEB mon-fri'), from, 2).map(fmt)).toEqual(['2024-2-1 8:30', '2024-2-2 8:30'])
  })

  it('day-of-month OR day-of-week when both are set', () => {
    // 1st of the month OR any Friday
    expect(nextRuns(parseCron('0 12 1 * 5'), from, 3).map(fmt)).toEqual(['2024-2-1 12:00', '2024-2-2 12:00', '2024-2-9 12:00'])
  })

  it('leap day and impossible dates', () => {
    expect(nextRuns(parseCron('0 0 29 2 *'), from, 2).map(fmt)).toEqual(['2024-2-29 0:00', '2028-2-29 0:00'])
    expect(nextRuns(parseCron('0 0 30 2 *'), from)).toEqual([])
  })

  it('explains errors', () => {
    expect(() => parseCron('0 0 * *')).toThrow(/Expected 5 fields/)
    expect(() => parseCron('0 0 0 * * *')).toThrow(/Seconds-based/)
    expect(() => parseCron('60 * * * *')).toThrow(/Minute: 60 is outside 0–59/)
    expect(() => parseCron('* * * * FOO')).toThrow(/Day of week/)
    expect(() => parseCron('*/0 * * * *')).toThrow(/step/)
  })
})
