import type { ReactNode } from 'react'
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

export interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
}

/**
 * A single-choice switch that looks like a tab list. Use it when the choice
 * changes a mode rather than revealing a separate panel: it is announced as
 * a radio group, so it doesn't need tab panels the way real tabs do.
 */
export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  label,
  size = 'default',
  className,
}: {
  value: T
  onValueChange: (value: T) => void
  options: SegmentOption<T>[]
  /** Accessible name for the group. */
  label: string
  size?: 'default' | 'sm'
  className?: string
}) {
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      value={value}
      onValueChange={(v) => v && onValueChange(v as T)}
      aria-label={label}
      className={cn('inline-flex flex-wrap items-center rounded-lg bg-muted p-[3px] text-muted-foreground', className)}
    >
      {options.map((o) => (
        <ToggleGroupPrimitive.Item
          key={o.value}
          value={o.value}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm dark:data-[state=on]:bg-input/30 [&_svg]:size-4 [&_svg]:shrink-0',
            size === 'sm' ? 'h-6 px-2 text-xs' : 'h-8 px-3 text-sm',
          )}
        >
          {o.label}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  )
}
