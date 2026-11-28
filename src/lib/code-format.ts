/**
 * Code formatting and minification. JSON is handled natively; other
 * languages use Prettier/Terser, imported on demand so they are only
 * downloaded when that language is actually formatted.
 */
import type { Plugin } from 'prettier'

export type CodeLanguage = 'json' | 'javascript' | 'typescript' | 'css' | 'scss' | 'less' | 'html' | 'markdown' | 'yaml' | 'graphql'

export const CODE_LANGUAGES: { value: CodeLanguage; label: string; minify: boolean }[] = [
  { value: 'json', label: 'JSON', minify: true },
  { value: 'javascript', label: 'JavaScript', minify: true },
  { value: 'typescript', label: 'TypeScript', minify: false },
  { value: 'css', label: 'CSS', minify: true },
  { value: 'scss', label: 'SCSS', minify: false },
  { value: 'less', label: 'Less', minify: false },
  { value: 'html', label: 'HTML', minify: false },
  { value: 'markdown', label: 'Markdown', minify: false },
  { value: 'yaml', label: 'YAML', minify: false },
  { value: 'graphql', label: 'GraphQL', minify: false },
]

export interface FormatOptions {
  /** Spaces per indent; 0 means tabs. */
  indent: number
  sortKeys?: boolean
}

// ── JSON ────────────────────────────────────────────────────────────

/**
 * Finds the offset of the first JSON syntax error. Browsers word (and
 * sometimes omit) positions differently, so we locate it ourselves.
 */
export function findJsonErrorOffset(text: string): number {
  let i = 0
  const ws = () => {
    while (i < text.length && ' \t\n\r'.includes(text[i])) i++
  }
  const fail = (): never => {
    throw i
  }
  const literal = (word: string) => (text.startsWith(word, i) ? (i += word.length) : fail())
  const string = () => {
    i++ // opening quote
    while (i < text.length && text[i] !== '"') {
      if (text.charCodeAt(i) < 0x20) fail()
      if (text[i] === '\\') {
        i++
        if (text[i] === 'u') {
          if (!/^[0-9a-fA-F]{4}$/.test(text.slice(i + 1, i + 5))) fail()
          i += 4
        } else if (!'"\\/bfnrt'.includes(text[i] ?? '')) fail()
      }
      i++
    }
    if (text[i] !== '"') fail()
    i++
  }
  const number = () => {
    const m = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(text.slice(i))
    if (!m) fail()
    i += m![0].length
  }
  const value = (): void => {
    ws()
    const ch = text[i]
    if (ch === '{') {
      i++
      ws()
      if (text[i] === '}') return void i++
      for (;;) {
        ws()
        if (text[i] !== '"') fail()
        string()
        ws()
        if (text[i] !== ':') fail()
        i++
        value()
        ws()
        if (text[i] === ',') i++
        else if (text[i] === '}') return void i++
        else fail()
      }
    } else if (ch === '[') {
      i++
      ws()
      if (text[i] === ']') return void i++
      for (;;) {
        value()
        ws()
        if (text[i] === ',') i++
        else if (text[i] === ']') return void i++
        else fail()
      }
    } else if (ch === '"') string()
    else if (ch === 't') literal('true')
    else if (ch === 'f') literal('false')
    else if (ch === 'n') literal('null')
    else number()
  }
  try {
    value()
    ws()
    if (i < text.length) fail()
    return -1
  } catch (offset) {
    return typeof offset === 'number' ? offset : -1
  }
}

/** "Line X, column Y: …" for a JSON.parse failure. */
export function describeJsonError(text: string, error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  // Drop the engine's position suffix and quoted excerpt; we compute our own.
  const message = raw.replace(/,? ".*" is not valid JSON$/s, '').replace(/\s*(in JSON )?at position \d+.*$/s, '') || 'Invalid JSON'
  const offset = findJsonErrorOffset(text)
  if (offset < 0) return message
  const before = text.slice(0, offset)
  const line = before.split('\n').length
  const column = offset - before.lastIndexOf('\n')
  const found = offset >= text.length ? 'end of input' : `“${text[offset]}”`
  return `Line ${line}, column ${column}: unexpected ${found}`
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value as object)
        .sort((a, b) => a.localeCompare(b))
        .map((k) => [k, sortDeep((value as Record<string, unknown>)[k])]),
    )
  }
  return value
}

export function parseJsonStrict(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch (e) {
    throw new Error(describeJsonError(text, e))
  }
}

export function formatJson(text: string, { indent, sortKeys }: FormatOptions): string {
  const data = parseJsonStrict(text)
  return JSON.stringify(sortKeys ? sortDeep(data) : data, null, indent === 0 ? '\t' : indent)
}

export function minifyJson(text: string, sortKeys = false): string {
  const data = parseJsonStrict(text)
  return JSON.stringify(sortKeys ? sortDeep(data) : data)
}

// ── CSS minify (string- and comment-aware) ──────────────────────────

export function minifyCss(css: string): string {
  let out = ''
  let i = 0
  let boundary = true // just after a comment or at the start: never emit a space
  while (i < css.length) {
    const ch = css[i]
    if (ch === '"' || ch === "'") {
      // copy strings verbatim, honoring escapes
      let j = i + 1
      while (j < css.length && css[j] !== ch) j += css[j] === '\\' ? 2 : 1
      out += css.slice(i, j + 1)
      i = j + 1
      boundary = false
    } else if (ch === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2)
      const comment = css.slice(i, end === -1 ? css.length : end + 2)
      if (comment.startsWith('/*!')) out += comment // keep license comments
      i = end === -1 ? css.length : end + 2
      boundary = true
    } else if (/\s/.test(ch)) {
      while (i < css.length && /\s/.test(css[i])) i++
      const prev = out[out.length - 1]
      const next = css[i]
      if (!boundary && prev && next && !/[{}:;,>~+(]/.test(prev) && !/[{}:;,>~+)!]/.test(next) && !css.startsWith('/*', i)) out += ' '
    } else {
      // "a;}" → "a}" (structural only: strings were copied above)
      if (ch === '}' && out.endsWith(';')) out = out.slice(0, -1)
      out += ch
      i++
      boundary = false
    }
  }
  return out.trim()
}

// ── Prettier / Terser (lazy) ────────────────────────────────────────

const PARSERS: Record<Exclude<CodeLanguage, 'json'>, string> = {
  javascript: 'babel',
  typescript: 'typescript',
  css: 'css',
  scss: 'scss',
  less: 'less',
  html: 'html',
  markdown: 'markdown',
  yaml: 'yaml',
  graphql: 'graphql',
}

async function pluginsFor(language: Exclude<CodeLanguage, 'json'>): Promise<Plugin[]> {
  const load = {
    babel: () => import('prettier/plugins/babel'),
    estree: () => import('prettier/plugins/estree'),
    typescript: () => import('prettier/plugins/typescript'),
    postcss: () => import('prettier/plugins/postcss'),
    html: () => import('prettier/plugins/html'),
    markdown: () => import('prettier/plugins/markdown'),
    yaml: () => import('prettier/plugins/yaml'),
    graphql: () => import('prettier/plugins/graphql'),
  }
  const needs: Record<typeof language, (keyof typeof load)[]> = {
    javascript: ['babel', 'estree'],
    typescript: ['typescript', 'estree'],
    css: ['postcss'],
    scss: ['postcss'],
    less: ['postcss'],
    // HTML formats embedded <script> and <style> too
    html: ['html', 'babel', 'estree', 'postcss'],
    markdown: ['markdown', 'babel', 'estree', 'yaml'],
    yaml: ['yaml'],
    graphql: ['graphql'],
  }
  const modules = await Promise.all(needs[language].map((name) => load[name]()))
  return modules.map((m) => ('default' in m ? (m.default as Plugin) : (m as unknown as Plugin)))
}

/** Strips Prettier's code frame so errors read as one line. */
function cleanPrettierError(e: unknown): Error {
  const message = e instanceof Error ? e.message : String(e)
  return new Error(message.split('\n')[0].replace(/\s*\(\d+:\d+\)$/, (m) => m))
}

export async function formatCode(language: CodeLanguage, code: string, options: FormatOptions): Promise<string> {
  if (language === 'json') return formatJson(code, options)
  const [{ format }, plugins] = await Promise.all([import('prettier/standalone'), pluginsFor(language)])
  try {
    return await format(code, {
      parser: PARSERS[language],
      plugins,
      tabWidth: options.indent || 2,
      useTabs: options.indent === 0,
      printWidth: 100,
    })
  } catch (e) {
    throw cleanPrettierError(e)
  }
}

export async function minifyCode(language: CodeLanguage, code: string, options: Pick<FormatOptions, 'sortKeys'> = {}): Promise<string> {
  switch (language) {
    case 'json':
      return minifyJson(code, options.sortKeys)
    case 'css':
      return minifyCss(code)
    case 'javascript': {
      const { minify } = await import('terser')
      const result = await minify(code, { module: true, compress: true, mangle: true, format: { comments: /^!/ } })
      return result.code ?? ''
    }
    default:
      throw new Error(`Minifying ${language} isn't supported`)
  }
}

// ── JSONPath ────────────────────────────────────────────────────────

export interface JsonPathMatch {
  path: string
  value: unknown
}

export async function queryJsonPath(data: unknown, path: string): Promise<JsonPathMatch[]> {
  const { JSONPath } = await import('jsonpath-plus')
  const results = JSONPath({ path, json: data as object, resultType: 'all', wrap: true, eval: 'safe' }) as { path: string; value: unknown }[]
  return results.map((r) => ({ path: r.path, value: r.value }))
}
