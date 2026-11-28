/**
 * UI bindings for the tool catalog: icon and lazily loaded page per tool.
 * Routes, the sidebar, the home page and the ⌘K palette are all derived
 * from here; the data itself (names, paths, tabs, SEO) lives in catalog.ts.
 */
import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import {
  ArrowLeftRight,
  Binary,
  Braces,
  Clock,
  CodeXml,
  Dices,
  FileText,
  GitCompareArrows,
  Globe,
  Hash,
  KeyRound,
  Link,
  Palette,
  QrCode,
  Regex,
  SquareTerminal,
  Tags,
  Type,
  type LucideIcon,
} from 'lucide-react'
import { catalog, categories, toolPath, type CatalogTool } from './catalog'

export { categories }
export type { CategoryId, ToolCategory, ToolFeature, ToolStatus } from './catalog'

export interface ToolDefinition extends CatalogTool {
  icon: LucideIcon
  component: LazyExoticComponent<ComponentType>
}

const BINDINGS: Record<string, { icon: LucideIcon; component: LazyExoticComponent<ComponentType> }> = {
  'data-transform': { icon: ArrowLeftRight, component: lazy(() => import('@/pages/DataTransform')) },
  'encoding': { icon: Binary, component: lazy(() => import('@/pages/Encoding')) },
  'url-tools': { icon: Link, component: lazy(() => import('@/pages/URLTools')) },
  'code-json': { icon: Braces, component: lazy(() => import('@/pages/CodeAndJSONTools')) },
  'text-utilities': { icon: Type, component: lazy(() => import('@/pages/TextUtilities')) },
  'text-diff': { icon: GitCompareArrows, component: lazy(() => import('@/pages/CodeDiff')) },
  'regex-tester': { icon: Regex, component: lazy(() => import('@/pages/RegexTester')) },
  'jwt-decoder': { icon: KeyRound, component: lazy(() => import('@/pages/JWTDecoder')) },
  'hash-verify': { icon: Hash, component: lazy(() => import('@/pages/HashVerify')) },
  'generators': { icon: Dices, component: lazy(() => import('@/pages/GeneratorToolkit')) },
  'color-picker': { icon: Palette, component: lazy(() => import('@/pages/ColorPicker')) },
  'qr-code': { icon: QrCode, component: lazy(() => import('@/pages/QRCodeGenerator')) },
  'seo-generator': { icon: Tags, component: lazy(() => import('@/pages/SEOGenerator')) },
  'timestamp-tools': { icon: Clock, component: lazy(() => import('@/pages/TimestampTools')) },
  'timezone-compare': { icon: Globe, component: lazy(() => import('@/pages/TimezoneCompare')) },
  'markdown-previewer': { icon: FileText, component: lazy(() => import('@/pages/MarkdownPreviewer')) },
  'html-playground': { icon: CodeXml, component: lazy(() => import('@/pages/HTMLPlayground')) },
  'js-runner': { icon: SquareTerminal, component: lazy(() => import('@/pages/JavaScriptRunner')) },
}

export const tools: ToolDefinition[] = catalog.map((tool) => {
  const binding = BINDINGS[tool.id]
  if (!binding) throw new Error(`No icon/page bound for tool "${tool.id}"`)
  return { ...tool, ...binding }
})

export const visibleTools = tools.filter((t) => !t.hidden)

export function getToolById(id: string): ToolDefinition | undefined {
  return tools.find((t) => t.id === id)
}

/** Finds the tool for a path, including tab sub-routes (`/generators/uuid`). */
export function getToolByPath(pathname: string): ToolDefinition | undefined {
  const clean = pathname.replace(/\/+$/, '') || '/'
  return tools.find(
    (t) => t.path === clean || (t.tabs && clean.startsWith(`${t.path}/`) && t.tabs.includes(clean.slice(t.path.length + 1))),
  )
}

/** URL of a tool, optionally at a tab (the default tab has no suffix). */
export const toolHref: (tool: CatalogTool, tab?: string) => string = toolPath

export function toolsByCategory(list: ToolDefinition[] = visibleTools) {
  return categories
    .map((category) => ({ category, tools: list.filter((t) => t.category === category.id) }))
    .filter((group) => group.tools.length > 0)
}
