import { forwardRef, useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ToolPanelProps {
  title: ReactNode
  /** Right-aligned header content: copy, clear, counters… */
  actions?: ReactNode
  /** Small text under the body: byte counts, hints. */
  footer?: ReactNode
  children: (labelId: string) => ReactNode
  className?: string
}

/** A titled surface for one input or output. Children receive the title's id
 *  so the inner control can use aria-labelledby. */
export function ToolPanel({ title, actions, footer, children, className }: ToolPanelProps) {
  const labelId = useId()
  return (
    <section className={cn('flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card shadow-xs', className)}>
      <div className="flex h-11 items-center justify-between gap-2 border-b px-3">
        <h2 id={labelId} className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {title}
        </h2>
        <div className="flex items-center gap-1">{actions}</div>
      </div>
      <div className="flex flex-1 flex-col">{children(labelId)}</div>
      {footer && <div className="border-t px-3 py-1.5 text-xs text-muted-foreground">{footer}</div>}
    </section>
  )
}

/** Monospace, borderless textarea that fills a ToolPanel. */
export const CodeArea = forwardRef<HTMLTextAreaElement, ComponentProps<'textarea'>>(function CodeArea(
  { className, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      spellCheck={false}
      autoCapitalize="off"
      autoComplete="off"
      autoCorrect="off"
      className={cn(
        'min-h-56 w-full flex-1 resize-y bg-code px-3 py-2.5 font-mono text-[13px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:bg-background read-only:focus-visible:bg-code md:min-h-72',
        className,
      )}
      {...props}
    />
  )
})
