import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { ToolPage } from '@/components/tool/ToolPage'
import { ToolPanel } from '@/components/tool/ToolPanel'
import { CopyButton } from '@/components/tool/CopyButton'
import { StatusPill, type StatusTone } from '@/components/tool/StatusPill'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { toolsMetadata } from '@/config/seoConfig'
import { useTabParam } from '@/hooks/use-tab-param'
import { formatRelative } from '@/lib/jwt'
import {
  CHARSETS,
  UUID_NAMESPACES,
  formatUuid,
  generatePassword,
  generateUuids,
  inspectUuid,
  lorem,
  passwordEntropy,
  randomHex,
  randomInts,
  type CharsetName,
  type LoremUnit,
  type UuidVersion,
} from '@/lib/random'

const TABS = ['uuid', 'password', 'random', 'lorem'] as const

/** Runs `generate` now and whenever its inputs change; `regenerate` re-rolls. */
function useGenerated<T>(generate: () => T, deps: unknown[]): { value: T | null; error: string; regenerate: () => void } {
  const [state, setState] = useState<{ value: T | null; error: string }>({ value: null, error: '' })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(generate, deps)
  const regenerate = useCallback(() => {
    try {
      setState({ value: run(), error: '' })
    } catch (e) {
      setState({ value: null, error: e instanceof Error ? e.message : String(e) })
    }
  }, [run])
  useEffect(regenerate, [regenerate])
  return { ...state, regenerate }
}

function Field({ label, htmlFor, children, className }: { label: string; htmlFor?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} className="mb-1.5 text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  )
}

function clampInt(value: string, min: number, max: number, fallback: number) {
  const n = Math.floor(Number(value))
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback
}

function OutputList({
  title,
  items,
  error,
  onRegenerate,
  mono = true,
}: {
  title: string
  items: string[]
  error: string
  onRegenerate: () => void
  mono?: boolean
}) {
  return (
    <ToolPanel
      title={title}
      actions={
        <>
          <Button variant="ghost" size="xs" onClick={onRegenerate}>
            <RefreshCw /> Regenerate
          </Button>
          {items.length > 1 && <CopyButton value={items.join('\n')} label="Copy all" toolName="generators" />}
        </>
      }
      footer={items.length > 1 ? `${items.length} items` : undefined}
    >
      {() =>
        error ? (
          <p role="alert" className="px-3 py-4 text-sm text-destructive">
            {error}
          </p>
        ) : items.length > 1 && items.every((i) => i.length <= 12) ? (
          // Short values (numbers): compact chips instead of one tall row each
          <ul className="flex max-h-[28rem] flex-wrap gap-1.5 overflow-auto bg-code p-3" aria-live="polite">
            {items.map((item, i) => (
              <li key={`${i}-${item}`} className="rounded-md border bg-background px-2 py-0.5 font-mono text-[13px] tabular-nums">
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <ul className="max-h-[28rem] divide-y overflow-auto bg-code" aria-live="polite">
            {items.map((item, i) => (
              <li key={`${i}-${item}`} className="group flex items-start gap-2 px-3 py-2">
                <span className={mono ? 'min-w-0 flex-1 font-mono text-[13px] break-all' : 'min-w-0 flex-1 text-sm whitespace-pre-wrap'}>
                  {item}
                </span>
                {items.length > 1 ? (
                  <span className="opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <CopyButton value={item} label="Copy" iconOnly toolName="generators" />
                  </span>
                ) : (
                  <CopyButton value={item} toolName="generators" />
                )}
              </li>
            ))}
          </ul>
        )
      }
    </ToolPanel>
  )
}

// ── UUID ────────────────────────────────────────────────────────────

const UUID_VERSIONS: { value: UuidVersion; label: string; hint: string }[] = [
  { value: 'v4', label: 'v4', hint: 'Random. The default choice for IDs.' },
  { value: 'v7', label: 'v7', hint: 'Time-ordered + random. Sorts by creation time, ideal for database keys.' },
  { value: 'v1', label: 'v1', hint: 'Legacy time-based. Prefer v7 for new systems.' },
  { value: 'v5', label: 'v5', hint: 'Name-based (SHA-1). The same namespace and name always give the same UUID.' },
]

function UuidInspector() {
  const [value, setValue] = useState('')
  const info = useMemo(() => {
    if (!value.trim()) return null
    try {
      return { ok: inspectUuid(value) }
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) }
    }
  }, [value])

  return (
    <div className="space-y-2 rounded-xl border bg-card p-4 shadow-xs">
      <Label htmlFor="uuid-inspect">Inspect a UUID</Label>
      <Input
        id="uuid-inspect"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Paste a UUID to see its version and embedded time"
        className="font-mono text-[13px]"
        spellCheck={false}
      />
      {info?.error && <StatusPill tone="danger">{info.error}</StatusPill>}
      {info?.ok && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <StatusPill tone="success">
            {info.ok.isNil ? 'Nil UUID' : info.ok.isMax ? 'Max UUID' : `Valid · version ${info.ok.version}`}
          </StatusPill>
          <span className="text-muted-foreground">Variant: {info.ok.variant}</span>
          {info.ok.timestamp && (
            <span className="text-muted-foreground">
              Created {info.ok.timestamp.toISOString()} ({formatRelative((info.ok.timestamp.getTime() - Date.now()) / 1000)})
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function UuidTab() {
  const [version, setVersion] = useState<UuidVersion>('v4')
  const [count, setCount] = useState(5)
  const [uppercase, setUppercase] = useState(false)
  const [hyphens, setHyphens] = useState(true)
  const [braces, setBraces] = useState(false)
  const [namespace, setNamespace] = useState<string>(UUID_NAMESPACES.DNS)
  const [name, setName] = useState('example.com')

  const { value, error, regenerate } = useGenerated(
    () => generateUuids(version, count, { namespace, name }),
    [version, count, namespace, name],
  )
  const items = (value ?? []).map((id) => formatUuid(id, { uppercase, hyphens, braces }))
  const presetNs = Object.entries(UUID_NAMESPACES).find(([, v]) => v === namespace)?.[0] ?? 'custom'

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="space-y-4 rounded-xl border bg-card p-4 shadow-xs">
        <Field label="Version">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={version}
            onValueChange={(v) => v && setVersion(v as UuidVersion)}
            aria-label="UUID version"
          >
            {UUID_VERSIONS.map((v) => (
              <ToggleGroupItem key={v.value} value={v.value} className="px-3 font-mono">
                {v.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <p className="mt-1.5 text-xs text-muted-foreground">{UUID_VERSIONS.find((v) => v.value === version)!.hint}</p>
        </Field>

        {version === 'v5' ? (
          <>
            <Field label="Namespace">
              <Select value={presetNs} onValueChange={(v) => v !== 'custom' && setNamespace(UUID_NAMESPACES[v as keyof typeof UUID_NAMESPACES])}>
                <SelectTrigger className="w-full" aria-label="Namespace">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(UUID_NAMESPACES).map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom" disabled>
                    Custom (edit below)
                  </SelectItem>
                </SelectContent>
              </Select>
              <Input value={namespace} onChange={(e) => setNamespace(e.target.value)} className="mt-2 font-mono text-[13px]" aria-label="Namespace UUID" spellCheck={false} />
            </Field>
            <Field label="Name" htmlFor="uuid-name">
              <Input id="uuid-name" value={name} onChange={(e) => setName(e.target.value)} className="font-mono text-[13px]" spellCheck={false} />
            </Field>
          </>
        ) : (
          <Field label={`How many: ${count}`} htmlFor="uuid-count">
            <div className="flex items-center gap-3">
              <Slider id="uuid-count" min={1} max={100} value={[count]} onValueChange={([v]) => setCount(v)} className="flex-1" aria-label="Number of UUIDs" />
              <Input
                type="number"
                min={1}
                max={1000}
                value={count}
                onChange={(e) => setCount(clampInt(e.target.value, 1, 1000, 1))}
                className="w-20"
                aria-label="Number of UUIDs"
              />
            </div>
          </Field>
        )}

        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-xs text-muted-foreground">Format</legend>
          {(
            [
              { id: 'uuid-upper', label: 'Uppercase', checked: uppercase, set: setUppercase },
              { id: 'uuid-hyphens', label: 'Hyphens', checked: hyphens, set: setHyphens },
              { id: 'uuid-braces', label: '{Braces}', checked: braces, set: setBraces },
            ] satisfies { id: string; label: string; checked: boolean; set: (v: boolean) => void }[]
          ).map(({ id, label, checked, set }) => (
            <div key={id} className="flex items-center justify-between">
              <Label htmlFor={id} className="font-normal">
                {label}
              </Label>
              <Switch id={id} checked={checked} onCheckedChange={set} />
            </div>
          ))}
        </fieldset>
      </div>

      <div className="space-y-4">
        <OutputList title={`UUID ${version}`} items={items} error={error} onRegenerate={regenerate} />
        <UuidInspector />
      </div>
    </div>
  )
}

// ── Password ────────────────────────────────────────────────────────

const SET_LABELS: Record<CharsetName, string> = { lower: 'a–z', upper: 'A–Z', digits: '0–9', symbols: '!@#…' }

function entropyTone(bits: number): [StatusTone, string] {
  if (bits < 50) return ['danger', 'Weak']
  if (bits < 80) return ['warning', 'Fair']
  if (bits < 110) return ['success', 'Strong']
  return ['success', 'Very strong']
}

function PasswordTab() {
  const [length, setLength] = useState(20)
  const [sets, setSets] = useState<CharsetName[]>(['lower', 'upper', 'digits', 'symbols'])
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false)
  const [count, setCount] = useState(5)

  const options = { length, sets, excludeAmbiguous }
  const { value, error, regenerate } = useGenerated(
    () => Array.from({ length: count }, () => generatePassword(options)),
    [length, sets.join(), excludeAmbiguous, count],
  )
  const bits = passwordEntropy(options)
  const [tone, label] = entropyTone(bits)

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="space-y-4 rounded-xl border bg-card p-4 shadow-xs">
        <Field label={`Length: ${length}`} htmlFor="pw-length">
          <Slider id="pw-length" min={4} max={128} value={[length]} onValueChange={([v]) => setLength(v)} aria-label="Password length" />
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-xs text-muted-foreground">Characters</legend>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(CHARSETS) as CharsetName[]).map((set) => (
              <Label key={set} className="flex items-center gap-2 rounded-md border px-3 py-2 font-mono font-normal has-[:checked]:border-primary/50">
                <Checkbox
                  checked={sets.includes(set)}
                  onCheckedChange={(on) => setSets(on ? [...sets, set] : sets.filter((s) => s !== set))}
                />
                {SET_LABELS[set]}
              </Label>
            ))}
          </div>
        </fieldset>
        <div className="flex items-center justify-between">
          <Label htmlFor="pw-ambiguous" className="font-normal">
            Avoid look-alikes (l 1 I O 0)
          </Label>
          <Switch id="pw-ambiguous" checked={excludeAmbiguous} onCheckedChange={setExcludeAmbiguous} />
        </div>
        <Field label="How many" htmlFor="pw-count">
          <Input id="pw-count" type="number" min={1} max={100} value={count} onChange={(e) => setCount(clampInt(e.target.value, 1, 100, 1))} className="w-24" />
        </Field>
        <div className="flex items-center gap-2 border-t pt-3 text-sm">
          <StatusPill tone={tone}>{label}</StatusPill>
          <span className="text-muted-foreground">{bits} bits of entropy each</span>
        </div>
      </div>
      <OutputList title="Passwords" items={value ?? []} error={error} onRegenerate={regenerate} />
    </div>
  )
}

// ── Random numbers & bytes ─────────────────────────────────────────

function RandomTab() {
  const [min, setMin] = useState('1')
  const [max, setMax] = useState('100')
  const [count, setCount] = useState(10)
  const [unique, setUnique] = useState(false)
  const [bytes, setBytes] = useState(32)

  const numbers = useGenerated(() => randomInts(Number(min), Number(max), count, unique).map(String), [min, max, count, unique])
  const hex = useGenerated(() => [randomHex(bytes)], [bytes])

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 rounded-xl border bg-card p-4 shadow-xs sm:grid-cols-4">
          <Field label="Min" htmlFor="rnd-min">
            <Input id="rnd-min" type="number" value={min} onChange={(e) => setMin(e.target.value)} />
          </Field>
          <Field label="Max" htmlFor="rnd-max">
            <Input id="rnd-max" type="number" value={max} onChange={(e) => setMax(e.target.value)} />
          </Field>
          <Field label="Count" htmlFor="rnd-count">
            <Input id="rnd-count" type="number" min={1} max={1000} value={count} onChange={(e) => setCount(clampInt(e.target.value, 1, 1000, 1))} />
          </Field>
          <div className="flex items-end pb-2">
            <Label className="flex items-center gap-2 font-normal">
              <Switch checked={unique} onCheckedChange={setUnique} /> Unique
            </Label>
          </div>
        </div>
        <OutputList title="Random integers" items={numbers.value ?? []} error={numbers.error} onRegenerate={numbers.regenerate} />
      </div>
      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <Field label={`Random bytes: ${bytes} (${bytes * 8} bits)`} htmlFor="hex-bytes">
            <Slider id="hex-bytes" min={4} max={128} step={4} value={[bytes]} onValueChange={([v]) => setBytes(v)} aria-label="Number of bytes" />
          </Field>
        </div>
        <OutputList title="Hex string (API keys, secrets)" items={hex.value ?? []} error={hex.error} onRegenerate={hex.regenerate} />
      </div>
    </div>
  )
}

// ── Lorem ipsum ─────────────────────────────────────────────────────

function LoremTab() {
  const [unit, setUnit] = useState<LoremUnit>('paragraphs')
  const [count, setCount] = useState(3)
  const [classic, setClassic] = useState(true)
  const { value, regenerate } = useGenerated(() => lorem(unit, count, classic), [unit, count, classic])
  const text = value ?? ''

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4 rounded-xl border bg-card p-4 shadow-xs">
        <Field label="Unit">
          <ToggleGroup type="single" variant="outline" size="sm" value={unit} onValueChange={(v) => v && setUnit(v as LoremUnit)} aria-label="Unit">
            <ToggleGroupItem value="paragraphs" className="px-3">
              Paragraphs
            </ToggleGroupItem>
            <ToggleGroupItem value="sentences" className="px-3">
              Sentences
            </ToggleGroupItem>
            <ToggleGroupItem value="words" className="px-3">
              Words
            </ToggleGroupItem>
          </ToggleGroup>
        </Field>
        <Field label="Count" htmlFor="lorem-count">
          <Input id="lorem-count" type="number" min={1} max={500} value={count} onChange={(e) => setCount(clampInt(e.target.value, 1, 500, 1))} className="w-24" />
        </Field>
        <Label className="flex items-center gap-2 pb-2 font-normal">
          <Switch checked={classic} onCheckedChange={setClassic} /> Start with “Lorem ipsum”
        </Label>
      </div>
      <ToolPanel
        title="Placeholder text"
        actions={
          <>
            <Button variant="ghost" size="xs" onClick={regenerate}>
              <RefreshCw /> Regenerate
            </Button>
            <CopyButton value={text} toolName="generators" />
          </>
        }
        footer={`${text.split(/\s+/).filter(Boolean).length} words · ${text.length} characters`}
      >
        {() => <div className="max-h-[32rem] space-y-3 overflow-auto bg-code px-4 py-3 text-sm leading-relaxed">{text.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}</div>}
      </ToolPanel>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────

export default function GeneratorToolkit() {
  const [tab, setTab] = useTabParam(TABS)

  return (
    <ToolPage
      toolId="generators"
      meta={toolsMetadata.generators}
      reference={
        <ul className="list-disc space-y-1 pl-5">
          <li>Everything is generated with the Web Crypto API (crypto.getRandomValues), with no modulo bias.</li>
          <li>
            UUID v7 embeds a millisecond timestamp, so IDs sort by creation time and index well in databases. v4 is fully
            random.
          </li>
          <li>Password strength here is the exact entropy of a random password with these settings.</li>
        </ul>
      }
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="uuid">UUID</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="random">Numbers & hex</TabsTrigger>
          <TabsTrigger value="lorem">Lorem ipsum</TabsTrigger>
        </TabsList>
        <TabsContent value="uuid" className="mt-4">
          <UuidTab />
        </TabsContent>
        <TabsContent value="password" className="mt-4">
          <PasswordTab />
        </TabsContent>
        <TabsContent value="random" className="mt-4">
          <RandomTab />
        </TabsContent>
        <TabsContent value="lorem" className="mt-4">
          <LoremTab />
        </TabsContent>
      </Tabs>
    </ToolPage>
  )
}
