import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Offers to reload when a new version of the app has been downloaded. */
export default function PWAUpdatePrompt() {
  const [dismissed, setDismissed] = useState(false)
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      // Check for updates hourly while the app stays open.
      if (registration) setInterval(() => registration.update(), 60 * 60 * 1000)
    },
  })

  useEffect(() => {
    if (needRefresh) setDismissed(false)
  }, [needRefresh])

  if (!needRefresh || dismissed) return null

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-xl border bg-popover px-4 py-3 text-sm text-popover-foreground shadow-lg"
    >
      <RefreshCw className="size-4 shrink-0 text-primary" />
      <span className="flex-1">A new version of DevUtil is ready.</span>
      <Button size="sm" onClick={() => updateServiceWorker(true)}>
        Update
      </Button>
      <Button variant="ghost" size="icon-sm" onClick={() => setDismissed(true)} aria-label="Dismiss">
        <X />
      </Button>
    </div>
  )
}
