/** Generators for meta tags, robots.txt, sitemap.xml and JSON-LD. Pure. */

/** Escapes text for an HTML attribute value. */
export const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Escapes text for XML element content. */
export const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

// ── Meta tags ───────────────────────────────────────────────────────

export interface MetaInput {
  title: string
  description: string
  canonical: string
  siteName: string
  image: string
  imageAlt: string
  type: 'website' | 'article' | 'product' | 'profile'
  twitterSite: string
  locale: string
  noindex: boolean
}

export const TITLE_LIMIT = 60
export const DESCRIPTION_LIMIT = 160

export function metaTags(m: MetaInput): string {
  const lines: string[] = []
  const meta = (attr: 'name' | 'property', key: string, value: string) => value && lines.push(`<meta ${attr}="${key}" content="${escapeAttr(value)}">`)
  if (m.title) lines.push(`<title>${escapeXml(m.title)}</title>`)
  meta('name', 'description', m.description)
  if (m.canonical) lines.push(`<link rel="canonical" href="${escapeAttr(m.canonical)}">`)
  if (m.noindex) lines.push('<meta name="robots" content="noindex, nofollow">')

  lines.push('', '<!-- Open Graph -->')
  meta('property', 'og:type', m.type)
  meta('property', 'og:title', m.title)
  meta('property', 'og:description', m.description)
  meta('property', 'og:url', m.canonical)
  meta('property', 'og:site_name', m.siteName)
  meta('property', 'og:locale', m.locale)
  meta('property', 'og:image', m.image)
  meta('property', 'og:image:alt', m.image ? m.imageAlt : '')

  lines.push('', '<!-- Twitter / X -->')
  meta('name', 'twitter:card', m.image ? 'summary_large_image' : 'summary')
  const handle = m.twitterSite && !m.twitterSite.startsWith('@') ? `@${m.twitterSite}` : m.twitterSite
  meta('name', 'twitter:site', handle)
  meta('name', 'twitter:title', m.title)
  meta('name', 'twitter:description', m.description)
  meta('name', 'twitter:image', m.image)
  meta('name', 'twitter:image:alt', m.image ? m.imageAlt : '')
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

// ── robots.txt ──────────────────────────────────────────────────────

export interface RobotsGroup {
  userAgents: string[]
  allow: string[]
  disallow: string[]
}

export const AI_CRAWLERS = ['GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'ClaudeBot', 'anthropic-ai', 'Google-Extended', 'CCBot', 'PerplexityBot', 'Bytespider', 'Applebot-Extended', 'meta-externalagent']

export function robotsTxt(groups: RobotsGroup[], sitemaps: string[]): string {
  const blocks = groups
    .filter((g) => g.userAgents.some((u) => u.trim()))
    .map((g) => {
      const lines = g.userAgents.filter((u) => u.trim()).map((u) => `User-agent: ${u.trim()}`)
      for (const p of g.allow) if (p.trim()) lines.push(`Allow: ${p.trim()}`)
      for (const p of g.disallow) if (p.trim()) lines.push(`Disallow: ${p.trim()}`)
      // A group with no rules means "allow everything"; say so explicitly.
      if (!g.allow.some((p) => p.trim()) && !g.disallow.some((p) => p.trim())) lines.push('Disallow:')
      return lines.join('\n')
    })
  const maps = sitemaps.filter((s) => s.trim()).map((s) => `Sitemap: ${s.trim()}`)
  return [...blocks, ...(maps.length ? [maps.join('\n')] : [])].join('\n\n') + '\n'
}

// ── sitemap.xml ─────────────────────────────────────────────────────

export type ChangeFreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'

export interface SitemapOptions {
  lastmod?: string // YYYY-MM-DD
  changefreq?: ChangeFreq
  priority?: number
}

export interface SitemapResult {
  xml: string
  invalid: string[]
  duplicates: number
}

export function sitemapXml(lines: string[], opts: SitemapOptions = {}): SitemapResult {
  const invalid: string[] = []
  const seen = new Set<string>()
  let duplicates = 0
  const urls: string[] = []
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    let url: URL
    try {
      url = new URL(line)
      if (!/^https?:$/.test(url.protocol)) throw new Error()
    } catch {
      invalid.push(line)
      continue
    }
    if (seen.has(url.href)) {
      duplicates++
      continue
    }
    seen.add(url.href)
    urls.push(url.href)
  }
  if (urls.length > 50_000) throw new Error('A sitemap can hold at most 50,000 URLs; split it into several files')
  const entries = urls.map((href) => {
    const parts = [`    <loc>${escapeXml(href)}</loc>`]
    if (opts.lastmod) parts.push(`    <lastmod>${opts.lastmod}</lastmod>`)
    if (opts.changefreq) parts.push(`    <changefreq>${opts.changefreq}</changefreq>`)
    if (opts.priority !== undefined) parts.push(`    <priority>${opts.priority.toFixed(1)}</priority>`)
    return `  <url>\n${parts.join('\n')}\n  </url>`
  })
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}${entries.length ? '\n' : ''}</urlset>\n`
  return { xml, invalid, duplicates }
}

// ── JSON-LD ─────────────────────────────────────────────────────────

export type SchemaType = 'Organization' | 'WebSite' | 'Article' | 'BreadcrumbList'

export interface SchemaInput {
  name: string
  url: string
  logo: string
  description: string
  sameAs: string[]
  // Article
  headline: string
  author: string
  datePublished: string
  image: string
  // BreadcrumbList: "Name | URL" per line
  breadcrumbs: string[]
  // WebSite: e.g. https://example.com/search?q={search_term_string}
  searchUrl: string
}

const compact = (obj: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v !== undefined && !(Array.isArray(v) && v.length === 0)))

export function jsonLd(type: SchemaType, s: SchemaInput): string {
  let data: Record<string, unknown>
  switch (type) {
    case 'Organization':
      data = compact({ '@type': 'Organization', name: s.name, url: s.url, logo: s.logo, description: s.description, sameAs: s.sameAs.filter(Boolean) })
      break
    case 'WebSite':
      data = compact({
        '@type': 'WebSite',
        name: s.name,
        url: s.url,
        description: s.description,
        potentialAction: s.searchUrl.includes('{search_term_string}')
          ? { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: s.searchUrl }, 'query-input': 'required name=search_term_string' }
          : undefined,
      })
      break
    case 'Article':
      data = compact({
        '@type': 'Article',
        headline: s.headline,
        description: s.description,
        image: s.image ? [s.image] : [],
        datePublished: s.datePublished,
        author: s.author ? { '@type': 'Person', name: s.author } : undefined,
        publisher: s.name ? compact({ '@type': 'Organization', name: s.name, logo: s.logo ? { '@type': 'ImageObject', url: s.logo } : undefined }) : undefined,
        mainEntityOfPage: s.url,
      })
      break
    case 'BreadcrumbList':
      data = {
        '@type': 'BreadcrumbList',
        itemListElement: s.breadcrumbs
          .map((line) => line.split('|').map((p) => p.trim()))
          .filter(([name]) => name)
          .map(([name, item], i) => compact({ '@type': 'ListItem', position: i + 1, name, item })),
      }
      break
  }
  // "</" inside a <script> would end it early; escape it.
  const json = JSON.stringify({ '@context': 'https://schema.org', ...data }, null, 2).replace(/<\//g, '<\\/')
  return `<script type="application/ld+json">\n${json}\n</script>`
}
