import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Eraser, FlaskConical, Link2, Plus, Trash2 } from 'lucide-react'
import { ToolPage } from '@/components/tool/ToolPage'
import { useShareState, useToolOutput } from '@/components/tool/tool-actions'
import { CodeArea, ToolPanel } from '@/components/tool/ToolPanel'
import { CopyButton } from '@/components/tool/CopyButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toolsMetadata } from '@/config/seoConfig'
import { parseUrl, urlParts, withParams, type ParsedUrl, type QueryParam } from '@/lib/url'

const EXAMPLE = 'https://api.example.com:8080/v1/search?q=caf%C3%A9%20menu&tag=coffee&tag=paris&page=2#results'

function tryParse(input: string): { parsed?: ParsedUrl; error?: string } {
  if (!input.trim()) return {}
  try {
    return { parsed: parseUrl(input) }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

export default function URLTools() {
  const [input, setInput] = useState('')
  // Rows are a draft so a half-typed new parameter (empty key) survives edits.
  const [rows, setRows] = useState<QueryParam[]>([])
  const { parsed, error } = useMemo(() => tryParse(input), [input])

  const setUrlText = (text: string) => {
    setInput(text)
    setRows(tryParse(text).parsed?.params ?? [])
  }

  const updateRows = (next: QueryParam[]) => {
    setRows(next)
    if (parsed) setInput(withParams(parsed.url, next))
  }

  const parts = parsed ? urlParts(parsed.url) : []
  useToolOutput(parsed?.url.href ?? '')
  useShareState({ input }, (s) => setUrlText(String(s.input ?? '')))

  return (
    <ToolPage
      toolId="url-tools"
      meta={toolsMetadata.urlTools}
      reference={
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Parameters are shown decoded. When you edit them the query string is rebuilt with standard form encoding
            (spaces become <code>+</code>).
          </li>
          <li>Repeated keys (<code>?tag=a&amp;tag=b</code>) are kept in order, as servers receive them.</li>
          <li>
            Need to percent-encode a single value?{' '}
            <Link to="/encoding?scheme=url" className="text-primary underline-offset-4 hover:underline">
              Use Encode / Decode
            </Link>
            .
          </li>
        </ul>
      }
    >
      <ToolPanel
        title="URL"
        actions={
          <>
            <Button variant="ghost" size="xs" onClick={() => setUrlText(EXAMPLE)}>
              <FlaskConical /> Example
            </Button>
            <Button variant="ghost" size="xs" onClick={() => setUrlText('')} disabled={!input}>
              <Eraser /> Clear
            </Button>
            <CopyButton value={parsed?.url.href ?? input} toolName="url_tools" />
          </>
        }
        footer={
          error ? (
            <span role="alert" className="text-destructive">
              {error}
            </span>
          ) : parsed?.assumedScheme ? (
            'No scheme given, so https:// is assumed.'
          ) : parsed ? (
            `${parsed.url.href.length.toLocaleString()} characters`
          ) : (
            'Paste any URL. Components and query parameters update as you type.'
          )
        }
      >
        {(labelId) => (
          <CodeArea
            aria-labelledby={labelId}
            autoFocus
            value={input}
            onChange={(e) => setUrlText(e.target.value)}
            placeholder="https://example.com/path?key=value"
            aria-invalid={!!error}
            className="min-h-20 break-all md:min-h-24"
          />
        )}
      </ToolPanel>

      {parsed ? (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <ToolPanel title="Components">
            {() => (
              <dl className="divide-y">
                {parts.map((part) => (
                  <div key={part.id} className="group flex items-start gap-3 px-3 py-2">
                    <dt className="w-20 shrink-0 pt-0.5 text-xs text-muted-foreground">{part.label}</dt>
                    <dd className="min-w-0 flex-1 font-mono text-[13px] break-all">{part.value}</dd>
                    <div className="opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <CopyButton value={part.value} label={`Copy ${part.label.toLowerCase()}`} iconOnly />
                    </div>
                  </div>
                ))}
              </dl>
            )}
          </ToolPanel>

          <ToolPanel
            title={`Query parameters (${rows.filter((r) => r.key).length})`}
            actions={
              <Button variant="ghost" size="xs" onClick={() => setRows([...rows, { key: '', value: '' }])}>
                <Plus /> Add
              </Button>
            }
          >
            {() =>
              rows.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">No query parameters.</p>
              ) : (
                <ul className="space-y-2 p-3">
                  {rows.map((row, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Input
                        aria-label={`Parameter ${i + 1} name`}
                        value={row.key}
                        placeholder="key"
                        onChange={(e) => updateRows(rows.map((r, j) => (j === i ? { ...r, key: e.target.value } : r)))}
                        className="w-2/5 font-mono text-[13px]"
                        spellCheck={false}
                      />
                      <span className="text-muted-foreground">=</span>
                      <Input
                        aria-label={`Parameter ${i + 1} value`}
                        value={row.value}
                        placeholder="value"
                        onChange={(e) => updateRows(rows.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)))}
                        className="flex-1 font-mono text-[13px]"
                        spellCheck={false}
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove parameter ${row.key || i + 1}`}
                        onClick={() => updateRows(rows.filter((_, j) => j !== i))}
                      >
                        <Trash2 />
                      </Button>
                    </li>
                  ))}
                </ul>
              )
            }
          </ToolPanel>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-8 text-center">
          <Link2 className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Components and an editable query-string table appear here.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setUrlText(EXAMPLE)}>
              <FlaskConical /> Try an example
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/encoding?scheme=url">
                Encode or decode text <ArrowUpRight />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </ToolPage>
  )
}
