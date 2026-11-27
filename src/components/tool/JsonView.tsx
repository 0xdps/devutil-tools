import { useMemo } from 'react'
import { cn } from '@/lib/utils'

const TOKEN = /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g

function classFor(token: string): string {
  if (token.startsWith('"')) return token.trimEnd().endsWith(':') ? 'text-primary' : 'text-success'
  if (token === 'true' || token === 'false' || token === 'null') return 'text-chart-4'
  return 'text-warning'
}

/** Pretty-printed, syntax-colored JSON. Renders spans (no innerHTML). */
export function JsonView({ value, className }: { value: unknown; className?: string }) {
  const nodes = useMemo(() => {
    const text = JSON.stringify(value, null, 2) ?? 'undefined'
    const out: React.ReactNode[] = []
    let last = 0
    for (const match of text.matchAll(TOKEN)) {
      const start = match.index
      if (start > last) out.push(text.slice(last, start))
      const token = match[0]
      if (match[2]) {
        // key: color the quoted name, leave the colon plain
        const name = token.slice(0, token.lastIndexOf('"') + 1)
        out.push(
          <span key={start} className="text-primary">
            {name}
          </span>,
          token.slice(name.length),
        )
      } else {
        out.push(
          <span key={start} className={classFor(token)}>
            {token}
          </span>,
        )
      }
      last = start + token.length
    }
    if (last < text.length) out.push(text.slice(last))
    return out
  }, [value])

  return (
    <pre className={cn('overflow-auto bg-code px-3 py-2.5 font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-words', className)}>
      <code>{nodes}</code>
    </pre>
  )
}
