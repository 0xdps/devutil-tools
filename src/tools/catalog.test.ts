import { describe, expect, it } from 'vitest'
import { allRoutes, catalog, pageMeta, SITE_NAME, SITE_URL, toolMeta, toolPath } from './catalog'
import { buildHead, renderHead } from './seo-head'

describe('catalog', () => {
  const routes = allRoutes()

  it('every route has search-friendly title and description lengths', () => {
    for (const r of routes) {
      expect(r.documentTitle.length, r.documentTitle).toBeLessThanOrEqual(60)
      expect(r.description.length, r.path).toBeGreaterThanOrEqual(70)
      expect(r.description.length, r.path).toBeLessThanOrEqual(160)
    }
  })

  it('the brand appears once in each document title (home leads with it)', () => {
    for (const r of routes) {
      const count = r.documentTitle.split(SITE_NAME).length - 1
      expect(count, r.documentTitle).toBe(1)
    }
  })

  it('paths and titles are unique', () => {
    expect(new Set(routes.map((r) => r.path)).size).toBe(routes.length)
    expect(new Set(routes.map((r) => r.documentTitle)).size).toBe(routes.length)
  })

  it('every non-default tab has its own copy and route', () => {
    for (const tool of catalog) {
      for (const tab of tool.tabs?.slice(1) ?? []) {
        const meta = toolMeta(tool, tab)
        expect(meta.path).toBe(`${tool.path}/${tab}`)
        expect(meta.title, `${tool.id}/${tab}`).not.toBe(toolMeta(tool).title)
      }
    }
  })

  it('feature tabs and aliases point at real tabs', () => {
    for (const tool of catalog) {
      for (const f of tool.features ?? []) if (f.tab) expect(tool.tabs, `${tool.id}:${f.id}`).toContain(f.tab)
      for (const a of tool.aliases ?? []) if (a.tab) expect(tool.tabs).toContain(a.tab)
    }
    expect(toolPath(catalog.find((t) => t.id === 'generators')!, 'uuid')).toBe('/generators')
  })
})

describe('seo-head', () => {
  it('emits canonical, social tags and honest structured data', () => {
    const tool = catalog.find((t) => t.id === 'generators')!
    const head = buildHead(toolMeta(tool, 'lorem'))
    expect(head.links).toEqual([{ rel: 'canonical', href: 'https://localplus.app/generators/lorem' }])
    expect(head.meta).toContainEqual({ property: 'og:url', content: 'https://localplus.app/generators/lorem' })
    const json = JSON.stringify(head.jsonLd)
    expect(json).toContain('"WebApplication"')
    expect(json).not.toMatch(/aggregateRating|"Review"/) // never invent ratings or reviews
  })
  it('renders escaped HTML', () => {
    const html = renderHead(buildHead({ title: 'A "B" <C>', documentTitle: 'A & B', description: 'x'.repeat(80), path: '/x', name: 'X', toolId: 'x' }))
    expect(html).toContain('<title>A &amp; B</title>')
    expect(html).toContain('content="A &quot;B&quot; &lt;C&gt;"')
    expect(html).not.toMatch(/<\/script><script/)
  })
  it('home page declares the Organization and WebSite that tool pages reference', () => {
    const home = buildHead(pageMeta('home', '/')).jsonLd as Record<string, unknown>[]
    const ids = new Set(home.map((j) => j['@id']))
    expect(ids).toEqual(new Set([`${SITE_URL}/#website`, `${SITE_URL}/#organization`]))
    const tool = buildHead(toolMeta(catalog[0])).jsonLd[0] as Record<string, Record<string, string>>
    expect(ids.has(tool.publisher['@id'])).toBe(true)
    expect(ids.has(tool.isPartOf['@id'])).toBe(true)
  })
  it('uses the brand and domain everywhere, with a correctly sized social image', () => {
    expect(SITE_NAME).toBe('LocalPlus')
    expect(SITE_URL).toBe('https://localplus.app')
    const head = buildHead(toolMeta(catalog[0]))
    expect(head.meta).toContainEqual({ property: 'og:site_name', content: 'LocalPlus' })
    expect(head.meta).toContainEqual({ property: 'og:image', content: 'https://localplus.app/og-image.png' })
    expect(head.meta).toContainEqual({ property: 'og:image:width', content: '1200' })
    expect(head.meta).toContainEqual({ property: 'og:image:height', content: '630' })
    const everything = JSON.stringify([allRoutes(), head])
    expect(everything).not.toMatch(/devutil\.codes|DevUtil|Developer Utilities Tool/)
  })
  it('noindex pages have no canonical', () => {
    const head = buildHead({ title: 't', documentTitle: 't', description: 'd', path: '/missing', name: 't' }, { noindex: true })
    expect(head.links).toEqual([])
    expect(head.meta).toContainEqual({ name: 'robots', content: 'noindex' })
  })
})
