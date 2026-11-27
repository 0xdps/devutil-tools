import { useDeferredValue, useMemo, useState } from 'react'
import { BookOpen, ChevronDown, CircleAlert, Hourglass } from 'lucide-react'
import { ToolPage } from '@/components/tool/ToolPage'
import { useShareState, useToolOutput } from '@/components/tool/tool-actions'
import { ToolPanel } from '@/components/tool/ToolPanel'
import { CodeEditor, type EditorMark } from '@/components/tool/CodeEditor'
import { CopyButton } from '@/components/tool/CopyButton'
import { StatusPill } from '@/components/tool/StatusPill'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Toggle } from '@/components/ui/toggle'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTabParam } from '@/hooks/use-tab-param'
import { useRegexWorker } from '@/hooks/use-regex-worker'
import { REGEX_FLAGS, explainRegex, type RegexMatch } from '@/lib/regex'
import { cn } from '@/lib/utils'

const TABS = ['match', 'replace'] as const

const LIBRARY: { name: string; pattern: string; flags: string; sample: string }[] = [
  { name: 'Email address', pattern: '[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+', flags: 'g', sample: 'Contact ada@example.com or alan.turing+news@cs.ox.ac.uk today.' },
  { name: 'URL', pattern: 'https?:\\/\\/[^\\s/$.?#][^\\s]*', flags: 'gi', sample: 'Docs at https://devutil.codes/docs and http://localhost:3000/api?x=1' },
  { name: 'IPv4 address', pattern: '\\b(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\b', flags: 'g', sample: 'Hosts: 10.0.0.1, 192.168.1.254, 256.1.1.1 (invalid)' },
  { name: 'ISO date (named groups)', pattern: '(?<year>\\d{4})-(?<month>0[1-9]|1[0-2])-(?<day>0[1-9]|[12]\\d|3[01])', flags: 'g', sample: 'Released 2024-03-15, patched 2024-13-01 (invalid), EOL 2026-12-31.' },
  { name: 'Hex color', pattern: '#(?:[0-9a-fA-F]{3}){1,2}\\b', flags: 'g', sample: 'Brand #0ea5e9, text #111, invalid #12345.' },
  { name: 'UUID', pattern: '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}', flags: 'gi', sample: 'id=886313e1-3b8a-5372-9b90-0c9aee199e5d ref=not-a-uuid' },
  { name: 'Semantic version', pattern: '\\bv?(\\d+)\\.(\\d+)\\.(\\d+)(?:-([\\w.]+))?\\b', flags: 'g', sample: 'Upgrade from v1.4.0 to 2.0.0-beta.1 (not 2.0).' },
  { name: 'Duplicate words', pattern: '\\b(\\w+)\\s+\\1\\b', flags: 'gi', sample: 'This is is a test of the the duplicate finder.' },
  { name: 'Log line (level + message)', pattern: '^\\[(?<level>INFO|WARN|ERROR)\\]\\s+(?<message>.+)$', flags: 'gm', sample: '[INFO] Server started\n[WARN] Disk at 85%\n[ERROR] Connection refused' },
]

function MatchList({ matches }: { matches: RegexMatch[] }) {
  if (!matches.length) return <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matches.</p>
  return (
    <ol tabIndex={0} aria-label="Matches" className="max-h-[28rem] divide-y overflow-auto outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50">
      {matches.map((m, i) => (
        <li key={`${m.index}-${i}`} className="space-y-1 px-3 py-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              #{i + 1} · {m.index}–{m.end}
            </span>
          </div>
          <code className={cn('block rounded px-1.5 py-0.5 font-mono text-[13px] break-all', i % 2 ? 're-match-alt' : 're-match')}>
            {m.value === '' ? <em className="font-sans text-muted-foreground">empty match</em> : m.value}
          </code>
          {m.groups.length > 0 && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 pt-1 text-xs">
              {m.groups.map((g) => (
                <div key={g.index} className="contents">
                  <dt className="text-muted-foreground">
                    {g.index}
                    {g.name && <span className="text-primary"> {g.name}</span>}
                  </dt>
                  <dd className="font-mono break-all">{g.value === undefined ? <em className="font-sans text-muted-foreground">not matched</em> : g.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </li>
      ))}
    </ol>
  )
}

export default function RegexTester() {
  const [tab, setTab] = useTabParam(TABS)
  const [pattern, setPattern] = useState(LIBRARY[3].pattern)
  const [flags, setFlags] = useState('g')
  const [text, setText] = useState(LIBRARY[3].sample)
  const [replacement, setReplacement] = useState('$<day>/$<month>/$<year>')
  const deferredText = useDeferredValue(text)
  const state = useRegexWorker(pattern, flags, deferredText, tab === 'replace' ? replacement : undefined)

  const result = state.status === 'done' ? state.result : null
  const explanation = useMemo(() => {
    try {
      new RegExp(pattern, flags)
      return explainRegex(pattern)
    } catch {
      return []
    }
  }, [pattern, flags])

  const marks = useMemo<EditorMark[]>(() => {
    if (!result) return []
    const out: EditorMark[] = []
    result.matches.forEach((m, i) => {
      out.push({ from: m.index, to: m.end, className: i % 2 ? 're-match-alt' : 're-match' })
      for (const g of m.groups) if (g.start !== undefined && g.end !== undefined) out.push({ from: g.start, to: g.end, className: 're-group' })
    })
    return out
  }, [result])

  useToolOutput(tab === 'replace' ? (result?.replaced ?? '') : (result?.matches.map((m) => m.value).join('\n') ?? ''))
  useShareState({ pattern, flags, text, replacement }, (s) => {
    setPattern(String(s.pattern ?? ''))
    setFlags(String(s.flags ?? '').replace(/[^gimsuy]/g, ''))
    setText(String(s.text ?? ''))
    setReplacement(String(s.replacement ?? ''))
  })

  const toggleFlag = (flag: string, on: boolean) =>
    setFlags((f) => (on ? [...new Set([...f, flag])].sort((a, b) => 'gimsuy'.indexOf(a) - 'gimsuy'.indexOf(b)).join('') : f.replace(flag, '')))

  const statusPill =
    state.status === 'error' ? null : state.status === 'timeout' ? (
      <StatusPill tone="danger">Timed out</StatusPill>
    ) : result ? (
      <StatusPill tone={result.matches.length ? 'success' : 'neutral'}>
        {result.matches.length.toLocaleString()}
        {result.truncated ? '+' : ''} match{result.matches.length === 1 ? '' : 'es'}
      </StatusPill>
    ) : null

  return (
    <ToolPage
      toolId="regex-tester"
      reference={
        <div className="grid gap-x-8 gap-y-1 font-mono text-xs sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['.', 'any character'],
            ['\\d \\w \\s', 'digit, word char, whitespace'],
            ['[abc] [^abc]', 'one of / none of'],
            ['^ $', 'start / end'],
            ['\\b', 'word boundary'],
            ['* + ?', '0+, 1+, 0 or 1'],
            ['{2,5}', 'between 2 and 5'],
            ['*? +?', 'lazy (as few as possible)'],
            ['(…) (?<name>…)', 'capture / named group'],
            ['(?:…)', 'group without capturing'],
            ['(?=…) (?!…)', 'lookahead / negative'],
            ['$1 $<name>', 'use a group in replacements'],
          ].map(([syntax, meaning]) => (
            <div key={syntax} className="flex gap-3">
              <span className="w-28 shrink-0 text-foreground">{syntax}</span>
              <span className="font-sans">{meaning}</span>
            </div>
          ))}
        </div>
      }
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="re-pattern">Regular expression</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="xs">
                <BookOpen /> Pattern library <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Load a pattern with sample text</DropdownMenuLabel>
              {LIBRARY.map((item) => (
                <DropdownMenuItem
                  key={item.name}
                  onSelect={() => {
                    setPattern(item.pattern)
                    setFlags(item.flags)
                    setText(item.sample)
                  }}
                >
                  {item.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div
          className={cn(
            'flex h-11 items-center rounded-lg border bg-code font-mono text-[15px] shadow-xs focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
            state.status === 'error' && 'border-destructive',
          )}
        >
          <span className="pl-3 text-muted-foreground" aria-hidden>
            /
          </span>
          <input
            id="re-pattern"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            className="h-full min-w-0 flex-1 bg-transparent px-1 outline-none"
            spellCheck={false}
            autoComplete="off"
            aria-invalid={state.status === 'error'}
            aria-describedby="re-status"
            autoFocus
          />
          <span className="pr-3 text-muted-foreground" aria-label={`flags ${flags || 'none'}`}>
            /<span className="text-primary">{flags}</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1" role="group" aria-label="Flags">
            {REGEX_FLAGS.map(({ flag, name, hint }) => (
              <Tooltip key={flag}>
                <TooltipTrigger asChild>
                  <Toggle
                    size="sm"
                    variant="outline"
                    pressed={flags.includes(flag)}
                    onPressedChange={(on) => toggleFlag(flag, on)}
                    className="h-7 px-2 font-mono text-xs data-[state=on]:border-primary/50 data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                  >
                    {flag} <span className="font-sans text-muted-foreground">{name}</span>
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>{hint}</TooltipContent>
              </Tooltip>
            ))}
          </div>
          <div id="re-status" aria-live="polite">
            {statusPill}
          </div>
        </div>
        {state.status === 'error' && (
          <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
            <CircleAlert className="size-4" /> {state.message}
          </p>
        )}
        {state.status === 'timeout' && (
          <p role="alert" className="flex items-start gap-1.5 text-sm text-destructive">
            <Hourglass className="mt-0.5 size-4 shrink-0" />
            This pattern took over a second and was stopped. It probably backtracks catastrophically (nested quantifiers like
            (a+)+). Simplify it or make it more specific.
          </p>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="match">Match</TabsTrigger>
          <TabsTrigger value="replace">Replace</TabsTrigger>
        </TabsList>

        <div className="mt-4 grid items-start gap-3 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <ToolPanel title="Test text" footer={`${text.length.toLocaleString()} characters · matches highlighted, groups underlined`}>
            {(labelId) => <CodeEditor value={text} onChange={setText} ariaLabelledBy={labelId} marks={marks} placeholder="Paste text to test against…" />}
          </ToolPanel>

          <TabsContent value="match" className="mt-0">
            <ToolPanel
              title={`Matches${result ? ` (${result.matches.length}${result.truncated ? '+' : ''})` : ''}`}
              actions={<CopyButton value={result ? result.matches.map((m) => m.value).join('\n') : ''} label="Copy all" toolName="regex_tester" />}
              footer={result?.truncated ? 'Showing the first 5,000 matches.' : undefined}
            >
              {() => <MatchList matches={result?.matches ?? []} />}
            </ToolPanel>
          </TabsContent>

          <TabsContent value="replace" className="mt-0 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="re-replacement">Replace with</Label>
              <Input
                id="re-replacement"
                value={replacement}
                onChange={(e) => setReplacement(e.target.value)}
                className="font-mono text-[13px]"
                placeholder="$1, $<name>, $&"
                spellCheck={false}
              />
            </div>
            <ToolPanel title="Result" actions={<CopyButton value={result?.replaced ?? ''} toolName="regex_tester" />}>
              {(labelId) => <CodeEditor value={result?.replaced ?? ''} readOnly ariaLabelledBy={labelId} className="md:min-h-64" />}
            </ToolPanel>
          </TabsContent>
        </div>
      </Tabs>

      {explanation.length > 0 && (
        // Long patterns start collapsed so the page stays scannable.
        <details key={explanation.length > 12 ? 'long' : 'short'} open={explanation.length <= 12} className="group rounded-xl border bg-card p-4 shadow-xs">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            <ChevronDown className="size-4 -rotate-90 transition-transform group-open:rotate-0" />
            What this pattern means
            <span className="font-normal text-muted-foreground">({explanation.length} steps)</span>
          </summary>
          <ol className="mt-3 space-y-1 text-sm">
            {explanation.map((t, i) => (
              <li key={i} className="flex gap-3" style={{ paddingLeft: `${t.depth * 1.25}rem` }}>
                <code className="w-40 shrink-0 font-mono text-[13px] break-all text-primary">{t.text}</code>
                <span className="text-muted-foreground">{t.description}</span>
              </li>
            ))}
          </ol>
        </details>
      )}
    </ToolPage>
  )
}
