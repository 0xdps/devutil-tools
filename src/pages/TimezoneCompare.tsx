import { useEffect, useMemo, useState } from 'react'
import { ArrowUpToLine, Check, Clock, Plus, X } from 'lucide-react'
import { ToolPage } from '@/components/tool/ToolPage'
import { useShareState, useToolOutput } from '@/components/tool/tool-actions'
import { CopyButton } from '@/components/tool/CopyButton'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toolsMetadata } from '@/config/seoConfig'
import {
  allZones,
  describeZone,
  formatDifference,
  formatOffset,
  hourKind,
  isValidZone,
  offsetMinutes,
  sharedWorkingHours,
  zoneAbbreviation,
  zonedParts,
  zonedTimeToUtc,
  type HourKind,
} from '@/lib/timezone'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'devutil-timezones'
const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
const DEFAULT_ZONES = [localZone, 'UTC', 'America/New_York', 'Europe/London', 'Asia/Kolkata', 'Asia/Tokyo']

/** Reads saved zones; accepts the old format ({ timezone }[]) and drops invalid ones (e.g. Asia/Beijing). */
function loadZones(): string[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (Array.isArray(raw) && raw.length) {
      const zones = raw
        .map((z) => (typeof z === 'string' ? z : typeof z === 'object' && z && 'timezone' in z ? String((z as { timezone: unknown }).timezone) : ''))
        .map((z) => (z === 'Asia/Beijing' ? 'Asia/Shanghai' : z))
        .filter((z) => z && isValidZone(z))
      if (zones.length) return [...new Set(zones)]
    }
  } catch {
    /* storage unavailable or corrupt: use defaults */
  }
  return [...new Set(DEFAULT_ZONES)]
}

const KIND_STYLES: Record<HourKind, string> = {
  night: 'bg-muted/60 text-muted-foreground',
  early: 'bg-warning/15 text-foreground',
  work: 'bg-success/20 text-foreground',
  evening: 'bg-chart-4/15 text-foreground',
}

const pad = (n: number) => String(n).padStart(2, '0')
const timeFmt = (zone: string) => new Intl.DateTimeFormat(undefined, { timeZone: zone, hour: '2-digit', minute: '2-digit' })
const dateFmt = (zone: string) => new Intl.DateTimeFormat(undefined, { timeZone: zone, weekday: 'short', month: 'short', day: 'numeric' })

function AddZone({ existing, onAdd }: { existing: string[]; onAdd: (zone: string) => void }) {
  const [open, setOpen] = useState(false)
  const zones = useMemo(() => allZones(), [])
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <Plus /> Add a city or time zone
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search city, country or zone…" />
          <CommandList className="max-h-72">
            <CommandEmpty>No matching time zone.</CommandEmpty>
            <CommandGroup>
              {zones.map((z) => (
                <CommandItem
                  key={z.zone}
                  value={`${z.city} ${z.country} ${z.zone}`}
                  disabled={existing.includes(z.zone)}
                  onSelect={() => {
                    onAdd(z.zone)
                    setOpen(false)
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{z.city}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {z.country} · {z.zone}
                    </div>
                  </div>
                  {existing.includes(z.zone) && <Check className="text-muted-foreground" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default function TimezoneCompare() {
  const [zones, setZones] = useState<string[]>(loadZones)
  const [mode, setMode] = useState<'now' | 'custom'>('now')
  const [now, setNow] = useState(() => new Date())
  const base = zones[0] ?? 'UTC'
  const [custom, setCustom] = useState(() => {
    const p = zonedParts(base, new Date())
    return { date: `${p.year}-${pad(p.month)}-${pad(p.day)}`, time: `${pad(p.hour)}:00` }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(zones))
    } catch {
      /* ignore */
    }
  }, [zones])

  useEffect(() => {
    if (mode !== 'now') return
    const id = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(id)
  }, [mode])

  const instant = useMemo(() => {
    if (mode === 'now') return now
    const [y, m, d] = custom.date.split('-').map(Number)
    const [h, mi] = custom.time.split(':').map(Number)
    if ([y, m, d, h, mi].some((v) => Number.isNaN(v))) return now
    return zonedTimeToUtc(base, y, m, d, h, mi)
  }, [mode, now, custom, base])

  const baseParts = zonedParts(base, instant)
  const baseDay = { year: baseParts.year, month: baseParts.month, day: baseParts.day }
  const baseOffset = offsetMinutes(base, instant)
  const shared = useMemo(() => new Set(sharedWorkingHours(base, baseDay, zones)), [base, baseDay.year, baseDay.month, baseDay.day, zones]) // eslint-disable-line react-hooks/exhaustive-deps
  const hourInstants = useMemo(
    () => Array.from({ length: 24 }, (_, h) => zonedTimeToUtc(base, baseDay.year, baseDay.month, baseDay.day, h, 0)),
    [base, baseDay.year, baseDay.month, baseDay.day],
  )

  const pickHour = (h: number) => {
    setMode('custom')
    setCustom({ date: `${baseDay.year}-${pad(baseDay.month)}-${pad(baseDay.day)}`, time: `${pad(h)}:00` })
  }

  const summary = zones
    .map((z) => `${timeFmt(z).format(instant)} ${describeZone(z).city} (${dateFmt(z).format(instant)})`)
    .join(' · ')

  const sharedList = [...shared]
  useToolOutput(summary)
  useShareState({ zones, mode, custom }, (s) => {
    const valid = Array.isArray(s.zones) ? s.zones.filter((z): z is string => typeof z === 'string' && isValidZone(z)) : []
    if (valid.length) setZones([...new Set(valid)])
    if (s.mode === 'custom' && s.custom && typeof s.custom.date === 'string' && typeof s.custom.time === 'string') {
      setCustom({ date: s.custom.date, time: s.custom.time })
      setMode('custom')
    }
  })

  return (
    <ToolPage
      toolId="timezone-compare"
      meta={toolsMetadata.timezoneCompare}
      reference={
        <ul className="list-disc space-y-1 pl-5">
          <li>The first city is the base: the planner’s columns are its hours, and differences are relative to it.</li>
          <li>Colors: green 9:00–18:00 working hours, amber early morning, purple evening, grey night.</li>
          <li>Daylight saving time is applied for the chosen date, so planning across a DST change is accurate.</li>
        </ul>
      }
    >
      <div className="flex flex-wrap items-end gap-3">
        <Tabs value={mode} onValueChange={(v) => setMode(v as 'now' | 'custom')}>
          <TabsList>
            <TabsTrigger value="now">
              <Clock /> Now
            </TabsTrigger>
            <TabsTrigger value="custom">Pick a time</TabsTrigger>
          </TabsList>
        </Tabs>
        {mode === 'custom' && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="tz-date" className="text-xs text-muted-foreground">
                Date in {describeZone(base).city}
              </Label>
              <Input id="tz-date" type="date" value={custom.date} onChange={(e) => setCustom({ ...custom, date: e.target.value })} className="w-40" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tz-time" className="text-xs text-muted-foreground">
                Time
              </Label>
              <Input id="tz-time" type="time" value={custom.time} onChange={(e) => setCustom({ ...custom, time: e.target.value })} className="w-32" />
            </div>
          </>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          <AddZone existing={zones} onAdd={(z) => setZones([...zones, z])} />
          <CopyButton value={summary} label="Copy times" toolName="timezone_compare" />
        </div>
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {zones.length > 1 &&
          (sharedList.length ? (
            <>
              Everyone is in working hours from{' '}
              <span className="font-medium text-foreground">
                {pad(sharedList[0])}:00 to {pad(sharedList[sharedList.length - 1] + 1)}:00
              </span>{' '}
              {describeZone(base).city} time.
            </>
          ) : (
            'There is no hour when every city is within 9:00–18:00. Look for the least-bad amber or purple hours.'
          ))}
      </p>

      <ul className="space-y-2">
        {zones.map((zone, index) => {
          const info = describeZone(zone)
          const p = zonedParts(zone, instant)
          const offset = offsetMinutes(zone, instant)
          const dayShift = Date.UTC(p.year, p.month - 1, p.day) - Date.UTC(baseDay.year, baseDay.month - 1, baseDay.day)
          const days = Math.round(dayShift / 86_400_000)
          return (
            <li key={zone} className="rounded-xl border bg-card shadow-xs">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pt-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{info.city}</span>
                    {index === 0 && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Base</span>}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {info.country} · {zoneAbbreviation(zone, instant)} · {formatOffset(offset)}
                    {index > 0 && ` · ${formatDifference(offset - baseOffset)}`}
                    {((offset - baseOffset) % 60 + 60) % 60 !== 0 && ` · hours at :${pad(((offset - baseOffset) % 60 + 60) % 60)}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-2xl font-semibold tabular-nums">{timeFmt(zone).format(instant)}</div>
                  <div className="text-xs text-muted-foreground">
                    {dateFmt(zone).format(instant)}
                    {days !== 0 && <span className="ml-1 font-medium text-warning">{days > 0 ? `+${days}` : days} day</span>}
                  </div>
                </div>
                <div className="flex">
                  {index > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Make ${info.city} the base`} onClick={() => setZones([zone, ...zones.filter((z) => z !== zone)])}>
                          <ArrowUpToLine />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Make base</TooltipContent>
                    </Tooltip>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${info.city}`}
                    disabled={zones.length === 1}
                    onClick={() => setZones(zones.filter((z) => z !== zone))}
                  >
                    <X />
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto px-4 pt-2 pb-3">
                <div className="grid min-w-[40rem] grid-cols-24 gap-0.5" role="group" aria-label={`${info.city} hours`}>
                  {hourInstants.map((hourInstant, h) => {
                    const local = zonedParts(zone, hourInstant)
                    const selected = h === baseParts.hour
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => pickHour(h)}
                        className={cn(
                          'h-8 rounded-sm font-mono text-[11px] tabular-nums transition-colors hover:ring-1 hover:ring-ring',
                          KIND_STYLES[hourKind(local.hour)],
                          shared.has(h) && 'ring-1 ring-success/60',
                          selected && 'ring-2 ring-primary',
                        )}
                        aria-label={`${pad(local.hour)}:${pad(local.minute)} in ${info.city}`}
                        aria-pressed={selected}
                      >
                        {local.hour}
                      </button>
                    )
                  })}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </ToolPage>
  )
}
