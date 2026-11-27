import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { decodeShare, shareParam } from '@/lib/share'

export interface ShareRegistration {
  getState: () => unknown
  /** Shown after copying, e.g. "This link contains your code". */
  note?: string
}

/** Provided once per tool page by <ToolActionsProvider> in the app shell. */
export interface ToolActions {
  setOutput: (value: string) => void
  setShare: (share: ShareRegistration | null) => void
  markLoadedFromShare: () => void
  /** For ToolPage's header and banner. */
  canShare: boolean
  loadedFromShare: boolean
  dismissSharedNotice: () => void
  share: () => Promise<void>
  copyOutput: () => Promise<void>
}

export const ToolActionsContext = createContext<ToolActions | null>(null)

export function useToolActions() {
  return useContext(ToolActionsContext)
}

/** Registers the tool's main output for "Copy output" (⌥⇧C). */
export function useToolOutput(value: string) {
  const ctx = useContext(ToolActionsContext)
  const setOutput = ctx?.setOutput
  useEffect(() => {
    setOutput?.(value)
  }, [setOutput, value])
}

export type InputSource = 'share' | 'paste'

/** Router state used to hand pasted content to a tool (never put in the URL). */
export interface IncomingState {
  incoming?: Record<string, unknown>
}

/**
 * Applies content handed over by smart paste (router state), once, then
 * clears it so a refresh or back-navigation doesn't re-apply it.
 */
export function useIncomingInput<T extends object>(apply: (value: Partial<T>) => void) {
  const location = useLocation()
  const navigate = useNavigate()
  const applyRef = useRef(apply)
  applyRef.current = apply
  const incoming = (location.state as IncomingState | null)?.incoming
  useEffect(() => {
    if (!incoming) return
    applyRef.current(incoming as Partial<T>)
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [incoming, location.pathname, location.search, navigate])
}

/**
 * Makes the tool shareable: `state` is encoded into a #s= link on demand, and
 * a link opened with #s= is decoded and passed to `apply` once on load.
 * Returns true when the current content came from a shared link.
 */
export function useShareState<T extends object>(
  state: T,
  apply: (state: T, source: InputSource) => void,
  { isValid, note }: { isValid?: (value: unknown) => value is T; note?: string } = {},
): boolean {
  const ctx = useContext(ToolActionsContext)
  const setShare = ctx?.setShare
  const markLoaded = ctx?.markLoadedFromShare
  const stateRef = useRef(state)
  stateRef.current = state
  const applyRef = useRef(apply)
  applyRef.current = apply
  const [fromShare, setFromShare] = useState(false)

  useEffect(() => {
    setShare?.({ getState: () => stateRef.current, note })
    return () => setShare?.(null)
  }, [setShare, note])

  // Apply an incoming share link once.
  useEffect(() => {
    const encoded = shareParam(window.location.hash)
    if (!encoded) return
    let cancelled = false
    decodeShare(encoded)
      .then((value) => {
        if (cancelled) return
        const valid = isValid ? isValid(value) : typeof value === 'object' && value !== null && !Array.isArray(value)
        if (!valid) throw new Error('invalid')
        applyRef.current({ ...stateRef.current, ...(value as T) }, 'share')
        setFromShare(true)
        markLoaded?.()
      })
      .catch(() => {
        /* a corrupt link just leaves the tool as it was */
      })
      .finally(() => {
        // Drop the fragment so a refresh doesn't overwrite later edits.
        if (!cancelled) history.replaceState(history.state, '', window.location.pathname + window.location.search)
      })
    return () => {
      cancelled = true
    }
    // Run once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Smart paste hands content over the same way, minus the shared-link notice.
  useIncomingInput<T>((value) => applyRef.current({ ...stateRef.current, ...value }, 'paste'))

  return fromShare
}
