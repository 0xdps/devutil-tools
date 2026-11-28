/** URL parsing and query-string editing. Pure; uses the WHATWG URL API. */

export type QueryParam = { key: string; value: string }

export interface ParsedUrl {
  url: URL
  /** Decoded query parameters in order; duplicate keys are kept. */
  params: QueryParam[]
  /** True when no scheme was given and https:// was assumed. */
  assumedScheme: boolean
}

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i

export function parseUrl(input: string): ParsedUrl {
  const raw = input.trim()
  if (!raw) throw new Error('Enter a URL')
  let assumedScheme = false
  let candidate = raw
  // "example.com/path" or "localhost:3000" → assume https
  if (!HAS_SCHEME.test(raw) || /^[^/:]+:\d+(\/|$)/.test(raw)) {
    if (raw.startsWith('/')) throw new Error('This is a relative path. Include the scheme and host (https://example.com/…)')
    candidate = `https://${raw}`
    assumedScheme = true
  }
  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    throw new Error('Not a valid URL')
  }
  return { url, params: [...url.searchParams].map(([key, value]) => ({ key, value })), assumedScheme }
}

/** Returns `url` with its query string replaced by `params` (empty keys dropped). */
export function withParams(url: URL, params: QueryParam[]): string {
  const next = new URL(url.href)
  const search = new URLSearchParams()
  for (const { key, value } of params) if (key) search.append(key, value)
  next.search = search.toString()
  return next.href
}

export interface UrlPart {
  id: string
  label: string
  value: string
}

/** The URL's components, for display. Empty optional parts are omitted. */
export function urlParts(url: URL): UrlPart[] {
  const parts: UrlPart[] = [
    { id: 'protocol', label: 'Protocol', value: url.protocol.replace(/:$/, '') },
    { id: 'username', label: 'Username', value: decodeSafe(url.username) },
    { id: 'password', label: 'Password', value: decodeSafe(url.password) },
    { id: 'hostname', label: 'Host', value: url.hostname },
    { id: 'port', label: 'Port', value: url.port || defaultPort(url.protocol) },
    { id: 'pathname', label: 'Path', value: decodeSafe(url.pathname) },
    { id: 'search', label: 'Query', value: url.search },
    { id: 'hash', label: 'Fragment', value: decodeSafe(url.hash) },
    { id: 'origin', label: 'Origin', value: url.origin === 'null' ? '' : url.origin },
  ]
  return parts.filter((p) => p.value !== '')
}

function defaultPort(protocol: string): string {
  const ports: Record<string, string> = { 'http:': '80 (default)', 'https:': '443 (default)', 'ws:': '80 (default)', 'wss:': '443 (default)', 'ftp:': '21 (default)' }
  return ports[protocol] ?? ''
}

function decodeSafe(s: string): string {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}
