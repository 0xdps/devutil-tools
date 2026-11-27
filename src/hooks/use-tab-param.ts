import { useCallback, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getToolByPath } from '@/tools/registry'

/**
 * The active tab of a tool, stored in the path (`/generators/uuid`) so every
 * tab has its own linkable, indexable URL. The first tab is the tool's base
 * path. Legacy `?tab=x` links are redirected to the path form.
 */
export function useTabParam<T extends string>(tabs: readonly T[]): [T, (tab: string) => void] {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const tool = getToolByPath(pathname)
  const base = tool?.path ?? pathname
  const segment = pathname.length > base.length ? pathname.slice(base.length + 1).replace(/\/+$/, '') : ''
  const tab = (tabs as readonly string[]).includes(segment) ? (segment as T) : tabs[0]

  if (import.meta.env.DEV && tool && tool.tabs?.join() !== tabs.join()) {
    console.warn(`[registry] tabs for "${tool.id}" (${tool.tabs?.join()}) don't match the page (${tabs.join()})`)
  }

  const hrefFor = useCallback(
    (next: string, keepSearch: string) => `${next === tabs[0] ? base : `${base}/${next}`}${keepSearch}`,
    [base, tabs],
  )

  // ?tab=cron → /timestamp-tools/cron (old links and bookmarks)
  useEffect(() => {
    const params = new URLSearchParams(search)
    const legacy = params.get('tab')
    if (!legacy) return
    params.delete('tab')
    const rest = params.toString()
    const target = (tabs as readonly string[]).includes(legacy) ? legacy : tab
    navigate(hrefFor(target, rest ? `?${rest}` : ''), { replace: true })
  }, [search, tabs, tab, hrefFor, navigate])

  const setTab = useCallback(
    (next: string) => {
      if (next === tab) return
      navigate(hrefFor(next, search), { replace: true })
    },
    [tab, search, hrefFor, navigate],
  )

  return [tab, setTab]
}
