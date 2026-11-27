import { useEffect, useRef } from 'react'
import { ChevronRight, CircleAlert, Info, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ConsoleLevel } from '@/lib/js-sandbox'

export interface ConsoleEntry {
  id: number
  level: ConsoleLevel | 'system'
  text: string
}

const STYLES: Record<ConsoleEntry['level'], string> = {
  log: '',
  debug: 'text-muted-foreground',
  info: 'text-primary',
  warn: 'bg-warning/10 text-warning',
  error: 'bg-destructive/10 text-destructive',
  result: 'text-muted-foreground',
  system: 'text-muted-foreground italic',
}

function Icon({ level }: { level: ConsoleEntry['level'] }) {
  if (level === 'error') return <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
  if (level === 'warn') return <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
  if (level === 'info') return <Info className="mt-0.5 size-3.5 shrink-0" />
  if (level === 'result') return <ChevronRight className="mt-0.5 size-3.5 shrink-0" />
  return <span className="w-3.5 shrink-0" />
}

/** Console output with levels; auto-scrolls to the newest entry. */
export function ConsolePanel({ entries, onClear, className }: { entries: ConsoleEntry[]; onClear: () => void; className?: string }) {
  const logRef = useRef<HTMLDivElement>(null)
  // Scroll only the log itself (scrollIntoView would also scroll the page).
  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [entries.length])
  const errors = entries.filter((e) => e.level === 'error').length

  return (
    <section className={cn('flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card shadow-xs', className)} aria-label="Console">
      <div className="flex h-11 items-center justify-between gap-2 border-b px-3">
        <h2 className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Console
          {errors > 0 && <span className="rounded-full bg-destructive/15 px-1.5 text-[11px] text-destructive normal-case">{errors} error{errors > 1 ? 's' : ''}</span>}
        </h2>
        <Button variant="ghost" size="xs" onClick={onClear} disabled={!entries.length}>
          Clear
        </Button>
      </div>
      <div ref={logRef} className="min-h-40 flex-1 overflow-auto bg-code font-mono text-[13px]" role="log" aria-live="polite">
        {entries.length === 0 ? (
          <p className="px-3 py-2 font-sans text-sm text-muted-foreground">Output from console.log() appears here.</p>
        ) : (
          entries.map((e) => (
            <div key={e.id} className={cn('flex gap-2 border-b border-border/50 px-3 py-1 whitespace-pre-wrap break-words', STYLES[e.level])}>
              <Icon level={e.level} />
              <span className="min-w-0 flex-1">{e.text}</span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
