import { Link, useLocation } from 'react-router-dom'
import SEO from '@/components/SEO'
import { pageMeta } from '@/tools/catalog'
import { ArrowLeft, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { useCommandPalette } from '@/components/layout/command-palette-context'
import { modKey } from '@/lib/platform'
import { site } from '@/config/site'
import { visibleTools } from '@/tools/registry'

/** Suggests tools whose name or keywords appear in the missing URL. */
function suggestionsFor(pathname: string) {
  const words = pathname.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2)
  const scored = visibleTools
    .map((tool) => {
      const haystack = [tool.name, tool.path, ...tool.keywords].join(' ').toLowerCase()
      return { tool, score: words.filter((w) => haystack.includes(w)).length }
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
  return (scored.length ? scored.map((s) => s.tool) : visibleTools).slice(0, 6)
}

export default function NotFound() {
  const { pathname } = useLocation()
  const { setOpen } = useCommandPalette()
  const suggestions = suggestionsFor(pathname)

  return (
    <>
      <SEO meta={pageMeta('notFound', pathname)} noindex />
      <div className="mx-auto max-w-2xl space-y-8 py-8 text-center sm:py-16">
        <div className="space-y-3">
          <p className="font-mono text-sm text-primary">404</p>
          <h1 className="text-3xl font-semibold tracking-tight">This page doesn’t exist</h1>
          <p className="text-muted-foreground">
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm break-all">{pathname}</code> isn’t a tool. It may have moved.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => setOpen(true)}>
            <Search /> Search tools <Kbd className="ml-1 border border-primary-foreground/50 bg-transparent text-primary-foreground">{modKey} K</Kbd>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/">
              <ArrowLeft /> All tools
            </Link>
          </Button>
        </div>
        <section aria-labelledby="suggested" className="space-y-3 text-left">
          <h2 id="suggested" className="text-sm font-semibold text-muted-foreground">
            {suggestions.length < visibleTools.length ? 'Were you looking for' : 'Popular tools'}
          </h2>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {suggestions.map((tool) => {
              const Icon = tool.icon
              return (
                <li key={tool.id} className="min-w-0">
                  <Link to={tool.path} className="flex min-w-0 items-center gap-3 rounded-lg border bg-card p-3 shadow-xs transition-colors hover:border-primary/40 hover:bg-accent/40">
                    <Icon className="size-4 shrink-0 text-primary" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{tool.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{tool.description}</span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
        <p className="text-sm text-muted-foreground">
          Followed a broken link?{' '}
          <a href={site.issuesUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary">
            Let us know
          </a>
          .
        </p>
      </div>
    </>
  )
}
