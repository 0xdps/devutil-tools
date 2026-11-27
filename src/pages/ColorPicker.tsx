import { useMemo, useState } from 'react'
import { ArrowUpDown, Check, Pipette } from 'lucide-react'
import { ToolPage } from '@/components/tool/ToolPage'
import { ToolPanel } from '@/components/tool/ToolPanel'
import { CopyButton } from '@/components/tool/CopyButton'
import { StatusPill } from '@/components/tool/StatusPill'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toolsMetadata } from '@/config/seoConfig'
import { contrastRatio, formatAll, generateScale, parseColor, readableTextOn, toHex, wcagLevels, type Rgba } from '@/lib/color'
import { cn } from '@/lib/utils'

// EyeDropper API (Chromium) isn't in the DOM typings yet.
declare global {
  interface Window {
    EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> }
  }
}

const CHECKERBOARD =
  'repeating-conic-gradient(color-mix(in oklch, var(--foreground) 12%, transparent) 0% 25%, transparent 0% 50%) 50% / 14px 14px'

function css(c: Rgba) {
  return `rgb(${c.r} ${c.g} ${c.b} / ${c.a})`
}

function useColorInput(initial: string) {
  const [text, setText] = useState(initial)
  const parsed = useMemo(() => {
    try {
      return { color: parseColor(text) }
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) }
    }
  }, [text])
  return { text, setText, ...parsed }
}

function ColorField({
  id,
  label,
  text,
  setText,
  color,
  error,
}: {
  id: string
  label: string
  text: string
  setText: (s: string) => void
  color?: Rgba
  error?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <label className="relative size-10 shrink-0 cursor-pointer overflow-hidden rounded-md border shadow-xs" style={{ background: CHECKERBOARD }}>
          <span className="absolute inset-0" style={{ background: color ? css(color) : 'transparent' }} />
          <input
            type="color"
            className="absolute inset-0 cursor-pointer opacity-0"
            value={color ? toHex({ ...color, a: 1 }, false) : '#000000'}
            onChange={(e) => setText(e.target.value)}
            aria-label={`${label}: open color picker`}
          />
        </label>
        <Input
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="h-10 font-mono"
          spellCheck={false}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

function Level({ ok, label }: { ok: boolean; label: string }) {
  return <StatusPill tone={ok ? 'success' : 'danger'}>{`${label} ${ok ? 'pass' : 'fail'}`}</StatusPill>
}

export default function ColorPicker() {
  const main = useColorInput('#0ea5e9')
  const bg = useColorInput('#ffffff')
  const [lastGood, setLastGood] = useState<Rgba>({ r: 14, g: 165, b: 233, a: 1 })
  const color = main.color ?? lastGood
  if (main.color && toHex(main.color) !== toHex(lastGood)) setLastGood(main.color)

  const formats = formatAll(color)
  const scale = useMemo(() => generateScale(color), [color])
  const ratio = bg.color ? contrastRatio(color, bg.color) : null
  const levels = ratio ? wcagLevels(ratio) : null
  const eyeDropperSupported = typeof window !== 'undefined' && 'EyeDropper' in window

  const pickFromScreen = async () => {
    try {
      const result = await new window.EyeDropper!().open()
      main.setText(result.sRGBHex)
    } catch {
      /* user cancelled */
    }
  }

  const scaleCss = scale.map((s) => `  --color-brand-${s.step}: ${toHex(s.color)};`).join('\n')

  return (
    <ToolPage
      toolId="color-picker"
      meta={toolsMetadata.colorPicker}
      reference={
        <ul className="list-disc space-y-1 pl-5">
          <li>Accepts any CSS color: hex (3, 4, 6 or 8 digits), rgb(), hsl(), hwb(), oklch() and the 148 named colors.</li>
          <li>WCAG 2 contrast: 4.5:1 for normal text and 3:1 for large text (AA); 7:1 and 4.5:1 for AAA.</li>
          <li>The scale is generated in OKLCH, so steps look evenly spaced and keep the same hue.</li>
        </ul>
      }
    >
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="space-y-3">
          <div className="relative h-48 overflow-hidden rounded-xl border shadow-xs" style={{ background: CHECKERBOARD }}>
            <div className="absolute inset-0 flex items-end justify-between p-4" style={{ background: css(color), color: css(readableTextOn(color)) }}>
              <span className="font-mono text-2xl font-semibold">{toHex(color)}</span>
              {eyeDropperSupported && (
                <Button variant="secondary" size="sm" onClick={pickFromScreen}>
                  <Pipette /> Pick from screen
                </Button>
              )}
            </div>
          </div>
          <ColorField id="color-main" label="Color" text={main.text} setText={main.setText} color={main.color} error={main.error} />
        </div>

        <ToolPanel title="Formats">
          {() => (
            <dl className="divide-y">
              {formats.map((f) => (
                <div key={f.id} className="flex items-center gap-3 px-3 py-2.5">
                  <dt className="w-16 shrink-0 text-xs text-muted-foreground">{f.label}</dt>
                  <dd className="min-w-0 flex-1 font-mono text-[13px] break-all">{f.value}</dd>
                  <CopyButton value={f.value} label={`Copy ${f.label}`} iconOnly toolName="color_picker" />
                </div>
              ))}
            </dl>
          )}
        </ToolPanel>
      </div>

      <section aria-labelledby="contrast-title" className="space-y-4 rounded-xl border bg-card p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="contrast-title" className="text-sm font-semibold">
            Contrast checker
          </h2>
          {ratio !== null && (
            <span className="font-mono text-2xl font-semibold tabular-nums">
              {ratio.toFixed(2)}
              <span className="text-base text-muted-foreground">:1</span>
            </span>
          )}
        </div>
        <div className="grid items-end gap-4 md:grid-cols-[1fr_auto_1fr]">
          <div className="space-y-1.5">
            <Label>Text (the color above)</Label>
            <div className="flex h-10 items-center gap-2 rounded-md border bg-code px-3 font-mono text-sm">
              <span className="size-4 rounded-sm border" style={{ background: css(color) }} />
              {toHex(color)}
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="Swap text and background"
            title="Swap"
            onClick={() => {
              const fgText = main.text
              main.setText(bg.text)
              bg.setText(fgText)
            }}
          >
            <ArrowUpDown />
          </Button>
          <ColorField id="color-bg" label="Background" text={bg.text} setText={bg.setText} color={bg.color} error={bg.error} />
        </div>
        {bg.color && levels && (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border p-4" style={{ background: css({ ...bg.color, a: 1 }), color: css(color) }}>
              <p className="text-sm">Normal text: the quick brown fox jumps over the lazy dog.</p>
              <p className="mt-1 text-xl font-semibold">Large text, 18pt or 14pt bold</p>
            </div>
            <div className="flex flex-wrap content-start gap-2">
              <Level ok={levels.aaNormal} label="AA normal" />
              <Level ok={levels.aaLarge} label="AA large" />
              <Level ok={levels.aaaNormal} label="AAA normal" />
              <Level ok={levels.aaaLarge} label="AAA large" />
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="scale-title" className="space-y-3 rounded-xl border bg-card p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="scale-title" className="text-sm font-semibold">
            Tints & shades
          </h2>
          <CopyButton value={`:root {\n${scaleCss}\n}`} label="Copy as CSS variables" toolName="color_picker" />
        </div>
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-11">
          {scale.map(({ step, color: c }) => {
            const hex = toHex(c)
            const current = hex === toHex({ ...color, a: 1 })
            return (
              <li key={step}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => main.setText(hex)}
                      className={cn(
                        'flex h-16 w-full flex-col justify-end rounded-md p-1.5 text-left font-mono text-[10px] leading-tight shadow-xs ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                        current && 'ring-2 ring-ring',
                      )}
                      style={{ background: hex, color: css(readableTextOn(c)) }}
                      aria-label={`Use ${step}: ${hex}`}
                    >
                      <span className="flex items-center gap-0.5 font-semibold">
                        {step} {current && <Check className="size-3" />}
                      </span>
                      <span>{hex}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Use {hex}</TooltipContent>
                </Tooltip>
              </li>
            )
          })}
        </ul>
      </section>
    </ToolPage>
  )
}
