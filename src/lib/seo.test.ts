import { describe, expect, it } from 'vitest'
import { AI_CRAWLERS, jsonLd, metaTags, robotsTxt, sitemapXml, type MetaInput, type SchemaInput } from './seo'

const baseMeta: MetaInput = {
  title: '',
  description: '',
  canonical: '',
  siteName: '',
  image: '',
  imageAlt: '',
  type: 'website',
  twitterSite: '',
  locale: '',
  noindex: false,
}

describe('metaTags', () => {
  it('escapes quotes, ampersands and angle brackets', () => {
    const out = metaTags({ ...baseMeta, title: 'Tom & Jerry <"Best">', description: 'Say "hi"' })
    expect(out).toContain('<title>Tom &amp; Jerry &lt;&quot;Best&quot;&gt;</title>')
    expect(out).toContain('<meta name="description" content="Say &quot;hi&quot;">')
    expect(out).not.toContain('name="title"')
  })
  it('uses summary_large_image only with an image and adds @ to the handle', () => {
    expect(metaTags({ ...baseMeta, title: 'x' })).toContain('content="summary"')
    const withImage = metaTags({ ...baseMeta, title: 'x', image: 'https://x.dev/og.png', twitterSite: 'localplus' })
    expect(withImage).toContain('content="summary_large_image"')
    expect(withImage).toContain('<meta name="twitter:site" content="@localplus">')
  })
  it('adds canonical and noindex', () => {
    const out = metaTags({ ...baseMeta, canonical: 'https://x.dev/a?b=1&c=2', noindex: true })
    expect(out).toContain('<link rel="canonical" href="https://x.dev/a?b=1&amp;c=2">')
    expect(out).toContain('noindex, nofollow')
  })
})

describe('robotsTxt', () => {
  it('writes groups, an explicit empty Disallow and sitemaps', () => {
    expect(
      robotsTxt(
        [
          { userAgents: ['*'], allow: [], disallow: [] },
          { userAgents: ['GPTBot', 'CCBot'], allow: [], disallow: ['/'] },
        ],
        ['https://x.dev/sitemap.xml'],
      ),
    ).toBe('User-agent: *\nDisallow:\n\nUser-agent: GPTBot\nUser-agent: CCBot\nDisallow: /\n\nSitemap: https://x.dev/sitemap.xml\n')
  })
  it('knows the common AI crawlers', () => expect(AI_CRAWLERS).toEqual(expect.arrayContaining(['GPTBot', 'ClaudeBot', 'Google-Extended', 'CCBot'])))
})

describe('sitemapXml', () => {
  it('escapes &, dedupes and reports invalid lines', () => {
    const { xml, invalid, duplicates } = sitemapXml(['https://x.dev/a?b=1&c=2', 'https://x.dev/a?b=1&c=2', 'not a url', 'ftp://x.dev/file', ''], {
      lastmod: '2024-03-15',
      priority: 0.8,
    })
    expect(xml).toContain('<loc>https://x.dev/a?b=1&amp;c=2</loc>')
    expect(xml).toContain('<lastmod>2024-03-15</lastmod>')
    expect(xml).toContain('<priority>0.8</priority>')
    expect(xml).not.toContain('xml-stylesheet')
    expect(xml.match(/<url>/g)).toHaveLength(1)
    expect(invalid).toEqual(['not a url', 'ftp://x.dev/file'])
    expect(duplicates).toBe(1)
  })
})

describe('jsonLd', () => {
  const s: SchemaInput = {
    name: 'LocalPlus',
    url: 'https://localplus.app',
    logo: '',
    description: '',
    sameAs: ['https://github.com/0xdps', ''],
    headline: '',
    author: '',
    datePublished: '',
    image: '',
    breadcrumbs: ['Home | https://x.dev/', 'Tools | https://x.dev/tools', ''],
    searchUrl: 'https://localplus.app/?q={search_term_string}',
  }
  it('drops empty fields', () => {
    const out = jsonLd('Organization', s)
    expect(out).toContain('"sameAs": [\n    "https://github.com/0xdps"\n  ]')
    expect(out).not.toContain('"logo"')
  })
  it('builds a WebSite search action and breadcrumbs', () => {
    expect(jsonLd('WebSite', s)).toContain('"urlTemplate": "https://localplus.app/?q={search_term_string}"')
    const crumbs = JSON.parse(jsonLd('BreadcrumbList', s).replace(/^<script[^>]*>|<\/script>$/g, ''))
    expect(crumbs.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://x.dev/' },
      { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://x.dev/tools' },
    ])
  })
  it('cannot break out of the script tag', () => {
    expect(jsonLd('Organization', { ...s, description: '</script><script>alert(1)</script>' })).not.toMatch(/<\/script><script>/)
  })
})
