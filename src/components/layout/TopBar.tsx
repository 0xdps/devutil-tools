import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { BookOpen, ChevronRight, Heart, MoreHorizontal, Search, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { GithubIcon } from '@/components/icons'
import { PrivacyDialog, SupportDialog } from '@/components/SiteDialogs'
import { categories, getToolByPath } from '@/tools/registry'
import { useCommandPalette } from './command-palette-context'
import { site } from '@/config/site'

type SiteModal = 'privacy' | 'support'

export function TopBar() {
  const { pathname } = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { setOpen: setPaletteOpen } = useCommandPalette()
  const tool = getToolByPath(pathname)
  const category = tool ? categories.find((c) => c.id === tool.category) : undefined

  // Dialogs are addressable (?modal=privacy) so they can be linked to.
  const modal = searchParams.get('modal') as SiteModal | null
  const setModal = (next: SiteModal | null) => {
    const params = new URLSearchParams(searchParams)
    if (next) params.set('modal', next)
    else params.delete('modal')
    setSearchParams(params, { replace: !next })
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-4">
      <SidebarTrigger className="-ml-1" />
      <div aria-hidden className="mx-1 h-4 w-px shrink-0 bg-border" />

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <li>
            <Link to="/" className="transition-colors hover:text-foreground">
              Tools
            </Link>
          </li>
          {category && (
            <li className="hidden items-center gap-1.5 sm:flex">
              <ChevronRight className="size-3.5" />
              <span>{category.label}</span>
            </li>
          )}
          {tool && (
            <li className="flex min-w-0 items-center gap-1.5">
              <ChevronRight className="size-3.5 shrink-0" />
              <span className="truncate font-medium text-foreground" aria-current="page">
                {tool.name}
              </span>
            </li>
          )}
        </ol>
      </nav>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Search tools" onClick={() => setPaletteOpen(true)}>
          <Search />
        </Button>
        <ThemeToggle />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" asChild>
              <a href={site.repoUrl} target="_blank" rel="noopener noreferrer" aria-label="Source on GitHub">
                <GithubIcon className="size-4" />
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Source on GitHub</TooltipContent>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={() => setModal('privacy')}>
              <ShieldCheck /> Privacy
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setModal('support')}>
              <Heart /> Support
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/contribute">
                <BookOpen /> Contribute
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <PrivacyDialog open={modal === 'privacy'} onOpenChange={(o) => setModal(o ? 'privacy' : null)} />
      <SupportDialog open={modal === 'support'} onOpenChange={(o) => setModal(o ? 'support' : null)} />
    </header>
  )
}
