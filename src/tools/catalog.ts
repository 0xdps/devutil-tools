/**
 * The tool catalog: pure data (no React, no icons) so it can be used both by
 * the app and by build tooling (per-route HTML, sitemap). UI bindings (icons,
 * page components) live in registry.ts.
 */
export type CategoryId = 'convert' | 'code' | 'security' | 'web' | 'time' | 'playground'

export interface ToolCategory {
  id: CategoryId
  label: string
}

/** A capability inside a tool (often a tab). Indexed by search so
 *  "uuid" finds the Generators tool even though UUID is one tab of it. */
export interface ToolFeature {
  id: string
  name: string
  keywords?: string[]
  /** Tab that implements this feature; the palette deep-links to it. */
  tab?: string
}

export type ToolStatus = 'stable' | 'beta'

export interface CatalogTool {
  id: string
  name: string
  /** One line, shown in nav tooltips, cards and the palette. */
  description: string
  path: string
  /** Legacy URLs that redirect here (optionally to a specific tab). */
  aliases?: { path: string; tab?: string }[]
  /** Tab ids, in order; the first is the default. Each gets a sub-route
   *  (`/generators/uuid`). Must match the page's TABS constant. */
  tabs?: readonly string[]
  category: CategoryId
  keywords: string[]
  features?: ToolFeature[]
  status?: ToolStatus
  /** Routed but not listed in navigation (unfinished tools). */
  hidden?: boolean
}

export const categories: ToolCategory[] = [
  { id: 'convert', label: 'Convert & Encode' },
  { id: 'code', label: 'Text & Code' },
  { id: 'security', label: 'Security' },
  { id: 'web', label: 'Web & Design' },
  { id: 'time', label: 'Date & Time' },
  { id: 'playground', label: 'Playgrounds' },
]

export const catalog: CatalogTool[] = [
  // ── Convert & Encode ──────────────────────────────────────────────
  {
    id: 'data-transform',
    name: 'Data Transform',
    description: 'Convert between JSON, CSV, YAML, TOML and XML',
    path: '/data-transform',
    category: 'convert',
    keywords: ['json', 'csv', 'yaml', 'toml', 'xml', 'convert', 'converter'],
    features: [
      { id: 'json-csv', name: 'JSON ↔ CSV' },
      { id: 'json-yaml', name: 'JSON ↔ YAML' },
      { id: 'json-xml', name: 'JSON ↔ XML' },
      { id: 'json-toml', name: 'JSON ↔ TOML' },
    ],
  },
  {
    id: 'encoding',
    name: 'Encode / Decode',
    description: 'Base64, Base32, Base58, URL, HTML entities, Data URI',
    path: '/encoding',
    category: 'convert',
    keywords: ['base64', 'base32', 'base58', 'url encode', 'html entities', 'data uri', 'decode'],
    features: [
      { id: 'base64', name: 'Base64' },
      { id: 'base32', name: 'Base32' },
      { id: 'base58', name: 'Base58' },
      { id: 'html', name: 'HTML entities' },
      { id: 'datauri', name: 'Data URI' },
    ],
  },
  {
    id: 'url-tools',
    name: 'URL Tools',
    description: 'Parse URLs, build query strings, encode components',
    path: '/url-tools',
    category: 'convert',
    keywords: ['url', 'query string', 'parse', 'uri', 'params'],
    features: [
      { id: 'parser', name: 'URL parser' },
      { id: 'query', name: 'Query string builder' },
    ],
  },

  // ── Text & Code ───────────────────────────────────────────────────
  {
    id: 'code-json',
    name: 'Code & JSON',
    description: 'Format code with Prettier, minify, query JSON with JSONPath',
    path: '/code-formatter',
    aliases: [{ path: '/json-tools', tab: 'jsonpath' }, { path: '/code-json-tools' }],
    category: 'code',
    keywords: ['format', 'beautify', 'minify', 'prettify', 'prettier', 'json', 'html', 'css', 'scss', 'javascript', 'typescript', 'yaml', 'markdown', 'graphql', 'jsonpath', 'json validator'],
    features: [
      { id: 'formatter', name: 'Code formatter', keywords: ['beautify', 'prettify'], tab: 'format' },
      { id: 'minify', name: 'Minifier', tab: 'format' },
      { id: 'jsonpath', name: 'JSONPath query', keywords: ['json query', 'filter'], tab: 'jsonpath' },
      { id: 'json-validate', name: 'JSON validator', keywords: ['lint', 'syntax error'], tab: 'format' },
    ],
    tabs: ['format', 'jsonpath'],
  },
  {
    id: 'text-utilities',
    name: 'Text Utilities',
    description: 'Change case, count words, clean and sort text',
    path: '/text-utilities',
    category: 'code',
    keywords: ['case', 'camelcase', 'snake_case', 'word count', 'character count', 'sort lines', 'trim'],
    features: [
      { id: 'case', name: 'Case converter', keywords: ['camel', 'snake', 'kebab', 'pascal'], tab: 'case' },
      { id: 'counter', name: 'Word & character counter', tab: 'stats' },
      { id: 'cleaner', name: 'Text cleaner & line sorter', tab: 'lines' },
    ],
    tabs: ['case', 'stats', 'lines'],
  },
  {
    id: 'text-diff',
    name: 'Text Diff',
    description: 'Compare texts or files side by side and export a patch',
    path: '/code-diff',
    category: 'code',
    keywords: ['diff', 'compare', 'difference', 'changes', 'patch', 'merge'],
  },
  {
    id: 'regex-tester',
    name: 'Regex Tester',
    description: 'Test, explain and replace with regular expressions',
    path: '/regex-tester',
    aliases: [{ path: '/regex-playground' }],
    category: 'code',
    keywords: ['regex', 'regexp', 'regular expression', 'pattern', 'match', 'replace', 'playground'],
    features: [
      { id: 'replace', name: 'Regex find & replace', keywords: ['substitute', '$1'], tab: 'replace' },
      { id: 'explain', name: 'Regex explainer', keywords: ['what does this regex mean'] },
      { id: 'library', name: 'Common regex patterns', keywords: ['email regex', 'url regex', 'ip regex'] },
    ],
    tabs: ['match', 'replace'],
  },

  // ── Security ──────────────────────────────────────────────────────
  {
    id: 'jwt-decoder',
    name: 'JWT Decoder',
    description: 'Decode JSON Web Tokens and verify their signatures',
    path: '/jwt-decoder',
    category: 'security',
    keywords: ['jwt', 'token', 'json web token', 'decode', 'claims', 'bearer', 'verify', 'signature', 'hs256', 'rs256'],
    features: [
      { id: 'decode', name: 'Decode JWT claims' },
      { id: 'verify', name: 'Verify JWT signature', keywords: ['hmac', 'rsa', 'ecdsa', 'public key', 'secret'] },
    ],
  },
  {
    id: 'hash-verify',
    name: 'Hash & Verify',
    description: 'Hash text or files, verify checksums, HMAC, password strength',
    path: '/hash-verify',
    category: 'security',
    keywords: ['hash', 'md5', 'sha1', 'sha256', 'sha384', 'sha512', 'hmac', 'checksum', 'password strength', 'file hash'],
    features: [
      { id: 'hash', name: 'Hash generator', keywords: ['md5', 'sha256'], tab: 'hash' },
      { id: 'checksum', name: 'Verify a file checksum', keywords: ['sha256sum', 'iso', 'download', 'integrity'], tab: 'hash' },
      { id: 'hmac', name: 'HMAC', tab: 'hmac' },
      { id: 'password', name: 'Password strength', tab: 'password' },
    ],
    tabs: ['hash', 'hmac', 'password'],
  },
  {
    id: 'generators',
    name: 'Generators',
    description: 'UUIDs (v4, v7, v5), passwords, random numbers, Lorem Ipsum',
    path: '/generators',
    category: 'security',
    keywords: ['uuid', 'guid', 'random', 'password', 'lorem ipsum', 'generate'],
    features: [
      { id: 'uuid', name: 'UUID generator', keywords: ['guid', 'v4', 'v7', 'v1', 'v5'], tab: 'uuid' },
      { id: 'uuid-inspect', name: 'UUID validator & inspector', keywords: ['validate', 'version', 'timestamp'], tab: 'uuid' },
      { id: 'password', name: 'Password generator', keywords: ['secure', 'random string'], tab: 'password' },
      { id: 'random', name: 'Random numbers & hex', keywords: ['api key', 'secret', 'dice'], tab: 'random' },
      { id: 'lorem', name: 'Lorem Ipsum', tab: 'lorem' },
    ],
    tabs: ['uuid', 'password', 'random', 'lorem'],
  },

  // ── Web & Design ──────────────────────────────────────────────────
  {
    id: 'color-picker',
    name: 'Color Picker',
    description: 'Convert colors, check WCAG contrast, generate shades',
    path: '/color-picker',
    category: 'web',
    keywords: ['color', 'colour', 'hex', 'rgb', 'hsl', 'oklch', 'cmyk', 'picker', 'contrast', 'wcag', 'palette', 'shades'],
    features: [
      { id: 'contrast', name: 'Color contrast checker (WCAG)', keywords: ['accessibility', 'a11y', 'aa', 'aaa'] },
      { id: 'palette', name: 'Tints & shades palette', keywords: ['scale', 'tailwind'] },
    ],
  },
  {
    id: 'qr-code',
    name: 'QR Code',
    description: 'QR codes for links, Wi-Fi, email, phone and contacts',
    path: '/qr-code',
    category: 'web',
    keywords: ['qr', 'qrcode', 'barcode', 'wifi qr', 'vcard'],
    features: [
      { id: 'wifi', name: 'Wi-Fi QR code', keywords: ['wireless', 'password', 'guest network'], tab: 'wifi' },
      { id: 'contact', name: 'Contact card QR (vCard)', keywords: ['business card'], tab: 'contact' },
    ],
    tabs: ['text', 'wifi', 'email', 'phone', 'contact'],
  },
  {
    id: 'seo-generator',
    name: 'SEO Generator',
    description: 'Meta & social tags with previews, robots.txt, sitemap, JSON-LD',
    path: '/seo-generator',
    category: 'web',
    keywords: ['seo', 'meta tags', 'open graph', 'twitter card', 'robots.txt', 'sitemap', 'schema'],
    features: [
      { id: 'meta', name: 'Meta & Open Graph tags', tab: 'meta' },
      { id: 'robots', name: 'robots.txt generator', keywords: ['block ai crawlers', 'gptbot'], tab: 'robots' },
      { id: 'sitemap', name: 'sitemap.xml', tab: 'sitemap' },
      { id: 'canonical', name: 'Canonical URL', tab: 'meta' },
      { id: 'schema', name: 'Schema.org JSON-LD', tab: 'schema' },
    ],
    tabs: ['meta', 'robots', 'sitemap', 'schema'],
  },

  // ── Date & Time ───────────────────────────────────────────────────
  {
    id: 'timestamp-tools',
    name: 'Timestamp & Cron',
    description: 'Convert Unix timestamps, explain cron expressions',
    path: '/timestamp-tools',
    category: 'time',
    keywords: ['unix', 'epoch', 'timestamp', 'date', 'cron', 'crontab'],
    features: [
      { id: 'unix', name: 'Unix timestamp converter', keywords: ['epoch'], tab: 'unix' },
      { id: 'cron', name: 'Cron expression explainer', keywords: ['crontab', 'schedule', 'next run'], tab: 'cron' },
    ],
    tabs: ['unix', 'cron'],
  },
  {
    id: 'timezone-compare',
    name: 'Timezone Compare',
    description: 'World clock and meeting planner across time zones',
    path: '/timezone-compare',
    category: 'time',
    keywords: ['timezone', 'time zone', 'utc', 'world clock', 'meeting planner', 'dst', 'gmt', 'convert time'],
  },

  // ── Playgrounds ───────────────────────────────────────────────────
  {
    id: 'markdown-previewer',
    name: 'Markdown Preview',
    description: 'Write GitHub-flavored Markdown with a live preview',
    path: '/markdown-previewer',
    category: 'playground',
    keywords: ['markdown', 'md', 'preview', 'readme'],
  },
  {
    id: 'html-playground',
    name: 'HTML Playground',
    description: 'Edit HTML, CSS and JS with a live, sandboxed preview',
    path: '/html-playground',
    category: 'playground',
    keywords: ['html', 'css', 'javascript', 'playground', 'sandbox', 'preview'],
  },
  {
    id: 'js-runner',
    name: 'JavaScript Runner',
    description: 'Run JavaScript in an isolated sandbox with a console',
    path: '/js-runner',
    category: 'playground',
    keywords: ['javascript', 'js', 'run', 'console', 'repl'],
  },
]

// ── SEO ─────────────────────────────────────────────────────────────
// Titles ≤ 60 characters, descriptions ≤ 160 (enforced by catalog.test.ts).

export interface SeoText {
  title: string
  description: string
}

const BRAND = ' | DevUtil'

const TOOL_SEO: Record<string, SeoText & { tabs?: Record<string, SeoText> }> = {
  'data-transform': {
    title: 'JSON, YAML, CSV, XML & TOML Converter',
    description: 'Convert between JSON, YAML, CSV, XML and TOML instantly. Handles nested data, warns about lossy conversions and runs entirely in your browser.',
  },
  encoding: {
    title: 'Base64, URL & HTML Encode / Decode Online',
    description: 'Encode and decode Base64, Base64URL, URL, HTML entities, Base32, Base58 and data URIs as you type. Free, private and runs in your browser.',
  },
  'url-tools': {
    title: 'URL Parser & Query String Editor',
    description: 'Break any URL into its parts and edit query parameters in a table; the URL rebuilds as you type. Free and private, right in your browser.',
  },
  'code-json': {
    title: 'Code Formatter & JSON Validator',
    description: 'Format and validate JSON, JavaScript, TypeScript, CSS, HTML, YAML and more with Prettier, and minify JS, CSS and JSON. Runs locally in your browser.',
    tabs: {
      jsonpath: {
        title: 'JSONPath Tester: Query JSON Online',
        description: 'Test JSONPath expressions with wildcards, recursive descent and filters against your JSON, and see every match with its path. Runs in your browser.',
      },
    },
  },
  'text-utilities': {
    title: 'Case Converter: camelCase, snake_case & More',
    description: 'Convert text to camelCase, snake_case, kebab-case, PascalCase and eight more styles at once. Understands acronyms like HTTPServer. Runs locally.',
    tabs: {
      stats: {
        title: 'Word & Character Counter',
        description: 'Count characters, words, sentences, paragraphs, lines and UTF-8 bytes, with reading and speaking time. Emoji count as one character.',
      },
      lines: {
        title: 'Sort, Dedupe & Clean Lines Online',
        description: 'Trim lines, remove empty and duplicate lines, and sort text alphabetically, naturally or by length, with a live preview. Runs in your browser.',
      },
    },
  },
  'text-diff': {
    title: 'Text Diff: Compare Text & Files Online',
    description: 'Compare two texts or files side by side or unified, with word-level highlights, change navigation and .diff patch export. Private, in your browser.',
  },
  'regex-tester': {
    title: 'Regex Tester & Explainer (JavaScript)',
    description: 'Test JavaScript regular expressions with live highlighting, capture groups, find-and-replace and a plain-English explanation of the pattern.',
    tabs: {
      replace: {
        title: 'Regex Find & Replace Tester',
        description: 'Preview regex replacements using $1 and named groups ($<name>) on your own text, with matches highlighted. JavaScript syntax, in your browser.',
      },
    },
  },
  'jwt-decoder': {
    title: 'JWT Decoder & Signature Verifier',
    description: 'Decode JSON Web Tokens, read claims and expiry, and verify HS256, RS256, PS256 and ES256 signatures locally. Your token never leaves the browser.',
  },
  'hash-verify': {
    title: 'Hash Generator & Checksum Verifier',
    description: 'Hash text or files with MD5, SHA-1, SHA-256, SHA-384 and SHA-512, and verify downloads against a published checksum. Files never leave your device.',
    tabs: {
      hmac: {
        title: 'HMAC Generator: SHA-256, SHA-512',
        description: 'Generate HMAC-SHA1, SHA-256, SHA-384 and SHA-512 signatures with a text, hex or Base64 key, for webhooks and API signing. Runs locally.',
      },
      password: {
        title: 'Password Strength Checker',
        description: 'See how guessable a password is: detects common passwords, keyboard patterns, sequences and dates, with estimated crack times. Checked locally.',
      },
    },
  },
  generators: {
    title: 'UUID Generator: v4, v7, v5 & Inspector',
    description: 'Generate UUID v4, v7, v1 and v5 in bulk, format them, and inspect any UUID’s version and embedded timestamp. Cryptographically secure.',
    tabs: {
      password: {
        title: 'Secure Password Generator',
        description: 'Generate strong random passwords with your choice of length and characters, using the Web Crypto API without bias. Shows the exact entropy.',
      },
      random: {
        title: 'Random Number & Hex String Generator',
        description: 'Generate cryptographically secure random integers in any range, optionally unique, and hex strings for API keys and secrets.',
      },
      lorem: {
        title: 'Lorem Ipsum Generator',
        description: 'Generate Lorem Ipsum placeholder text by paragraphs, sentences or words, optionally starting with the classic opening. Copy in one click.',
      },
    },
  },
  'color-picker': {
    title: 'Color Converter & WCAG Contrast Checker',
    description: 'Convert colors between HEX, RGB, HSL, OKLCH, HSV and CMYK, check WCAG AA/AAA contrast, and generate an 11-step tint and shade scale.',
  },
  'qr-code': {
    title: 'QR Code Generator: Links, Text & More',
    description: 'Create QR codes for links, text, Wi-Fi, email, phone and contact cards, with custom colors and error correction. Download as PNG or SVG.',
    tabs: {
      wifi: {
        title: 'Wi-Fi QR Code Generator',
        description: 'Make a QR code guests can scan to join your Wi-Fi. Special characters are escaped correctly, and your password never leaves your device.',
      },
      email: {
        title: 'Email QR Code Generator (mailto)',
        description: 'Create a QR code that opens a pre-filled email with recipient, subject and message. Download as PNG or SVG; generated in your browser.',
      },
      phone: {
        title: 'Phone & SMS QR Code Generator',
        description: 'Create a QR code that dials a number or opens a pre-written text message. Download as PNG or SVG; generated in your browser.',
      },
      contact: {
        title: 'vCard QR Code Generator (Contact Card)',
        description: 'Turn your name, phone, email and website into a vCard QR code people can scan to save your contact. Download as PNG or SVG.',
      },
    },
  },
  'seo-generator': {
    title: 'Meta Tag & Open Graph Generator',
    description: 'Generate title, description, canonical, Open Graph and X/Twitter tags with live Google and social previews. Correctly escaped and ready to paste.',
    tabs: {
      robots: {
        title: 'robots.txt Generator (Block AI Crawlers)',
        description: 'Build a robots.txt with rule groups and presets, including blocking GPTBot, ClaudeBot, CCBot and other AI crawlers, plus your sitemap.',
      },
      sitemap: {
        title: 'XML Sitemap Generator',
        description: 'Turn a list of URLs into a valid sitemap.xml with escaping, de-duplication and optional lastmod, changefreq and priority. Download in one click.',
      },
      schema: {
        title: 'Schema.org JSON-LD Generator',
        description: 'Generate JSON-LD structured data for Organization, WebSite, Article and Breadcrumbs, safely escaped for a script tag. Ready to paste.',
      },
    },
  },
  'timestamp-tools': {
    title: 'Unix Timestamp Converter (Epoch to Date)',
    description: 'Convert Unix timestamps in seconds, milliseconds, microseconds or nanoseconds to ISO 8601, RFC 2822, UTC and local time, and back.',
    tabs: {
      cron: {
        title: 'Cron Expression Explainer & Next Runs',
        description: 'Translate cron expressions into plain English and see the next five run times in your time zone. Supports ranges, steps, names and @macros.',
      },
    },
  },
  'timezone-compare': {
    title: 'Time Zone Converter & Meeting Planner',
    description: 'Compare times across cities with a 24-hour planner that highlights shared working hours. DST-aware; pick any date or use the current time.',
  },
  'markdown-previewer': {
    title: 'Markdown Live Preview (GitHub Flavored)',
    description: 'Write GitHub-flavored Markdown with a live, safe preview: tables, task lists and code blocks. Copy the HTML or download .md and .html files.',
  },
  'html-playground': {
    title: 'HTML, CSS & JS Playground with Preview',
    description: 'Edit HTML, CSS and JavaScript with a live, sandboxed preview and console. Import ES modules from CDNs and download a single HTML file.',
  },
  'js-runner': {
    title: 'Online JavaScript Runner & Console',
    description: 'Run JavaScript in an isolated sandbox with top-level await and a rich console (table, time, count). Infinite loops are stopped automatically.',
  },
}

export const PAGE_SEO: Record<'home' | 'contribute' | 'notFound', SeoText> = {
  home: {
    title: 'DevUtil: Free, Private Developer Tools',
    description: 'Encode, decode, format, convert, hash and test in one place. Free developer tools that run in your browser, so nothing you paste is uploaded.',
  },
  contribute: {
    title: 'Contribute to DevUtil (Open Source)',
    description: 'Report bugs, request tools or open a pull request. How to run DevUtil locally and add a new tool, step by step.',
  },
  notFound: { title: 'Page not found', description: 'This page doesn’t exist. Search DevUtil’s free, private developer tools instead.' },
}

export const SITE_URL = 'https://devutil.codes'

/** URL of a tool, optionally at a tab (the default tab has no suffix). */
export function toolPath(tool: CatalogTool, tab?: string): string {
  return tab && tool.tabs?.includes(tab) && tab !== tool.tabs[0] ? `${tool.path}/${tab}` : tool.path
}

export interface RouteMeta extends SeoText {
  /** Canonical path. */
  path: string
  /** Full document title (with brand). */
  documentTitle: string
  toolId?: string
  /** Name for breadcrumbs. */
  name: string
}

function withBrand(title: string) {
  return `${title}${BRAND}`
}

/** SEO metadata for a tool (and tab). Tabs without their own copy inherit the tool's. */
export function toolMeta(tool: CatalogTool, tab?: string): RouteMeta {
  const seo = TOOL_SEO[tool.id]
  const tabSeo = tab ? seo?.tabs?.[tab] : undefined
  const text = tabSeo ?? seo ?? { title: tool.name, description: tool.description }
  const feature = tab ? tool.features?.find((f) => f.tab === tab) : undefined
  return {
    ...text,
    documentTitle: withBrand(text.title),
    path: toolPath(tool, tab),
    toolId: tool.id,
    name: tabSeo && feature ? feature.name : tool.name,
  }
}

export function pageMeta(page: keyof typeof PAGE_SEO, path: string): RouteMeta {
  const seo = PAGE_SEO[page]
  return { ...seo, documentTitle: page === 'home' ? seo.title : withBrand(seo.title), path, name: seo.title }
}

/** Every indexable route with its metadata: tools, their tabs, and pages. */
export function allRoutes(): RouteMeta[] {
  const routes: RouteMeta[] = [pageMeta('home', '/')]
  for (const tool of catalog) {
    if (tool.hidden) continue
    routes.push(toolMeta(tool))
    for (const tab of tool.tabs?.slice(1) ?? []) routes.push(toolMeta(tool, tab))
  }
  routes.push(pageMeta('contribute', '/contribute'))
  return routes
}
