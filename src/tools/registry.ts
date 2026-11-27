/**
 * Single source of truth for every tool in the app.
 *
 * Routes, the sidebar, the home page, the ⌘K palette (and, later, the
 * prerender list and sitemap) are all derived from this file. Add a tool
 * here and it shows up everywhere.
 */
import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import {
  ArrowLeftRight,
  Binary,
  Braces,
  Clock,
  CodeXml,
  Dices,
  FileText,
  GitCompareArrows,
  Globe,
  Hash,
  KeyRound,
  Link,
  Palette,
  QrCode,
  Regex,
  SquareTerminal,
  Tags,
  Type,
  type LucideIcon,
} from 'lucide-react'

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
}

export type ToolStatus = 'stable' | 'beta'

export interface ToolDefinition {
  id: string
  name: string
  /** One line, shown in nav tooltips, cards and the palette. */
  description: string
  path: string
  /** Extra paths that render the same tool (legacy URLs). */
  aliases?: string[]
  category: CategoryId
  icon: LucideIcon
  keywords: string[]
  features?: ToolFeature[]
  status?: ToolStatus
  /** Routed but not listed in navigation (unfinished tools). */
  hidden?: boolean
  component: LazyExoticComponent<ComponentType>
}

export const categories: ToolCategory[] = [
  { id: 'convert', label: 'Convert & Encode' },
  { id: 'code', label: 'Text & Code' },
  { id: 'security', label: 'Security' },
  { id: 'web', label: 'Web & Design' },
  { id: 'time', label: 'Date & Time' },
  { id: 'playground', label: 'Playgrounds' },
]

export const tools: ToolDefinition[] = [
  // ── Convert & Encode ──────────────────────────────────────────────
  {
    id: 'data-transform',
    name: 'Data Transform',
    description: 'Convert between JSON, CSV, YAML, TOML and XML',
    path: '/data-transform',
    category: 'convert',
    icon: ArrowLeftRight,
    keywords: ['json', 'csv', 'yaml', 'toml', 'xml', 'convert', 'converter'],
    features: [
      { id: 'json-csv', name: 'JSON ↔ CSV' },
      { id: 'json-yaml', name: 'JSON ↔ YAML' },
      { id: 'json-xml', name: 'JSON ↔ XML' },
      { id: 'json-toml', name: 'JSON ↔ TOML' },
    ],
    component: lazy(() => import('@/pages/DataTransform')),
  },
  {
    id: 'encoding',
    name: 'Encode / Decode',
    description: 'Base64, Base32, Base58, URL, HTML entities, Data URI',
    path: '/encoding',
    category: 'convert',
    icon: Binary,
    keywords: ['base64', 'base32', 'base58', 'url encode', 'html entities', 'data uri', 'decode'],
    features: [
      { id: 'base64', name: 'Base64' },
      { id: 'base32', name: 'Base32' },
      { id: 'base58', name: 'Base58' },
      { id: 'html', name: 'HTML entities' },
      { id: 'datauri', name: 'Data URI' },
    ],
    component: lazy(() => import('@/pages/Encoding')),
  },
  {
    id: 'url-tools',
    name: 'URL Tools',
    description: 'Parse URLs, build query strings, encode components',
    path: '/url-tools',
    category: 'convert',
    icon: Link,
    keywords: ['url', 'query string', 'parse', 'uri', 'params'],
    features: [
      { id: 'parser', name: 'URL parser' },
      { id: 'query', name: 'Query string builder' },
    ],
    component: lazy(() => import('@/pages/URLTools')),
  },

  // ── Text & Code ───────────────────────────────────────────────────
  {
    id: 'code-json',
    name: 'Code & JSON',
    description: 'Format code with Prettier, minify, query JSON with JSONPath',
    path: '/code-formatter',
    aliases: ['/json-tools', '/code-json-tools'],
    category: 'code',
    icon: Braces,
    keywords: ['format', 'beautify', 'minify', 'prettify', 'prettier', 'json', 'html', 'css', 'scss', 'javascript', 'typescript', 'yaml', 'markdown', 'graphql', 'jsonpath', 'json validator'],
    features: [
      { id: 'formatter', name: 'Code formatter', keywords: ['beautify', 'prettify'] },
      { id: 'minify', name: 'Minifier' },
      { id: 'jsonpath', name: 'JSONPath query', keywords: ['json query', 'filter'] },
      { id: 'json-validate', name: 'JSON validator', keywords: ['lint', 'syntax error'] },
    ],
    component: lazy(() => import('@/pages/CodeAndJSONTools')),
  },
  {
    id: 'text-utilities',
    name: 'Text Utilities',
    description: 'Change case, count words, clean and sort text',
    path: '/text-utilities',
    category: 'code',
    icon: Type,
    keywords: ['case', 'camelcase', 'snake_case', 'word count', 'character count', 'sort lines', 'trim'],
    features: [
      { id: 'case', name: 'Case converter', keywords: ['camel', 'snake', 'kebab', 'pascal'] },
      { id: 'counter', name: 'Word & character counter' },
      { id: 'cleaner', name: 'Text cleaner & line sorter' },
    ],
    component: lazy(() => import('@/pages/TextUtilities')),
  },
  {
    id: 'text-diff',
    name: 'Text Diff',
    description: 'Compare texts or files side by side and export a patch',
    path: '/code-diff',
    category: 'code',
    icon: GitCompareArrows,
    keywords: ['diff', 'compare', 'difference', 'changes', 'patch', 'merge'],
    component: lazy(() => import('@/pages/CodeDiff')),
  },
  {
    id: 'regex-tester',
    name: 'Regex Tester',
    description: 'Test, explain and replace with regular expressions',
    path: '/regex-tester',
    aliases: ['/regex-playground'],
    category: 'code',
    icon: Regex,
    keywords: ['regex', 'regexp', 'regular expression', 'pattern', 'match', 'replace', 'playground'],
    features: [
      { id: 'replace', name: 'Regex find & replace', keywords: ['substitute', '$1'] },
      { id: 'explain', name: 'Regex explainer', keywords: ['what does this regex mean'] },
      { id: 'library', name: 'Common regex patterns', keywords: ['email regex', 'url regex', 'ip regex'] },
    ],
    component: lazy(() => import('@/pages/RegexTester')),
  },

  // ── Security ──────────────────────────────────────────────────────
  {
    id: 'jwt-decoder',
    name: 'JWT Decoder',
    description: 'Decode JSON Web Tokens and verify their signatures',
    path: '/jwt-decoder',
    category: 'security',
    icon: KeyRound,
    keywords: ['jwt', 'token', 'json web token', 'decode', 'claims', 'bearer', 'verify', 'signature', 'hs256', 'rs256'],
    features: [
      { id: 'decode', name: 'Decode JWT claims' },
      { id: 'verify', name: 'Verify JWT signature', keywords: ['hmac', 'rsa', 'ecdsa', 'public key', 'secret'] },
    ],
    component: lazy(() => import('@/pages/JWTDecoder')),
  },
  {
    id: 'hash-verify',
    name: 'Hash & Verify',
    description: 'Hash text or files, verify checksums, HMAC, password strength',
    path: '/hash-verify',
    category: 'security',
    icon: Hash,
    keywords: ['hash', 'md5', 'sha1', 'sha256', 'sha384', 'sha512', 'hmac', 'checksum', 'password strength', 'file hash'],
    features: [
      { id: 'hash', name: 'Hash generator', keywords: ['md5', 'sha256'] },
      { id: 'checksum', name: 'Verify a file checksum', keywords: ['sha256sum', 'iso', 'download', 'integrity'] },
      { id: 'hmac', name: 'HMAC' },
      { id: 'password', name: 'Password strength' },
    ],
    component: lazy(() => import('@/pages/HashVerify')),
  },
  {
    id: 'generators',
    name: 'Generators',
    description: 'UUIDs (v4, v7, v5), passwords, random numbers, Lorem Ipsum',
    path: '/generators',
    category: 'security',
    icon: Dices,
    keywords: ['uuid', 'guid', 'random', 'password', 'lorem ipsum', 'generate'],
    features: [
      { id: 'uuid', name: 'UUID generator', keywords: ['guid', 'v4', 'v7', 'v1', 'v5'] },
      { id: 'uuid-inspect', name: 'UUID validator & inspector', keywords: ['validate', 'version', 'timestamp'] },
      { id: 'password', name: 'Password generator', keywords: ['secure', 'random string'] },
      { id: 'random', name: 'Random numbers & hex', keywords: ['api key', 'secret', 'dice'] },
      { id: 'lorem', name: 'Lorem Ipsum' },
    ],
    component: lazy(() => import('@/pages/GeneratorToolkit')),
  },

  // ── Web & Design ──────────────────────────────────────────────────
  {
    id: 'color-picker',
    name: 'Color Picker',
    description: 'Convert colors, check WCAG contrast, generate shades',
    path: '/color-picker',
    category: 'web',
    icon: Palette,
    keywords: ['color', 'colour', 'hex', 'rgb', 'hsl', 'oklch', 'cmyk', 'picker', 'contrast', 'wcag', 'palette', 'shades'],
    features: [
      { id: 'contrast', name: 'Color contrast checker (WCAG)', keywords: ['accessibility', 'a11y', 'aa', 'aaa'] },
      { id: 'palette', name: 'Tints & shades palette', keywords: ['scale', 'tailwind'] },
    ],
    component: lazy(() => import('@/pages/ColorPicker')),
  },
  {
    id: 'qr-code',
    name: 'QR Code',
    description: 'QR codes for links, Wi-Fi, email, phone and contacts',
    path: '/qr-code',
    category: 'web',
    icon: QrCode,
    keywords: ['qr', 'qrcode', 'barcode', 'wifi qr', 'vcard'],
    features: [
      { id: 'wifi', name: 'Wi-Fi QR code', keywords: ['wireless', 'password', 'guest network'] },
      { id: 'contact', name: 'Contact card QR (vCard)', keywords: ['business card'] },
    ],
    component: lazy(() => import('@/pages/QRCodeGenerator')),
  },
  {
    id: 'seo-generator',
    name: 'SEO Generator',
    description: 'Meta & social tags with previews, robots.txt, sitemap, JSON-LD',
    path: '/seo-generator',
    category: 'web',
    icon: Tags,
    keywords: ['seo', 'meta tags', 'open graph', 'twitter card', 'robots.txt', 'sitemap', 'schema'],
    features: [
      { id: 'meta', name: 'Meta & Open Graph tags' },
      { id: 'robots', name: 'robots.txt generator', keywords: ['block ai crawlers', 'gptbot'] },
      { id: 'sitemap', name: 'sitemap.xml' },
      { id: 'canonical', name: 'Canonical URL' },
      { id: 'schema', name: 'Schema.org JSON-LD' },
    ],
    component: lazy(() => import('@/pages/SEOGenerator')),
  },

  // ── Date & Time ───────────────────────────────────────────────────
  {
    id: 'timestamp-tools',
    name: 'Timestamp & Cron',
    description: 'Convert Unix timestamps, explain cron expressions',
    path: '/timestamp-tools',
    category: 'time',
    icon: Clock,
    keywords: ['unix', 'epoch', 'timestamp', 'date', 'cron', 'crontab'],
    features: [
      { id: 'unix', name: 'Unix timestamp converter', keywords: ['epoch'] },
      { id: 'cron', name: 'Cron expression explainer', keywords: ['crontab', 'schedule', 'next run'] },
    ],
    component: lazy(() => import('@/pages/TimestampTools')),
  },
  {
    id: 'timezone-compare',
    name: 'Timezone Compare',
    description: 'World clock and meeting planner across time zones',
    path: '/timezone-compare',
    category: 'time',
    icon: Globe,
    keywords: ['timezone', 'time zone', 'utc', 'world clock', 'meeting planner', 'dst', 'gmt', 'convert time'],
    component: lazy(() => import('@/pages/TimezoneCompare')),
  },

  // ── Playgrounds (being finished — routed, not listed yet) ─────────
  {
    id: 'markdown-previewer',
    name: 'Markdown Preview',
    description: 'Write Markdown with a live preview',
    path: '/markdown-previewer',
    category: 'playground',
    icon: FileText,
    keywords: ['markdown', 'md', 'preview', 'readme'],
    status: 'beta',
    hidden: true,
    component: lazy(() => import('@/pages/MarkdownPreviewer')),
  },
  {
    id: 'html-playground',
    name: 'HTML Playground',
    description: 'Edit HTML, CSS and JS with a live preview',
    path: '/html-playground',
    category: 'playground',
    icon: CodeXml,
    keywords: ['html', 'css', 'javascript', 'playground', 'sandbox', 'preview'],
    status: 'beta',
    hidden: true,
    component: lazy(() => import('@/pages/HTMLPlayground')),
  },
  {
    id: 'js-runner',
    name: 'JavaScript Runner',
    description: 'Run JavaScript and see console output',
    path: '/js-runner',
    category: 'playground',
    icon: SquareTerminal,
    keywords: ['javascript', 'js', 'run', 'console', 'repl'],
    status: 'beta',
    hidden: true,
    component: lazy(() => import('@/pages/JavaScriptRunner')),
  },
]

export const visibleTools = tools.filter((t) => !t.hidden)

export function getToolById(id: string): ToolDefinition | undefined {
  return tools.find((t) => t.id === id)
}

export function getToolByPath(pathname: string): ToolDefinition | undefined {
  const clean = pathname.replace(/\/+$/, '') || '/'
  return tools.find((t) => t.path === clean || t.aliases?.includes(clean))
}

export function toolsByCategory(list: ToolDefinition[] = visibleTools) {
  return categories
    .map((category) => ({ category, tools: list.filter((t) => t.category === category.id) }))
    .filter((group) => group.tools.length > 0)
}
