import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { trackCopy } from '@/utils/analytics'

interface CopyButtonProps {
  value: string
  label?: string
  /** Analytics tool name; omitted means no event. */
  toolName?: string
  size?: 'sm' | 'xs'
}

/** Copies `value`, confirms inline (icon flips to a check) without a toast. */
export function CopyButton({ value, label = 'Copy', toolName, size = 'xs' }: CopyButtonProps) {
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

  return (
    <Button variant="ghost" size={size} onClick={copy} disabled={!value} aria-live="polite">
      {copied ? <Check className="text-success" /> : <Copy />}
      {copied ? 'Copied' : label}
    </Button>
  )
}
