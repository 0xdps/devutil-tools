/** Dependency-free format sniffing (kept apart from the heavy parsers in transform.ts). */
import type { DataFormat } from './transform'

/** Best-effort format guess for pasted text. */
export function detectFormat(text: string): DataFormat | null {
  const t = text.trim()
  if (!t) return null
  if (/^[[{]/.test(t)) {
    try {
      JSON.parse(t)
      return 'json'
    } catch {
      /* not JSON */
    }
  }
  if (t.startsWith('<')) return 'xml'
  if (/^\s*\[[\w.-]+\]\s*$/m.test(t) || /^[\w.-]+\s*=\s*.+$/m.test(t.split('\n')[0])) return 'toml'
  if (/^(---|[\w"'-]+\s*:\s|- )/m.test(t)) return 'yaml'
  if (t.split('\n')[0].includes(',')) return 'csv'
  return null
}
