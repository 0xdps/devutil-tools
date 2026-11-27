/**
 * Builds the <head> SEO tags for a route. Used by the <SEO> component at
 * runtime and by the build plugin that writes one HTML file per route, so
 * both always agree. Pure (no React, no DOM).
 */
import { SITE_URL, type RouteMeta } from './catalog'

export interface HeadData {
  title: string
  meta: { name?: string; property?: string; content: string }[]
  links: { rel: string; href: string }[]
  jsonLd: object[]
}

const OG_IMAGE = `${SITE_URL}/og-image.png`

export function buildHead(route: RouteMeta, { noindex = false }: { noindex?: boolean } = {}): HeadData {
  const url = `${SITE_URL}${route.path === '/' ? '/' : route.path}`
  const meta: HeadData['meta'] = [
    { name: 'description', content: route.description },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: 'DevUtil' },
    { property: 'og:title', content: route.title },
    { property: 'og:description', content: route.description },
    { property: 'og:url', content: url },
    { property: 'og:image', content: OG_IMAGE },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: route.title },
    { name: 'twitter:description', content: route.description },
    { name: 'twitter:image', content: OG_IMAGE },
  ]
  if (noindex) meta.push({ name: 'robots', content: 'noindex' })

  const jsonLd: object[] = []
  if (route.toolId) {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: route.name,
      description: route.description,
      url,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Any (runs in the browser)',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    })
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Tools', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: route.name, item: url },
      ],
    })
  } else if (route.path === '/') {
    jsonLd.push({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'DevUtil', url, description: route.description })
  }

  return { title: route.documentTitle, meta, links: noindex ? [] : [{ rel: 'canonical', href: url }], jsonLd }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Serializes head data to HTML for static pages. The browser app removes this
 * block at startup (see main.tsx) and renders its own, so crawlers see these
 * tags and users get exactly one managed set.
 */
export function renderHead(head: HeadData): string {
  return [
    `<title>${esc(head.title)}</title>`,
    ...head.meta.map((m) => `<meta ${m.name ? `name="${esc(m.name)}"` : `property="${esc(m.property!)}"`} content="${esc(m.content)}">`),
    ...head.links.map((l) => `<link rel="${esc(l.rel)}" href="${esc(l.href)}">`),
    ...head.jsonLd.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`),
  ].join('\n    ')
}
