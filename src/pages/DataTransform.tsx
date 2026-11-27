import { useDeferredValue, useMemo, useState } from 'react'
import { ArrowLeftRight, CircleAlert, Eraser, FlaskConical, TriangleAlert, Wand2 } from 'lucide-react'
import { ToolPage } from '@/components/tool/ToolPage'
import { useShareState, useToolOutput } from '@/components/tool/tool-actions'
import { ToolPanel } from '@/components/tool/ToolPanel'
import { CodeEditor } from '@/components/tool/CodeEditor'
import { CopyButton } from '@/components/tool/CopyButton'
import { DownloadButton } from '@/components/tool/DownloadButton'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toolsMetadata } from '@/config/seoConfig'
import { describeJsonError } from '@/lib/code-format'
import { DATA_FORMATS, convertData, detectFormat, type DataFormat } from '@/lib/transform'

const EXAMPLE = JSON.stringify(
  [
    { id: 1, name: 'Ada Lovelace', email: 'ada@example.com', active: true, address: { city: 'London', country: 'UK' } },
    { id: 2, name: 'Alan Turing', email: 'alan@example.com', active: false, address: { city: 'Wilmslow', country: 'UK' } },
  ],
  null,
  2,
)

const EXTENSIONS: Record<DataFormat, [string, string]> = {
  json: ['json', 'application/json'],
  yaml: ['yaml', 'application/yaml'],
  csv: ['csv', 'text/csv'],
  toml: ['toml', 'application/toml'],
  xml: ['xml', 'application/xml'],
}

const label = (f: DataFormat) => DATA_FORMATS.find((d) => d.value === f)!.label

function FormatSelect({ id, value, onChange, labelText }: { id: string; value: DataFormat; onChange: (f: DataFormat) => void; labelText: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {labelText}
      </Label>
      <Select value={value} onValueChange={(v) => onChange(v as DataFormat)}>
        <SelectTrigger id={id} className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATA_FORMATS.map((f) => (
            <SelectItem key={f.value} value={f.value}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default function DataTransform() {
  const [input, setInput] = useState('')
  const [from, setFrom] = useState<DataFormat>('json')
  const [to, setTo] = useState<DataFormat>('yaml')
  const [indent, setIndent] = useState(2)
  const deferred = useDeferredValue(input)

  const result = useMemo((): { output: string; warnings: string[]; error?: string } => {
    if (!deferred.trim()) return { output: '', warnings: [] }
    try {
      return convertData(from, to, deferred, indent)
    } catch (e) {
      const message = from === 'json' ? describeJsonError(deferred, e) : e instanceof Error ? e.message : String(e)
      return { output: '', warnings: [], error: message }
    }
  }, [deferred, from, to, indent])

  const detected = useMemo(() => detectFormat(deferred), [deferred])
  useToolOutput(result.output)
  useShareState({ from, to, indent, input }, (s) => {
    const ok = (f: unknown): f is DataFormat => DATA_FORMATS.some((d) => d.value === f)
    if (ok(s.from)) setFrom(s.from)
    if (ok(s.to)) setTo(s.to)
    if (s.indent === 2 || s.indent === 4) setIndent(s.indent)
    setInput(String(s.input ?? ''))
  })
  const suggestion = result.error && detected && detected !== from ? detected : null

  const swap = () => {
    if (result.output) setInput(result.output)
    setFrom(to)
    setTo(from)
  }

  const [ext, mime] = EXTENSIONS[to]

  return (
    <ToolPage
      toolId="data-transform"
      meta={toolsMetadata.dataTransform}
      reference={
        <ul className="list-disc space-y-1 pl-5">
          <li>CSV output flattens nested objects into dot-separated columns (address.city) and writes arrays as JSON.</li>
          <li>TOML has no null and needs a table at the top level; such changes are listed as warnings, never applied silently.</li>
          <li>XML attributes appear as keys prefixed with @_ and element text as #text, so they survive a round trip.</li>
        </ul>
      }
    >
      <div className="flex flex-wrap items-end gap-3">
        <FormatSelect id="dt-from" labelText="From" value={from} onChange={setFrom} />
        <Button variant="outline" size="icon" onClick={swap} aria-label="Swap formats and use the output as input" title="Swap">
          <ArrowLeftRight />
        </Button>
        <FormatSelect id="dt-to" labelText="To" value={to} onChange={setTo} />
        <div className="space-y-1.5">
          <Label htmlFor="dt-indent" className="text-xs text-muted-foreground">
            Indent
          </Label>
          <Select value={String(indent)} onValueChange={(v) => setIndent(Number(v))}>
            <SelectTrigger id="dt-indent" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 spaces</SelectItem>
              <SelectItem value="4">4 spaces</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <ToolPanel
          title={`${label(from)} input`}
          actions={
            <>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  setFrom('json')
                  setInput(EXAMPLE)
                }}
              >
                <FlaskConical /> Example
              </Button>
              <Button variant="ghost" size="xs" onClick={() => setInput('')} disabled={!input}>
                <Eraser /> Clear
              </Button>
            </>
          }
          footer={
            suggestion ? (
              <span className="flex flex-wrap items-center gap-2">
                This looks like {label(suggestion)}.
                <Button variant="outline" size="xs" onClick={() => setFrom(suggestion)}>
                  <Wand2 /> Read as {label(suggestion)}
                </Button>
              </span>
            ) : (
              `${input.split('\n').length.toLocaleString()} lines`
            )
          }
        >
          {(labelId) => (
            <CodeEditor
              value={input}
              onChange={setInput}
              language={from}
              ariaLabelledBy={labelId}
              placeholder={`Paste ${label(from)}…`}
              autoFocus
            />
          )}
        </ToolPanel>

        <ToolPanel
          title={`${label(to)} output`}
          actions={
            <>
              <DownloadButton value={result.output} filename={`converted.${ext}`} mime={mime} toolName="data_transform" />
              <CopyButton value={result.output} toolName="data_transform" />
            </>
          }
          footer={
            result.error ? (
              <span role="alert" className="flex items-start gap-1.5 text-destructive">
                <CircleAlert className="mt-0.5 size-3.5 shrink-0" /> {result.error}
              </span>
            ) : result.warnings.length ? (
              <ul className="space-y-0.5 text-warning">
                {result.warnings.map((w) => (
                  <li key={w} className="flex items-start gap-1.5">
                    <TriangleAlert className="mt-0.5 size-3.5 shrink-0" /> {w}
                  </li>
                ))}
              </ul>
            ) : result.output ? (
              `${result.output.split('\n').length.toLocaleString()} lines`
            ) : (
              'Converts as you type'
            )
          }
        >
          {(labelId) => <CodeEditor value={result.output} language={to} readOnly ariaLabelledBy={labelId} placeholder="Output appears here" />}
        </ToolPanel>
      </div>
    </ToolPage>
  )
}
