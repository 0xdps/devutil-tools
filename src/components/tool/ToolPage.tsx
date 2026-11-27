import type { ReactNode } from 'react'
import { Star } from 'lucide-react'
import SEO from '@/components/SEO'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { ToolMeta } from '@/config/seoConfig'
import { useFavorites } from '@/hooks/use-tool-prefs'
import { getToolById } from '@/tools/registry'
import { cn } from '@/lib/utils'

interface ToolPageProps {
  /** Registry id; supplies the name, icon and description. */
  toolId: string
  meta: ToolMeta
  /** Extra header actions (share, reset…), shown left of the favorite star. */
  actions?: ReactNode
  /** Reference/help content rendered below the tool. */
  reference?: ReactNode
  children: ReactNode
  className?: string
}

/** Standard frame for every tool: SEO, header with actions, body, reference. */
export function ToolPage({ toolId, meta, actions, reference, children, className }: ToolPageProps) {
  const tool = getToolById(toolId)
  const { isFavorite, toggleFavorite } = useFavorites()
  if (!tool) throw new Error(`Unknown tool id "${toolId}"`)
  const Icon = tool.icon
  const favorite = isFavorite(tool.id)

  return (
    <>
      <SEO
        title={meta.title}
        description={meta.description}
        keywords={meta.keywords}
        canonical={meta.canonical}
        toolName={meta.toolName}
        toolDescription={meta.toolDescription}
        toolUrl={meta.canonical}
      />
      <div className={cn('mx-auto w-full max-w-6xl space-y-6', className)}>
        <header className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-card text-primary shadow-xs">
              <Icon className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{tool.name}</h1>
                {tool.status === 'beta' && <Badge variant="secondary">Beta</Badge>}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{tool.description}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {actions}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleFavorite(tool.id)}
                  aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
                  aria-pressed={favorite}
                >
                  <Star className={cn(favorite && 'fill-warning text-warning')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{favorite ? 'Remove from favorites' : 'Add to favorites'}</TooltipContent>
            </Tooltip>
          </div>
        </header>

        {children}

        {reference && (
          <section aria-labelledby="tool-reference" className="rounded-xl border bg-card/50 p-5">
            <h2 id="tool-reference" className="mb-3 text-sm font-semibold">
              Reference
            </h2>
            <div className="text-sm text-muted-foreground">{reference}</div>
          </section>
        )}
      </div>
    </>
  )
}
