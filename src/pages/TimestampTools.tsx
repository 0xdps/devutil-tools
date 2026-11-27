import { useEffect, useMemo, useState } from 'react'
import cronstrue from 'cronstrue'
import { CalendarClock, Clock, Pause, Play } from 'lucide-react'
import { ToolPage } from '@/components/tool/ToolPage'
import { useShareState, useToolOutput } from '@/components/tool/tool-actions'
import { ToolPanel } from '@/components/tool/ToolPanel'
import { CopyButton } from '@/components/tool/CopyButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatAll, parseTimeInput, UNIT_LABELS, type EpochUnit } from '@/lib/timestamp'
import { formatRelative } from '@/lib/jwt'
import { CRON_FIELDS, nextRuns, parseCron } from '@/lib/cron'
import { useTabParam } from '@/hooks/use-tab-param'

const TABS = ['unix', 'cron'] as const

// ── Timestamp ───────────────────────────────────────────────────────

function NowStrip({ onUse }: { onUse: (seconds: string) => void }) {
  const [now, setNow] = useState(() => Date.now())
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [paused])

  const seconds = String(Math.floor(now / 1000))
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-xs">
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">Current Unix time</div>
        <div className="font-mono text-2xl font-semibold tabular-nums tracking-tight" aria-live="off">
          {seconds}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <CopyButton value={seconds} label="Copy s" toolName="timestamp_tools" />
        <CopyButton value={String(now)} label="Copy ms" toolName="timestamp_tools" />
        <Button variant="ghost" size="xs" onClick={() => onUse(seconds)}>
          Use
        </Button>
        <Button variant="ghost" size="icon-xs" onClick={() => setPaused(!paused)} aria-label={paused ? 'Resume clock' : 'Pause clock'}>
          {paused ? <Play /> : <Pause />}
        </Button>
      </div>
    </div>
  )
}

function TimestampTab() {
  const [input, setInput] = useState(() => String(Math.floor(Date.now() / 1000)))
  const [unit, setUnit] = useState<EpochUnit | 'auto'>('auto')

  const result = useMemo(() => {
    if (!input.trim()) return {}
    try {
      return { parsed: parseTimeInput(input, unit) }
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) }
    }
  }, [input, unit])

  const { parsed, error } = result
  useToolOutput(parsed ? parsed.date.toISOString() : '')
  useShareState({ input, unit }, (s) => {
    setInput(String(s.input ?? ''))
    if (['auto', 's', 'ms', 'us', 'ns'].includes(String(s.unit))) setUnit(s.unit)
  })
  const hint = parsed
    ? parsed.source === 'date'
      ? 'Read as a date string'
      : `Read as ${UNIT_LABELS[parsed.source]}${unit === 'auto' ? ' (auto-detected)' : ''}`
    : undefined

  return (
    <div className="space-y-4">
      <NowStrip onUse={setInput} />

      <div className="space-y-2">
        <Label htmlFor="ts-input">Timestamp or date</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="ts-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="1700000000, 1700000000000 or 2024-03-15T10:30:00Z"
            className="h-10 flex-1 font-mono text-base"
            aria-invalid={!!error}
            aria-describedby="ts-hint"
            spellCheck={false}
            autoFocus
          />
          <Select value={unit} onValueChange={(v) => setUnit(v as EpochUnit | 'auto')}>
            <SelectTrigger className="h-10! w-full sm:w-44" aria-label="Epoch unit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto-detect unit</SelectItem>
              {(Object.keys(UNIT_LABELS) as EpochUnit[]).map((u) => (
                <SelectItem key={u} value={u}>
                  {UNIT_LABELS[u]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="h-10" onClick={() => setInput(String(Math.floor(Date.now() / 1000)))}>
            <Clock /> Now
          </Button>
        </div>
        <p id="ts-hint" className={error ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'} role={error ? 'alert' : undefined}>
          {error ?? hint ?? 'Accepts seconds, milliseconds, microseconds, nanoseconds or a date string.'}
        </p>
      </div>

      {parsed && (
        <ToolPanel
          title={
            <span className="normal-case tracking-normal">
              {formatRelative((parsed.date.getTime() - Date.now()) / 1000)}
            </span>
          }
        >
          {() => (
            <dl className="divide-y">
              {formatAll(parsed.date).map((f) => (
                <div key={f.id} className="group flex items-center gap-3 px-3 py-2">
                  <dt className="w-36 shrink-0 text-xs text-muted-foreground">{f.label}</dt>
                  <dd className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="min-w-0 flex-1 font-mono text-[13px] break-all">{f.value}</span>
                    <CopyButton value={f.value} label={`Copy ${f.label}`} iconOnly toolName="timestamp_tools" />
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </ToolPanel>
      )}
    </div>
  )
}

// ── Cron ────────────────────────────────────────────────────────────

const PRESETS: { label: string; value: string }[] = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every 15 min', value: '*/15 * * * *' },
  { label: 'Hourly', value: '0 * * * *' },
  { label: 'Daily 9:00', value: '0 9 * * *' },
  { label: 'Weekdays 9:00', value: '0 9 * * 1-5' },
  { label: 'Weekly (Sun)', value: '0 0 * * 0' },
  { label: 'Monthly (1st)', value: '0 0 1 * *' },
]

const runFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

function CronTab() {
  const [expr, setExpr] = useState('0 9 * * 1-5')

  useShareState({ expr }, (s) => setExpr(String(s.expr ?? '')))
  const result = useMemo(() => {
    try {
      const cron = parseCron(expr)
      let description = ''
      try {
        description = cronstrue.toString(cron.expression, { verbose: true })
      } catch {
        description = ''
      }
      return { cron, description, runs: nextRuns(cron, new Date(), 5) }
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) }
    }
  }, [expr])
  useToolOutput(result.runs ? result.runs.map((r) => r.toISOString()).join('\n') : '')

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cron-input">Cron expression</Label>
        <Input
          id="cron-input"
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          placeholder="*/5 * * * *"
          className="h-10 font-mono text-base"
          aria-invalid={!!result.error}
          aria-describedby="cron-result"
          spellCheck={false}
        />
        <div className="flex flex-wrap gap-1.5" aria-label="Presets">
          {PRESETS.map((p) => (
            <Button key={p.value} variant={expr === p.value ? 'secondary' : 'outline'} size="xs" onClick={() => setExpr(p.value)}>
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <div id="cron-result" aria-live="polite">
        {result.error ? (
          <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {result.error}
          </p>
        ) : (
          result.cron && (
            <div className="space-y-4">
              <p className="rounded-xl border bg-card px-4 py-3 text-lg font-medium shadow-xs">
                {result.description || result.cron.expression}
              </p>

              <ol className="grid grid-cols-5 gap-2" aria-label="Fields">
                {result.cron.fields.map((token, i) => (
                  <li key={i} className="rounded-lg border bg-card px-2 py-2 text-center shadow-xs">
                    <div className="truncate font-mono text-sm font-semibold text-primary">{token}</div>
                    <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{CRON_FIELDS[i].name}</div>
                  </li>
                ))}
              </ol>

              <ToolPanel title="Next runs (your time zone)">
                {() =>
                  result.runs.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-muted-foreground">This schedule never fires (e.g. February 30).</p>
                  ) : (
                    <ol className="divide-y">
                      {result.runs.map((run) => (
                        <li key={run.getTime()} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                          <span className="flex items-center gap-2 font-mono text-[13px]">
                            <CalendarClock className="size-4 text-muted-foreground" />
                            {runFmt.format(run)}
                          </span>
                          <span className="text-xs text-muted-foreground">{formatRelative((run.getTime() - Date.now()) / 1000)}</span>
                        </li>
                      ))}
                    </ol>
                  )
                }
              </ToolPanel>
            </div>
          )
        )}
      </div>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────

export default function TimestampTools() {
  const [tab, setTab] = useTabParam(TABS)

  return (
    <ToolPage
      toolId="timestamp-tools"
      reference={
        <ul className="list-disc space-y-1 pl-5">
          <li>A Unix timestamp counts seconds since 1970-01-01 00:00:00 UTC. JavaScript and many APIs use milliseconds.</li>
          <li>
            Cron fields are <code>minute hour day-of-month month day-of-week</code>. Use <code>*</code>, lists (<code>1,15</code>),
            ranges (<code>1-5</code>), steps (<code>*/10</code>) and names (<code>MON</code>, <code>JAN</code>).
          </li>
          <li>When both day-of-month and day-of-week are set, the job runs on days matching either one (standard cron behavior).</li>
        </ul>
      }
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="unix">Unix timestamp</TabsTrigger>
          <TabsTrigger value="cron">Cron expression</TabsTrigger>
        </TabsList>
        <TabsContent value="unix" className="mt-4">
          <TimestampTab />
        </TabsContent>
        <TabsContent value="cron" className="mt-4">
          <CronTab />
        </TabsContent>
      </Tabs>
    </ToolPage>
  )
}
