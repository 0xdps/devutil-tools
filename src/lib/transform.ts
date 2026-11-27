/** Conversion between JSON, CSV, YAML, TOML and XML. Pure (no DOM). */
import * as yaml from 'js-yaml'
import Papa from 'papaparse'
import { parse as parseToml, stringify as stringifyToml } from 'smol-toml'
import { XMLBuilder, XMLParser } from 'fast-xml-parser'

export type DataFormat = 'json' | 'csv' | 'yaml' | 'toml' | 'xml'

export const DATA_FORMATS: { value: DataFormat; label: string }[] = [
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'csv', label: 'CSV' },
  { value: 'toml', label: 'TOML' },
  { value: 'xml', label: 'XML' },
]

export interface ConvertResult {
  output: string
  /** Lossy conversions are reported, not silently applied. */
  warnings: string[]
}

const XML_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
}

const isPlainObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

// ── Parse ───────────────────────────────────────────────────────────

export function parseData(format: DataFormat, text: string): unknown {
  switch (format) {
    case 'json':
      return JSON.parse(text)
    case 'yaml':
      return yaml.load(text)
    case 'toml':
      return parseToml(text)
    case 'csv': {
      const result = Papa.parse<Record<string, unknown>>(text.trim(), { header: true, dynamicTyping: true, skipEmptyLines: 'greedy' })
      const fatal = result.errors.find((e) => e.type !== 'FieldMismatch')
      if (fatal) throw new Error(`Row ${(fatal.row ?? 0) + 2}: ${fatal.message}`)
      return result.data
    }
    case 'xml': {
      const data = new XMLParser({ ...XML_OPTIONS, parseAttributeValue: true, parseTagValue: true, trimValues: true }).parse(text, true)
      if (isPlainObject(data)) delete data['?xml']
      return data
    }
  }
}

// ── Stringify ───────────────────────────────────────────────────────

/** Flattens nested objects to dot-path columns; arrays become JSON strings. */
export function flattenRow(value: unknown, prefix = '', out: Record<string, unknown> = {}): Record<string, unknown> {
  if (isPlainObject(value)) {
    const entries = Object.entries(value)
    if (entries.length === 0 && prefix) out[prefix] = '{}'
    for (const [k, v] of entries) flattenRow(v, prefix ? `${prefix}.${k}` : k, out)
  } else if (Array.isArray(value)) {
    out[prefix] = JSON.stringify(value)
  } else {
    out[prefix || 'value'] = value
  }
  return out
}

/** Removes null/undefined (TOML has no null). Returns the dropped paths. */
function stripNulls(value: unknown, path: string, dropped: string[]): unknown {
  if (Array.isArray(value)) return value.filter((v, i) => (v == null ? (dropped.push(`${path}[${i}]`), false) : true)).map((v, i) => stripNulls(v, `${path}[${i}]`, dropped))
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      const p = path ? `${path}.${k}` : k
      if (v == null) dropped.push(p)
      else out[k] = stripNulls(v, p, dropped)
    }
    return out
  }
  return value
}

export function stringifyData(format: DataFormat, data: unknown, indent = 2): ConvertResult {
  const warnings: string[] = []
  switch (format) {
    case 'json':
      return { output: JSON.stringify(data, null, indent) ?? 'null', warnings }
    case 'yaml':
      return { output: yaml.dump(data, { indent, lineWidth: -1, noRefs: true, sortKeys: false }), warnings }
    case 'csv': {
      const rows = Array.isArray(data) ? data : [data]
      if (rows.some((r) => isPlainObject(r) && Object.values(r).some((v) => typeof v === 'object' && v !== null))) {
        warnings.push('Nested objects were flattened to dot-separated columns (e.g. address.city); arrays are written as JSON.')
      }
      const flat = rows.map((r) => flattenRow(r))
      const columns = [...new Set(flat.flatMap((r) => Object.keys(r)))]
      return { output: Papa.unparse(flat, { columns }), warnings }
    }
    case 'toml': {
      let root = data
      if (Array.isArray(root)) {
        root = { items: root }
        warnings.push('TOML needs a table at the top level, so the array was wrapped as [[items]].')
      } else if (!isPlainObject(root)) {
        throw new Error('TOML can only represent a table (object) at the top level')
      }
      const dropped: string[] = []
      root = stripNulls(root, '', dropped)
      if (dropped.length) warnings.push(`TOML has no null, so ${dropped.length} field${dropped.length > 1 ? 's were' : ' was'} dropped: ${dropped.slice(0, 5).join(', ')}${dropped.length > 5 ? '…' : ''}`)
      return { output: stringifyToml(root as Record<string, unknown>), warnings }
    }
    case 'xml': {
      // A single-key object becomes the document root; anything else is wrapped in <root>.
      const single = isPlainObject(data) && Object.keys(data).length === 1 && !Array.isArray(Object.values(data)[0])
      const doc = single ? data : { root: Array.isArray(data) ? { item: data } : data }
      if (!single) warnings.push('XML needs a single root element, so the data was wrapped in <root>.')
      const xml = new XMLBuilder({ ...XML_OPTIONS, format: true, indentBy: ' '.repeat(indent), suppressEmptyNode: true }).build(doc) as string
      return { output: `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`.trimEnd(), warnings }
    }
  }
}

export function convertData(from: DataFormat, to: DataFormat, text: string, indent = 2): ConvertResult {
  return stringifyData(to, parseData(from, text), indent)
}

// Lives in its own module so smart paste can use it without pulling in the parsers.
export { detectFormat } from './detect-format'
