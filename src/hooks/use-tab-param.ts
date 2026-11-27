import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * A tab selection stored in `?tab=` so tabs are linkable and survive reloads.
 * The first tab is the default and is omitted from the URL.
 */
export function useTabParam<T extends string>(tabs: readonly T[]): [T, (tab: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('tab')
  const tab = (tabs as readonly string[]).includes(requested ?? '') ? (requested as T) : tabs[0]

  const setTab = useCallback(
    (next: string) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev)
          if (next === tabs[0]) params.delete('tab')
          else params.set('tab', next)
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams, tabs],
  )

  return [tab, setTab]
}
