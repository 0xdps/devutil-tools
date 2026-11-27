import { useDeferredValue, useMemo, useState } from 'react'
import { ArrowLeftRight, CircleAlert, Eraser } from 'lucide-react'
import { ToolPage } from '@/components/tool/ToolPage'
import { CodeArea, ToolPanel } from '@/components/tool/ToolPanel'
import { CopyButton } from '@/components/tool/CopyButton'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toolsMetadata } from '@/config/seoConfig'
import { transform, type EncodingScheme } from '@/lib/encoding'

type Mode = 'encode' | 'decode'

const schemes: { value: EncodingScheme; label: string; hint: string }[] = [
  { value: 'base64', label: 'Base64', hint: 'Binary-to-text using 64 ASCII characters. Used in email attachments, data URLs and HTTP Basic auth.' },
  { value: 'base64url', label: 'Base64URL', hint: 'Base64 with - and _ instead of + and /, without padding. Used in JWTs and URLs.' },
  { value: 'url', label: 'URL', hint: 'Percent-encodes characters that are unsafe in URLs. Decoding also treats + as a space.' },
  { value: 'html', label: 'HTML', hint: 'Escapes < > & " \' as entities. Decoding understands numeric and common named entities.' },
  { value: 'base32', label: 'Base32', hint: 'RFC 4648, A–Z and 2–7. Case-insensitive; used in TOTP secrets.' },
  { value: 'base58', label: 'Base58', hint: 'Bitcoin alphabet: no 0, O, I or l, so it is easy to read aloud.' },
  { value: 'datauri', label: 'Data URI', hint: 'Embeds text inline as data:text/plain. Decoding accepts both percent-encoded and ;base64 payloads.' },
]

const byteLength = (s: string) => new TextEncoder().encode(s).length

export default function Encoding() {
  const [scheme, setScheme] = useState<EncodingScheme>('base64')
  const [mode, setMode] = useState<Mode>('encode')
  const [input, setInput] = useState('')
  const deferredInput = useDeferredValue(input)

  const result = useMemo((): { output: string; error?: string } => {
    if (!deferredInput) return { output: '' }
    try {
      return { output: transform(scheme, mode, deferredInput) }
    } catch (e) {
      return { output: '', error: e instanceof Error ? e.message : String(e) }
    }
  }, [scheme, mode, deferredInput])

  const swap = () => {
    if (result.output) setInput(result.output)
    setMode((m) => (m === 'encode' ? 'decode' : 'encode'))
  }

  const active = schemes.find((s) => s.value === scheme)!
  const verb = mode === 'encode' ? 'Encoded' : 'Decoded'

  return (
    <ToolPage
      toolId="encoding"
      meta={toolsMetadata.encoding}
      reference={
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {schemes.map((s) => (
            <div key={s.value}>
              <dt className="font-medium text-foreground">{s.label}</dt>
              <dd>{s.hint}</dd>
            </div>
          ))}
        </dl>
      }
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={scheme}
          onValueChange={(v) => v && setScheme(v as EncodingScheme)}
          aria-label="Encoding scheme"
          className="flex-wrap"
        >
          {schemes.map((s) => (
            <ToggleGroupItem key={s.value} value={s.value} className="px-3">
              {s.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList aria-label="Direction">
            <TabsTrigger value="encode">Encode</TabsTrigger>
            <TabsTrigger value="decode">Decode</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <p className="-mt-2 text-sm text-muted-foreground">{active.hint}</p>

      <div className="grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1fr]">
        <ToolPanel
          title={mode === 'encode' ? 'Plain text' : `${active.label} input`}
          actions={
            <Button variant="ghost" size="xs" onClick={() => setInput('')} disabled={!input}>
              <Eraser /> Clear
            </Button>
          }
          footer={`${input.length.toLocaleString()} chars · ${byteLength(input).toLocaleString()} bytes`}
        >
          {(labelId) => (
            <CodeArea
              aria-labelledby={labelId}
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mode === 'encode' ? 'Type or paste text to encode…' : `Paste ${active.label} to decode…`}
            />
          )}
        </ToolPanel>

        <div className="flex items-center justify-center">
          <Button
            variant="outline"
            size="icon"
            onClick={swap}
            aria-label="Swap: use output as input and reverse direction"
            title="Swap input and output"
            className="rotate-90 rounded-full lg:rotate-0"
          >
            <ArrowLeftRight />
          </Button>
        </div>

        <ToolPanel
          title={`${verb} (${active.label})`}
          actions={<CopyButton value={result.output} toolName="encoding" />}
          footer={
            result.error ? (
              <span role="alert" className="flex items-center gap-1.5 text-destructive">
                <CircleAlert className="size-3.5" /> {result.error}
              </span>
            ) : (
              `${result.output.length.toLocaleString()} chars · ${byteLength(result.output).toLocaleString()} bytes`
            )
          }
        >
          {(labelId) => (
            <CodeArea
              aria-labelledby={labelId}
              readOnly
              value={result.output}
              placeholder="Result appears as you type"
              aria-invalid={!!result.error}
            />
          )}
        </ToolPanel>
      </div>
    </ToolPage>
  )
}
