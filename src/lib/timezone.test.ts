import { describe, expect, it } from 'vitest'
import {
  CITIES,
  allZones,
  describeZone,
  formatDifference,
  formatOffset,
  isValidZone,
  offsetMinutes,
  sharedWorkingHours,
  zonedParts,
  zonedTimeToUtc,
} from './timezone'

describe('zones', () => {
  it('every curated zone is a real IANA zone (Asia/Beijing is not)', () => {
    for (const c of CITIES) expect(isValidZone(c.zone), c.zone).toBe(true)
    expect(isValidZone('Asia/Beijing')).toBe(false)
  })
  it('lists all runtime zones with friendly names first', () => {
    const zones = allZones()
    expect(zones[0].zone).toBe('UTC')
    expect(zones.some((z) => z.zone === 'America/Indiana/Knox')).toBe(true)
    expect(describeZone('America/Indiana/Knox')).toEqual({ zone: 'America/Indiana/Knox', city: 'Knox', country: 'America' })
  })
})

describe('offsets', () => {
  const winter = new Date('2024-01-15T12:00:00Z')
  const summer = new Date('2024-07-15T12:00:00Z')
  it('handles DST and fractional offsets', () => {
    expect(offsetMinutes('America/New_York', winter)).toBe(-300)
    expect(offsetMinutes('America/New_York', summer)).toBe(-240)
    expect(offsetMinutes('Asia/Kolkata', winter)).toBe(330)
    expect(offsetMinutes('Asia/Kathmandu', winter)).toBe(345)
    expect(offsetMinutes('Australia/Sydney', winter)).toBe(660) // southern summer
    expect(offsetMinutes('UTC', summer)).toBe(0)
  })
  it('formats', () => {
    expect(formatOffset(330)).toBe('UTC+5:30')
    expect(formatOffset(-300)).toBe('UTC−5')
    expect(formatDifference(-570)).toBe('−9h 30m')
    expect(formatDifference(45)).toBe('+45m')
    expect(formatDifference(0)).toBe('same time')
  })
})

describe('zonedTimeToUtc', () => {
  it('converts wall-clock time to an instant', () => {
    expect(zonedTimeToUtc('Asia/Kolkata', 2024, 3, 15, 9, 30).toISOString()).toBe('2024-03-15T04:00:00.000Z')
    expect(zonedTimeToUtc('America/Los_Angeles', 2024, 7, 1, 9, 0).toISOString()).toBe('2024-07-01T16:00:00.000Z')
  })
  it('is stable across DST transitions', () => {
    // US spring-forward 2024-03-10: 01:30 EST exists, 03:30 EDT exists
    expect(zonedTimeToUtc('America/New_York', 2024, 3, 10, 1, 30).toISOString()).toBe('2024-03-10T06:30:00.000Z')
    expect(zonedTimeToUtc('America/New_York', 2024, 3, 10, 3, 30).toISOString()).toBe('2024-03-10T07:30:00.000Z')
    const p = zonedParts('Europe/London', zonedTimeToUtc('Europe/London', 2024, 10, 27, 12, 0))
    expect([p.hour, p.minute]).toEqual([12, 0])
  })
})

describe('sharedWorkingHours', () => {
  it('finds the London/New York overlap', () => {
    // On a summer day in London, 14:00–17:00 London = 09:00–12:00 New York
    expect(sharedWorkingHours('Europe/London', { year: 2024, month: 7, day: 10 }, ['Europe/London', 'America/New_York'])).toEqual([14, 15, 16, 17])
  })
  it('is empty when there is no overlap', () => {
    expect(sharedWorkingHours('UTC', { year: 2024, month: 7, day: 10 }, ['America/Los_Angeles', 'Asia/Tokyo', 'Europe/Berlin'])).toEqual([])
  })
})
