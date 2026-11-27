import { Link, useLocation } from 'react-router-dom'
import { LayoutGrid, Lock, Search, Star } from 'lucide-react'
import Logo from '@/components/Logo'
import { Kbd } from '@/components/ui/kbd'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { getToolById, getToolByPath, toolsByCategory, type ToolDefinition } from '@/tools/registry'
import { useFavorites } from '@/hooks/use-tool-prefs'
import { useCommandPalette } from './command-palette-context'
import { site } from '@/config/site'
import { cn } from '@/lib/utils'
import { modKey } from '@/lib/platform'

function ToolMenuItem({ tool, activeId }: { tool: ToolDefinition; activeId?: string }) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const { isMobile, setOpenMobile } = useSidebar()
  const Icon = tool.icon
  const favorite = isFavorite(tool.id)

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={activeId === tool.id} tooltip={tool.name}>
        <Link to={tool.path} onClick={() => isMobile && setOpenMobile(false)}>
          <Icon />
          <span>{tool.name}</span>
        </Link>
      </SidebarMenuButton>
      <SidebarMenuAction
        showOnHover={!favorite}
        onClick={() => toggleFavorite(tool.id)}
        aria-label={favorite ? `Remove ${tool.name} from favorites` : `Add ${tool.name} to favorites`}
        aria-pressed={favorite}
      >
        <Star className={cn(favorite && 'fill-warning text-warning')} />
      </SidebarMenuAction>
    </SidebarMenuItem>
  )
}

export function AppSidebar() {
  const { pathname } = useLocation()
  const { favorites } = useFavorites()
  const { setOpen: setPaletteOpen } = useCommandPalette()
  const { isMobile, setOpenMobile } = useSidebar()
  const activeId = getToolByPath(pathname)?.id
  const favoriteTools = favorites
    .map(getToolById)
    .filter((t): t is ToolDefinition => !!t && !t.hidden)

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="gap-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip={site.name}>
              <Link to="/" onClick={() => isMobile && setOpenMobile(false)}>
                <Logo className="size-8! shrink-0 rounded-md" />
                <div className="grid leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="font-semibold tracking-tight">{site.name}</span>
                  <span className="text-xs text-muted-foreground">Developer utilities</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Search tools"
              onClick={() => setPaletteOpen(true)}
              className="border border-sidebar-border bg-background text-muted-foreground shadow-xs hover:text-foreground"
            >
              <Search />
              <span className="flex-1">Search tools…</span>
              <Kbd className="group-data-[collapsible=icon]:hidden">{modKey} K</Kbd>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/'} tooltip="All tools">
                  <Link to="/" onClick={() => isMobile && setOpenMobile(false)}>
                    <LayoutGrid />
                    <span>All tools</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {favoriteTools.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Favorites</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {favoriteTools.map((tool) => (
                  <ToolMenuItem key={tool.id} tool={tool} activeId={activeId} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {toolsByCategory().map(({ category, tools }) => (
          <SidebarGroup key={category.id}>
            <SidebarGroupLabel>{category.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {tools.map((tool) => (
                  <ToolMenuItem key={tool.id} tool={tool} activeId={activeId} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <Lock className="size-3.5 shrink-0 text-success" />
          <span className="group-data-[collapsible=icon]:hidden">Runs locally in your browser</span>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
