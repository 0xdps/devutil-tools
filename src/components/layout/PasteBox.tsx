import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ArrowRight, ClipboardPaste, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { detectContent, type Suggestion } from '@/lib/detect'
import { useOpenSuggestion } from '@/hooks/use-open-suggestion'
import { getToolById } from '@/tools/registry'

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))

const FALLBACKS: Suggestion[] = [
  { toolId: 'text-utilities', action: 'Change case & count', kind: 'Text', input: {} },
  { toolId: 'encoding', action: 'Encode', kind: 'Text', input: {} },
]

/**
 * "Paste anything": detects what the content is and offers the right tools.
 * ⌘V anywhere on the page (outside a field) pastes here.
 */
export function PasteBox() {
  const id = useId()
  const [text, setText] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)
  const open = useOpenSuggestion()
  const suggestions = useMemo(() => detectContent(text), [text])

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e.target)) return
      const pasted = e.clipboardData?.getData('text/plain')
      if (!pasted) return
      e.preventDefault()
      setText(pasted)
      ref.current?.focus()
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [])

  const shown = text.trim() ? (suggestions.length ? suggestions : FALLBACKS.map((f) => ({ ...f, input: { text, input: text } }))) : []

  return (
    <div className="w-full max-w-xl space-y-2">
      <div className="relative rounded-xl border bg-card shadow-xs focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
        <label htmlFor={id} className="sr-only">
          Paste anything
        </label>
        <ClipboardPaste className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" />
        <textarea
          ref={ref}
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={text.includes('\n') ? 4 : 1}
          placeholder="Or paste anything: a JWT, JSON, timestamp, URL, hash, color…"
          spellCheck={false}
          className="block max-h-40 min-h-11 w-full resize-none bg-transparent py-2.5 pr-9 pl-9 font-mono text-[13px] leading-relaxed outline-none placeholder:font-sans placeholder:text-sm placeholder:text-muted-foreground"
        />
        {text && (
          <Button variant="ghost" size="icon-xs" className="absolute top-2.5 right-2" aria-label="Clear" onClick={() => setText('')}>
            <X />
          </Button>
        )}
      </div>
      {shown.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-live="polite">
          <span className="text-xs text-muted-foreground">{suggestions.length ? `Looks like ${suggestions[0].kind}:` : 'Not sure what this is. Try:'}</span>
          {shown.map((s, i) => {
            const tool = getToolById(s.toolId)
            if (!tool) return null
            const Icon = tool.icon
            return (
              <Button key={`${s.toolId}${s.tab ?? ''}${i}`} variant={i === 0 && suggestions.length ? 'default' : 'outline'} size="sm" onClick={() => open(s)}>
                <Icon /> {s.action}
                {i === 0 && suggestions.length > 0 && <ArrowRight />}
              </Button>
            )
          })}
        </div>
      )}
    </div>
  )
}
