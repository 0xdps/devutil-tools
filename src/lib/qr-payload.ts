/** Builds the text payloads that phones understand when scanning a QR code. */

export type WifiSecurity = 'WPA' | 'WEP' | 'nopass'

/** Escapes \ ; , : " as required by the Wi-Fi QR format. */
const escapeWifi = (s: string) => s.replace(/([\\;,:"])/g, '\\$1')

export function wifiPayload({ ssid, password, security, hidden }: { ssid: string; password: string; security: WifiSecurity; hidden: boolean }): string {
  if (!ssid) throw new Error('Enter the network name (SSID)')
  if (security !== 'nopass' && !password) throw new Error('Enter the password, or choose “No password”')
  const parts = [`T:${security}`, `S:${escapeWifi(ssid)}`]
  if (security !== 'nopass') parts.push(`P:${escapeWifi(password)}`)
  if (hidden) parts.push('H:true')
  return `WIFI:${parts.join(';')};;`
}

export function emailPayload({ to, subject, body }: { to: string; subject: string; body: string }): string {
  if (!to) throw new Error('Enter an email address')
  const params = new URLSearchParams()
  if (subject) params.set('subject', subject)
  if (body) params.set('body', body)
  // mailto wants %20 for spaces, not "+"
  const query = params.toString().replace(/\+/g, '%20')
  return `mailto:${to}${query ? `?${query}` : ''}`
}

export function phonePayload({ number, sms }: { number: string; sms?: string }): string {
  const clean = number.replace(/[^\d+*#]/g, '')
  if (!clean) throw new Error('Enter a phone number')
  return sms === undefined ? `tel:${clean}` : `SMSTO:${clean}:${sms}`
}

/** vCard 3.0 escaping: \ , ; and newlines. */
const escapeVcard = (s: string) => s.replace(/([\\,;])/g, '\\$1').replace(/\r?\n/g, '\\n')

export interface ContactFields {
  firstName: string
  lastName: string
  organization?: string
  title?: string
  phone?: string
  email?: string
  website?: string
}

export function vcardPayload(c: ContactFields): string {
  if (!c.firstName && !c.lastName) throw new Error('Enter a name')
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escapeVcard(c.lastName)};${escapeVcard(c.firstName)};;;`,
    `FN:${escapeVcard([c.firstName, c.lastName].filter(Boolean).join(' '))}`,
  ]
  if (c.organization) lines.push(`ORG:${escapeVcard(c.organization)}`)
  if (c.title) lines.push(`TITLE:${escapeVcard(c.title)}`)
  if (c.phone) lines.push(`TEL;TYPE=CELL:${c.phone}`)
  if (c.email) lines.push(`EMAIL:${c.email}`)
  if (c.website) lines.push(`URL:${c.website}`)
  lines.push('END:VCARD')
  return lines.join('\r\n')
}
