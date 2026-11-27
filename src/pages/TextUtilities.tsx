import { useDeferredValue, useMemo, useState } from 'react'
import { CornerLeftUp, Eraser } from 'lucide-react'
import { ToolPage } from '@/components/tool/ToolPage'
import { useShareState } from '@/components/tool/tool-actions'
import { CodeArea, ToolPanel } from '@/components/tool/ToolPanel'
import { CopyButton } from '@/components/tool/CopyButton'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toolsMetadata } from '@/config/seoConfig'
import { useTabParam } from '@/hooks/use-tab-param'
import { CASE_STYLES, processLines, textStats, type LineOptions, type SortMode } from '@/lib/text'

const TABS = ['case', 'stats', 'lines'] as const

function formatMinutes(m: number) {
  if (m === 0) return '0 sec'
  if (m < 1) return `${Math.max(1, Math.round(m * 60))} sec`
  return `${Math.round(m)} min`
}

function CaseTab({ text, onUse }: { text: string; onUse: (s: string) => void }) {
  if (!text.trim()) return <p className="py-8 text-center text-sm text-muted-foreground">Type above to see every case style at once.</p>
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {CASE_STYLES.map((style) => {
        const value = style.convert(text)
        return (
          <li key={style.id} className="flex min-w-0 flex-col rounded-xl border bg-card shadow-xs">
            <div className="flex items-center justify-between gap-2 border-b px-3 py-1.5">
              <span className="font-mono text-xs text-muted-foreground">{style.label}</span>
              <div className="flex items-center">
                <Button variant="ghost" size="icon-xs" aria-label={`Use ${style.label} as input`} title="Use as input" onClick={() => onUse(value)}>
                  <CornerLeftUp />
                </Button>
                <CopyButton value={value} label={`Copy ${style.label}`} iconOnly toolName="text_utilities" />
              </div>
            </div>
            <p className="line-clamp-4 px-3 py-2 font-mono text-[13px] break-all whitespace-pre-wrap">{value}</p>
          </li>
        )
      })}
    </ul>
  )
}

function StatsTab({ text }: { text: string }) {
  const s = textStats(text)
  const tiles: [string, string][] = [
    ['Characters', s.characters.toLocaleString()],
    ['Without spaces', s.charactersNoSpaces.toLocaleString()],
    ['Words', s.words.toLocaleString()],
    ['Sentences', s.sentences.toLocaleString()],
    ['Paragraphs', s.paragraphs.toLocaleString()],
    ['Lines', s.lines.toLocaleString()],
    ['Bytes (UTF-8)', s.bytes.toLocaleString()],
    ['Reading time', formatMinutes(s.readingMinutes)],
    ['Speaking time', formatMinutes(s.speakingMinutes)],
  ]
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map(([label, value]) => (
        <div key={label} className="rounded-xl border bg-card p-3 shadow-xs">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

const LINE_OPTIONS: { key: keyof Omit<LineOptions, 'sort'>; label: string }[] = [
  { key: 'trim', label: 'Trim each line' },
  { key: 'collapseSpaces', label: 'Collapse repeated spaces' },
  { key: 'removeEmpty', label: 'Remove empty lines' },
  { key: 'dedupe', label: 'Remove duplicate lines' },
  { key: 'caseInsensitive', label: 'Ignore case (dedupe & sort)' },
]

const SORTS: { value: SortMode; label: string }[] = [
  { value: 'none', label: 'Keep order' },
  { value: 'asc', label: 'A → Z' },
  { value: 'desc', label: 'Z → A' },
  { value: 'natural', label: 'Natural (item2 before item10)' },
  { value: 'length', label: 'By length' },
  { value: 'reverse', label: 'Reverse order' },
  { value: 'shuffle', label: 'Shuffle' },
]

function LinesTab({ text, onUse }: { text: string; onUse: (s: string) => void }) {
  const [opts, setOpts] = useState<LineOptions>({ trim: true, removeEmpty: true, dedupe: false, sort: 'none' })
  const output = useMemo(() => processLines(text, opts), [text, opts])
  const before = text ? text.split(/\r\n|\r|\n/).length : 0
  const after = output ? output.split('\n').length : 0

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <fieldset className="space-y-3 rounded-xl border bg-card p-4 shadow-xs">
        <legend className="sr-only">Line operations</legend>
        {LINE_OPTIONS.map(({ key, label }) => (
          <Label key={key} className="flex items-center gap-2 font-normal">
            <Checkbox checked={!!opts[key]} onCheckedChange={(on) => setOpts({ ...opts, [key]: on === true })} />
            {label}
          </Label>
        ))}
        <div className="border-t pt-3">
          <Label className="mb-1.5 text-xs text-muted-foreground">Sort</Label>
          <Select value={opts.sort ?? 'none'} onValueChange={(v) => setOpts({ ...opts, sort: v as SortMode })}>
            <SelectTrigger className="w-full" aria-label="Sort lines">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </fieldset>
      <ToolPanel
        title="Result"
        actions={
          <>
            <Button variant="ghost" size="xs" onClick={() => onUse(output)} disabled={output === text}>
              <CornerLeftUp /> Apply to input
            </Button>
            <CopyButton value={output} toolName="text_utilities" />
          </>
        }
        footer={text ? `${before.toLocaleString()} → ${after.toLocaleString()} lines` : undefined}
      >
        {(labelId) => <CodeArea aria-labelledby={labelId} readOnly value={output} placeholder="Processed lines appear here" />}
      </ToolPanel>
    </div>
  )
}

export default function TextUtilities() {
  const [tab, setTab] = useTabParam(TABS)
  const [text, setText] = useState('')
  const deferred = useDeferredValue(text)
  useShareState({ text }, (s) => setText(String(s.text ?? '')))

  return (
    <ToolPage
      toolId="text-utilities"
      meta={toolsMetadata.textUtilities}
      reference={
        <ul className="list-disc space-y-1 pl-5">
          <li>Case conversion understands identifiers: “HTTPServerError” becomes http_server_error, not h_t_t_p_server_error.</li>
          <li>Character counts are user-perceived characters, so an emoji like 👩‍💻 counts as one.</li>
          <li>Line operations run in order: trim → collapse spaces → remove empty → dedupe → sort.</li>
        </ul>
      }
    >
      <ToolPanel
        title="Text"
        actions={
          <Button variant="ghost" size="xs" onClick={() => setText('')} disabled={!text}>
            <Eraser /> Clear
          </Button>
        }
      >
        {(labelId) => (
          <CodeArea
            aria-labelledby={labelId}
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste text, identifiers or a list of lines…"
            className="min-h-40 md:min-h-48"
          />
        )}
      </ToolPanel>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="case">Case</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="lines">Clean & sort lines</TabsTrigger>
        </TabsList>
        <TabsContent value="case" className="mt-4">
          <CaseTab text={deferred} onUse={setText} />
        </TabsContent>
        <TabsContent value="stats" className="mt-4">
          <StatsTab text={deferred} />
        </TabsContent>
        <TabsContent value="lines" className="mt-4">
          <LinesTab text={deferred} onUse={setText} />
        </TabsContent>
      </Tabs>
    </ToolPage>
  )
}
