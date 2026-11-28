/**
 * Builds the <head> SEO tags for a route. Used by the <SEO> component at
 * runtime and by the build plugin that writes one HTML file per route, so
 * both always agree. Pure (no React, no DOM).
 */
import { SITE_NAME, SITE_URL, type RouteMeta } from './catalog'

export interface HeadData {
  title: string
  meta: { name?: string; property?: string; content: string }[]
  links: { rel: string; href: string }[]
  jsonLd: object[]
}

const OG_IMAGE = `${SITE_URL}/og-image.png`
const OG_IMAGE_ALT = `${SITE_NAME}: free, private developer tools that run in your browser`
const REPO_URL = 'https://github.com/0xdps/devutil-tools'

export function buildHead(route: RouteMeta, { noindex = false }: { noindex?: boolean } = {}): HeadData {
  const url = `${SITE_URL}${route.path === '/' ? '/' : route.path}`
  const meta: HeadData['meta'] = [
    { name: 'description', content: route.description },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:locale', content: 'en_US' },
    { property: 'og:title', content: route.title },
    { property: 'og:description', content: route.description },
    { property: 'og:url', content: url },
    { property: 'og:image', content: OG_IMAGE },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:image:alt', content: OG_IMAGE_ALT },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: route.title },
    { name: 'twitter:description', content: route.description },
    { name: 'twitter:image', content: OG_IMAGE },
    { name: 'twitter:image:alt', content: OG_IMAGE_ALT },
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
      inLanguage: 'en',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      publisher: { '@id': `${SITE_URL}/#organization` },
      isPartOf: { '@id': `${SITE_URL}/#website` },
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
    jsonLd.push(
      { '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: SITE_NAME, url, description: route.description, inLanguage: 'en', publisher: { '@id': `${SITE_URL}/#organization` } },
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url,
        logo: `${SITE_URL}/icon-512x512.png`,
        sameAs: [REPO_URL],
      },
    )
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
