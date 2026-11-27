import type { ReactNode } from 'react'
import { Link2, Share2, Star, X } from 'lucide-react'
import SEO from '@/components/SEO'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useLocation } from 'react-router-dom'
import { toolMeta } from '@/tools/catalog'
import { useFavorites } from '@/hooks/use-tool-prefs'
import { getToolById } from '@/tools/registry'
import { cn } from '@/lib/utils'
import { useToolActions } from './tool-actions'

interface ToolPageProps {
  /** Registry id; supplies the name, icon and description. */
  toolId: string
  /** Extra header actions, shown left of Share and the favorite star. */
  actions?: ReactNode
  /** Reference/help content rendered below the tool. */
  reference?: ReactNode
  children: ReactNode
  className?: string
}

/** Standard frame for every tool: SEO, header (share, favorite), shared-link notice, body, reference. */
export function ToolPage({ toolId, actions, reference, children, className }: ToolPageProps) {
  const tool = getToolById(toolId)
  const { pathname } = useLocation()
  const { isFavorite, toggleFavorite } = useFavorites()
  const toolActions = useToolActions()
  if (!tool) throw new Error(`Unknown tool id "${toolId}"`)
  const Icon = tool.icon
  const favorite = isFavorite(tool.id)

  return (
    <>
      <SEO meta={toolMeta(tool, pathname.slice(tool.path.length + 1).replace(/\/+$/, '') || undefined)} />
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
            {toolActions?.canShare && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => void toolActions.share()} aria-label="Copy share link">
                    <Share2 />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy share link (⌥⇧S)</TooltipContent>
              </Tooltip>
            )}
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

        {toolActions?.loadedFromShare && (
          <div role="status" className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
            <Link2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="flex-1">
              Opened from a shared link. The content came from whoever sent it, so review it before running or relying on it.
            </p>
            <Button variant="ghost" size="icon-xs" aria-label="Dismiss" onClick={toolActions.dismissSharedNotice}>
              <X />
            </Button>
          </div>
        )}

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
