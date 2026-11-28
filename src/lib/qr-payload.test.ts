import { describe, expect, it } from 'vitest'
import { emailPayload, phonePayload, vcardPayload, wifiPayload } from './qr-payload'

describe('wifiPayload', () => {
  it('builds and escapes special characters', () => {
    expect(wifiPayload({ ssid: 'Cafe;Guest', password: 'p@ss:w,rd"\\', security: 'WPA', hidden: false })).toBe(
      'WIFI:T:WPA;S:Cafe\\;Guest;P:p@ss\\:w\\,rd\\"\\\\;;',
    )
  })
  it('supports open and hidden networks', () => {
    expect(wifiPayload({ ssid: 'Open', password: 'ignored', security: 'nopass', hidden: true })).toBe('WIFI:T:nopass;S:Open;H:true;;')
  })
  it('validates', () => {
    expect(() => wifiPayload({ ssid: '', password: '', security: 'WPA', hidden: false })).toThrow(/SSID/)
    expect(() => wifiPayload({ ssid: 'x', password: '', security: 'WPA', hidden: false })).toThrow(/password/)
  })
})

describe('email / phone', () => {
  it('encodes subject and body with %20', () => {
    expect(emailPayload({ to: 'ada@example.com', subject: 'Hi there', body: 'A & B' })).toBe('mailto:ada@example.com?subject=Hi%20there&body=A%20%26%20B')
    expect(emailPayload({ to: 'a@b.c', subject: '', body: '' })).toBe('mailto:a@b.c')
  })
  it('normalizes phone numbers', () => {
    expect(phonePayload({ number: '+1 (555) 010-9999' })).toBe('tel:+15550109999')
    expect(phonePayload({ number: '555 0100', sms: 'On my way' })).toBe('SMSTO:5550100:On my way')
  })
})

describe('vcardPayload', () => {
  it('escapes commas and semicolons', () => {
    const v = vcardPayload({ firstName: 'Ada', lastName: 'Lovelace', organization: 'Analytical Engines, Ltd; UK', email: 'ada@example.com' })
    expect(v.split('\r\n')).toEqual([
      'BEGIN:VCARD',
      'VERSION:3.0',
      'N:Lovelace;Ada;;;',
      'FN:Ada Lovelace',
      'ORG:Analytical Engines\\, Ltd\\; UK',
      'EMAIL:ada@example.com',
      'END:VCARD',
    ])
  })
})
