import { Helmet } from 'react-helmet-async'
import type { RouteMeta } from '@/tools/catalog'
import { buildHead } from '@/tools/seo-head'

/** Head tags for the current route; the same data the build writes into static HTML. */
export default function SEO({ meta, noindex = false }: { meta: RouteMeta; noindex?: boolean }) {
  const head = buildHead(meta, { noindex })
  return (
    <Helmet>
      <title>{head.title}</title>
      {head.meta.map((m) =>
        m.name ? <meta key={`n:${m.name}`} name={m.name} content={m.content} /> : <meta key={`p:${m.property}`} property={m.property} content={m.content} />,
      )}
      {head.links.map((l) => (
        <link key={l.rel} rel={l.rel} href={l.href} />
      ))}
      {head.jsonLd.map((j, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(j)}
        </script>
      ))}
    </Helmet>
  )
}
