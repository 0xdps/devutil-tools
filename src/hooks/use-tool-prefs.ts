import { useCallback, useSyncExternalStore } from 'react'

/**
 * Favorites and recently used tools, persisted in localStorage and shared
 * across every component (sidebar, home, palette) via one tiny store.
 */

const FAVORITES_KEY = 'devutil:favorites'
const RECENTS_KEY = 'devutil:recents'
const MAX_RECENTS = 6

type Listener = () => void

function createListStore(key: string) {
  let cache: string[] | null = null
  const listeners = new Set<Listener>()
  const EMPTY: string[] = []

  const read = (): string[] => {
    if (cache) return cache
    try {
      const raw = localStorage.getItem(key)
      const parsed: unknown = raw ? JSON.parse(raw) : []
      cache = Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
    } catch {
      cache = []
    }
    return cache
  }

  const write = (next: string[]) => {
    cache = next
    try {
      localStorage.setItem(key, JSON.stringify(next))
    } catch {
      // Storage unavailable (private mode, quota): keep in-memory state only.
    }
    listeners.forEach((l) => l())
  }

  const subscribe = (listener: Listener) => {
    listeners.add(listener)
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
        cache = null
        listener()
      }
    }
    window.addEventListener('storage', onStorage)
    return () => {
      listeners.delete(listener)
      window.removeEventListener('storage', onStorage)
    }
  }

  return {
    subscribe,
    getSnapshot: read,
    getServerSnapshot: () => EMPTY,
    get: read,
    set: write,
  }
}

const favoritesStore = createListStore(FAVORITES_KEY)
const recentsStore = createListStore(RECENTS_KEY)

export function useFavorites() {
  const favorites = useSyncExternalStore(
    favoritesStore.subscribe,
    favoritesStore.getSnapshot,
    favoritesStore.getServerSnapshot,
  )

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites])

  const toggleFavorite = useCallback((id: string) => {
    const current = favoritesStore.get()
    favoritesStore.set(current.includes(id) ? current.filter((f) => f !== id) : [...current, id])
  }, [])

  return { favorites, isFavorite, toggleFavorite }
}

export function useRecents() {
  return useSyncExternalStore(recentsStore.subscribe, recentsStore.getSnapshot, recentsStore.getServerSnapshot)
}

export function recordRecent(id: string) {
  const current = recentsStore.get()
  if (current[0] === id) return
  recentsStore.set([id, ...current.filter((r) => r !== id)].slice(0, MAX_RECENTS))
}
