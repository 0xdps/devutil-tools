import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { encodeShare, MAX_SHARE_URL } from '@/lib/share'
import { trackCopy } from '@/utils/analytics'
import { ToolActionsContext, type ShareRegistration, type ToolActions } from './tool-actions'

/**
 * Holds the current tool's output and share registration, and owns the
 * tool-level shortcuts: ⌥⇧C copies the output, ⌥⇧S copies a share link.
 * Mounted once per tool (keyed by tool id) above the page, so pages can
 * register from their own hooks.
 */
export function ToolActionsProvider({ toolId, children }: { toolId: string; children: ReactNode }) {
  const outputRef = useRef('')
  const shareRef = useRef<ShareRegistration | null>(null)
  const [canShare, setCanShare] = useState(false)
  const [loadedFromShare, setLoadedFromShare] = useState(false)

  const share = useCallback(async () => {
    const registration = shareRef.current
    if (!registration) return
    const url = `${window.location.origin}${window.location.pathname}#s=${await encodeShare(registration.getState())}`
    if (url.length > MAX_SHARE_URL) {
      toast.error('Too much content for a link. Shorten the input, or copy and send the content itself.')
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Share link copied', {
        description: registration.note ?? 'The content is inside the link (after #). It is never sent to our server.',
      })
    } catch {
      toast.error('Could not copy the link. Your browser blocked clipboard access.')
    }
  }, [])

  const copyOutput = useCallback(async () => {
    const value = outputRef.current
    if (!value) {
      toast('Nothing to copy yet')
      return
    }
    try {
      await navigator.clipboard.writeText(value)
      toast.success('Output copied')
      trackCopy(toolId, value.length)
    } catch {
      toast.error('Could not copy. Your browser blocked clipboard access.')
    }
  }, [toolId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ⌥⇧C / ⌥⇧S. Match e.code: on macOS ⌥ changes the typed character.
      if (!e.altKey || !e.shiftKey || e.metaKey || e.ctrlKey) return
      if (e.code === 'KeyC') {
        e.preventDefault()
        void copyOutput()
      } else if (e.code === 'KeyS' && shareRef.current) {
        e.preventDefault()
        void share()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [copyOutput, share])

  const setOutput = useCallback((v: string) => {
    outputRef.current = v
  }, [])
  const setShare = useCallback((s: ShareRegistration | null) => {
    shareRef.current = s
    setCanShare(!!s)
  }, [])
  const markLoadedFromShare = useCallback(() => setLoadedFromShare(true), [])
  const dismissSharedNotice = useCallback(() => setLoadedFromShare(false), [])

  const value = useMemo<ToolActions>(
    () => ({ setOutput, setShare, markLoadedFromShare, canShare, loadedFromShare, dismissSharedNotice, share, copyOutput }),
    [setOutput, setShare, markLoadedFromShare, canShare, loadedFromShare, dismissSharedNotice, share, copyOutput],
  )

  return <ToolActionsContext.Provider value={value}>{children}</ToolActionsContext.Provider>
}
