import { useEffect, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppSidebar } from './AppSidebar'
import { TopBar } from './TopBar'
import { CommandPaletteProvider } from './CommandPalette'
import { RouteErrorBoundary } from './RouteErrorBoundary'
import { usePageView } from '@/hooks/usePageView'
import { recordRecent } from '@/hooks/use-tool-prefs'
import { getToolByPath } from '@/tools/registry'
import { site } from '@/config/site'

/** The sidebar component persists its state in this cookie. */
function readSidebarOpen(): boolean {
  if (typeof document === 'undefined') return true
  const match = document.cookie.match(/(?:^|;\s*)sidebar_state=(true|false)/)
  return match ? match[1] === 'true' : true
}

function SiteFooter() {
  return (
    <footer className="border-t px-4 py-4 text-xs text-muted-foreground sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 sm:flex-row">
        <p>
          © {new Date().getFullYear()} {site.fullName}. Open source, free forever.
        </p>
        <nav className="flex items-center gap-4">
          <Link to="?modal=support" className="hover:text-foreground">
            Support
          </Link>
          <Link to="/contribute" className="hover:text-foreground">
            Contribute
          </Link>
          <a href={site.repoUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
            GitHub
          </a>
          <a href={site.authorUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
            Made by 0xdps
          </a>
        </nav>
      </div>
    </footer>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  usePageView()

  useEffect(() => {
    const tool = getToolByPath(pathname)
    if (tool && !tool.hidden) recordRecent(tool.id)
  }, [pathname])

  return (
    <TooltipProvider delayDuration={300}>
      <CommandPaletteProvider>
        <SidebarProvider defaultOpen={readSidebarOpen()}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:ring-2 focus:ring-ring"
          >
            Skip to content
          </a>
          <AppSidebar />
          <SidebarInset className="min-w-0">
            <TopBar />
            <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:py-8">
              <RouteErrorBoundary resetKey={pathname}>{children}</RouteErrorBoundary>
            </main>
            <SiteFooter />
          </SidebarInset>
        </SidebarProvider>
      </CommandPaletteProvider>
    </TooltipProvider>
  )
}
