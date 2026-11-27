import type { ReactNode } from 'react'
import { CircleAlert, CircleCheck, CircleDashed, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StatusTone = 'success' | 'danger' | 'warning' | 'neutral'

const tones: Record<StatusTone, { className: string; icon: typeof CircleCheck }> = {
  success: { className: 'border-success/30 bg-success/10 text-success', icon: CircleCheck },
  danger: { className: 'border-destructive/30 bg-destructive/10 text-destructive', icon: CircleAlert },
  warning: { className: 'border-warning/40 bg-warning/10 text-warning', icon: Clock },
  neutral: { className: 'border-border bg-muted text-muted-foreground', icon: CircleDashed },
}

/** Compact status label: icon + text, colored by tone (never color alone). */
export function StatusPill({ tone, children, className }: { tone: StatusTone; children: ReactNode; className?: string }) {
  const { className: toneClass, icon: Icon } = tones[tone]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', toneClass, className)}>
      <Icon className="size-3.5 shrink-0" />
      {children}
    </span>
  )
}
