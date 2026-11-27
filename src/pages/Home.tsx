import { Link } from 'react-router-dom'
import { ArrowUpRight, Lock, Search, Star, WifiOff, Zap } from 'lucide-react'
import SEO from '@/components/SEO'
import { pageMeta } from '@/tools/catalog'
import { Kbd } from '@/components/ui/kbd'
import { getToolById, toolsByCategory, type ToolDefinition } from '@/tools/registry'
import { useFavorites, useRecents } from '@/hooks/use-tool-prefs'
import { useCommandPalette } from '@/components/layout/command-palette-context'
import { PasteBox } from '@/components/layout/PasteBox'
import { modKey } from '@/lib/platform'
import { cn } from '@/lib/utils'

function ToolCard({ tool }: { tool: ToolDefinition }) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const Icon = tool.icon
  const favorite = isFavorite(tool.id)

  return (
    <div className="group relative flex gap-3 rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-primary/40 hover:bg-accent/40 focus-within:ring-2 focus-within:ring-ring/50">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-[18px]" />
      </div>
      <div className="min-w-0 pr-6">
        <Link to={tool.path} className="font-medium outline-none after:absolute after:inset-0 after:content-['']">
          {tool.name}
        </Link>
        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{tool.description}</p>
      </div>
      <button
        type="button"
        onClick={() => toggleFavorite(tool.id)}
        aria-label={favorite ? `Remove ${tool.name} from favorites` : `Add ${tool.name} to favorites`}
        aria-pressed={favorite}
        className={cn(
          'absolute top-3 right-3 z-10 rounded-md p-1 text-muted-foreground transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
          favorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
      >
        <Star className={cn('size-4', favorite && 'fill-warning text-warning')} />
      </button>
    </div>
  )
}

const promises = [
  { icon: Lock, label: 'Runs in your browser' },
  { icon: WifiOff, label: 'Works offline' },
  { icon: Zap, label: 'No sign-up' },
]

export default function Home() {
  const { favorites } = useFavorites()
  const recents = useRecents()
  const { setOpen } = useCommandPalette()

  const quick = [...favorites, ...recents.filter((r) => !favorites.includes(r))]
    .map(getToolById)
    .filter((t): t is ToolDefinition => !!t && !t.hidden)
    .slice(0, 6)

  return (
    <>
      <SEO meta={pageMeta('home', '/')} />
      <div className="mx-auto max-w-6xl space-y-10">
        <section className="space-y-5 pt-2 sm:pt-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Developer utilities, <span className="text-primary">without the upload.</span>
            </h1>
            <p className="max-w-2xl text-base text-pretty text-muted-foreground">
              Encode, convert, format, hash and decode in one place. Every tool runs locally, so tokens, keys and
              customer data never leave your machine.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-12 w-full max-w-xl items-center gap-3 rounded-xl border bg-card px-4 text-left text-muted-foreground shadow-xs transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Search className="size-4" />
            <span className="flex-1 truncate">
              Search tools<span className="hidden sm:inline">, e.g. “jwt”, “base64”, “uuid”</span>
            </span>
            <Kbd>{modKey} K</Kbd>
          </button>

          <PasteBox />

          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {promises.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-1.5">
                <Icon className="size-4 text-success" /> {label}
              </li>
            ))}
          </ul>
        </section>

        {quick.length > 0 && (
          <section aria-labelledby="quick-access" className="space-y-3">
            <h2 id="quick-access" className="text-sm font-semibold text-muted-foreground">
              Favorites & recent
            </h2>
            <div className="flex flex-wrap gap-2">
              {quick.map((tool) => {
                const Icon = tool.icon
                return (
                  <Link
                    key={tool.id}
                    to={tool.path}
                    className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm shadow-xs transition-colors hover:border-primary/40 hover:bg-accent/40"
                  >
                    <Icon className="size-4 text-primary" />
                    {tool.name}
                    {favorites.includes(tool.id) && <Star className="size-3 fill-warning text-warning" />}
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {toolsByCategory().map(({ category, tools }) => (
          <section key={category.id} aria-labelledby={`cat-${category.id}`} className="space-y-3">
            <h2 id={`cat-${category.id}`} className="text-sm font-semibold text-muted-foreground">
              {category.label}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </section>
        ))}

        <section className="flex flex-col items-start justify-between gap-3 rounded-xl border border-dashed p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-medium">Missing a tool?</h2>
            <p className="text-sm text-muted-foreground">Request it or build it. The project is open source.</p>
          </div>
          <Link
            to="/contribute"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
          >
            How to contribute <ArrowUpRight className="size-4" />
          </Link>
        </section>
      </div>
    </>
  )
}
