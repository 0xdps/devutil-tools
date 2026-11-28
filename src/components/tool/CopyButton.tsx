import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { trackCopy } from '@/utils/analytics'

interface CopyButtonProps {
  value: string
  label?: string
  /** Icon-only variant with a tooltip; `label` becomes the accessible name. */
  iconOnly?: boolean
  /** Analytics tool name; omitted means no event. */
  toolName?: string
}

/** Copies `value` and confirms inline (icon flips to a check). No toast. */
export function CopyButton({ value, label = 'Copy', iconOnly = false, toolName }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(t)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      if (toolName) trackCopy(toolName, value.length)
    } catch {
      toast.error('Could not copy. Your browser blocked clipboard access.')
    }
  }

  const icon = copied ? <Check className="text-success" /> : <Copy />

  if (iconOnly) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-xs" onClick={copy} disabled={!value} aria-label={copied ? 'Copied' : label}>
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{copied ? 'Copied' : label}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Button variant="ghost" size="xs" onClick={copy} disabled={!value} aria-live="polite">
      {icon}
      {copied ? 'Copied' : label}
    </Button>
  )
}
