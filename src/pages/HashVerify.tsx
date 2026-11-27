import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, Loader2, ShieldAlert, Sparkles } from 'lucide-react'
import { ToolPage } from '@/components/tool/ToolPage'
import { CodeArea, ToolPanel } from '@/components/tool/ToolPanel'
import { CopyButton } from '@/components/tool/CopyButton'
import { FileDrop } from '@/components/tool/FileDrop'
import { StatusPill } from '@/components/tool/StatusPill'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { toolsMetadata } from '@/config/seoConfig'
import { useTabParam } from '@/hooks/use-tab-param'
import { base64ToBytes } from '@/lib/encoding'
import {
  HASH_ALGORITHMS,
  HMAC_ALGORITHMS,
  WEAK_ALGORITHMS,
  bytesEqual,
  digest,
  formatDigest,
  hexToBytes,
  hmac,
  parseExpectedDigest,
  type DigestFormat,
  type HashAlgorithm,
} from '@/lib/hash'
import { estimatePassword } from '@/lib/password'
import { cn } from '@/lib/utils'

const TABS = ['hash', 'hmac', 'password'] as const
const MAX_FILE_BYTES = 1024 * 1024 * 1024 // 1 GB: digests read the whole file into memory
const utf8 = (s: string) => new TextEncoder().encode(s)

type Digests = Partial<Record<HashAlgorithm, Uint8Array>>

function FormatToggle({ value, onChange }: { value: DigestFormat; onChange: (f: DigestFormat) => void }) {
  return (
    <ToggleGroup
      type="single"
      size="sm"
      variant="outline"
      value={value}
      onValueChange={(v) => v && onChange(v as DigestFormat)}
      aria-label="Output format"
    >
      <ToggleGroupItem value="hex" className="px-2.5 font-mono text-xs">
        hex
      </ToggleGroupItem>
      <ToggleGroupItem value="HEX" className="px-2.5 font-mono text-xs">
        HEX
      </ToggleGroupItem>
      <ToggleGroupItem value="base64" className="px-2.5 text-xs">
        Base64
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

function DigestRows({
  digests,
  format,
  busy,
  match,
  prefix = '',
}: {
  digests: Digests
  format: DigestFormat
  busy: boolean
  match?: HashAlgorithm
  prefix?: string
}) {
  const algorithms = (Object.keys(digests) as HashAlgorithm[]).length ? (Object.keys(digests) as HashAlgorithm[]) : []
  if (!algorithms.length) {
    return (
      <p className="px-3 py-6 text-center text-sm text-muted-foreground">
        {busy ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Hashing…
          </span>
        ) : (
          'Digests appear here as you type.'
        )}
      </p>
    )
  }
  return (
    <ul className={cn('divide-y transition-opacity', busy && 'opacity-60')}>
      {algorithms.map((alg) => {
        const value = formatDigest(digests[alg]!, format)
        return (
          <li key={alg} className={cn('flex items-start gap-3 px-3 py-2.5', match === alg && 'bg-success/10')}>
            <div className="w-28 shrink-0 pt-0.5">
              <div className="text-sm font-medium">
                {prefix}
                {alg}
              </div>
              {WEAK_ALGORITHMS.has(alg) && <div className="text-[11px] text-warning">not for security</div>}
            </div>
            <code className="min-w-0 flex-1 pt-0.5 font-mono text-[13px] break-all">{value}</code>
            <CopyButton value={value} label={`Copy ${prefix}${alg}`} iconOnly toolName="hash_verify" />
          </li>
        )
      })}
    </ul>
  )
}

// ── Hash ────────────────────────────────────────────────────────────

function HashTab() {
  const [source, setSource] = useState<'text' | 'file'>('text')
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [format, setFormat] = useState<DigestFormat>('hex')
  const [expected, setExpected] = useState('')
  const [digests, setDigests] = useState<Digests>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const deferredText = useDeferredValue(text)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setError('')
      if (source === 'file' && !file) return setDigests({})
      if (source === 'file' && file && file.size > MAX_FILE_BYTES) {
        setDigests({})
        return setError('Files over 1 GB are too large to hash in the browser.')
      }
      setBusy(true)
      try {
        const data = source === 'file' ? new Uint8Array(await file!.arrayBuffer()) : utf8(deferredText)
        const entries = await Promise.all(HASH_ALGORITHMS.map(async (alg) => [alg, await digest(alg, data)] as const))
        if (!cancelled) setDigests(Object.fromEntries(entries))
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setBusy(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [source, deferredText, file])

  const expectedBytes = useMemo(() => parseExpectedDigest(expected), [expected])
  const match = expectedBytes
    ? (Object.keys(digests) as HashAlgorithm[]).find((alg) => bytesEqual(digests[alg]!, expectedBytes))
    : undefined

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <ToolPanel
        title="Input"
        actions={
          <Tabs value={source} onValueChange={(v) => setSource(v as 'text' | 'file')}>
            <TabsList className="h-7" aria-label="Input source">
              <TabsTrigger value="text" className="px-2 text-xs">
                Text
              </TabsTrigger>
              <TabsTrigger value="file" className="px-2 text-xs">
                File
              </TabsTrigger>
            </TabsList>
          </Tabs>
        }
        footer={source === 'text' ? `${utf8(text).length.toLocaleString()} bytes (UTF-8)` : undefined}
      >
        {(labelId) =>
          source === 'text' ? (
            <CodeArea aria-labelledby={labelId} autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Type or paste text to hash…" />
          ) : (
            <div className="p-3">
              <FileDrop file={file} onFile={setFile} hint="Up to 1 GB" />
            </div>
          )
        }
      </ToolPanel>

      <div className="space-y-4">
        <ToolPanel title="Digests" actions={<FormatToggle value={format} onChange={setFormat} />}>
          {() =>
            error ? (
              <p role="alert" className="px-3 py-4 text-sm text-destructive">
                {error}
              </p>
            ) : (
              <DigestRows digests={digests} format={format} busy={busy} match={match} />
            )
          }
        </ToolPanel>

        <div className="space-y-2 rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="expected-hash">Verify against a checksum</Label>
            {expected.trim() &&
              (match ? (
                <StatusPill tone="success">Matches {match}</StatusPill>
              ) : expectedBytes ? (
                <StatusPill tone="danger">No match</StatusPill>
              ) : (
                <StatusPill tone="neutral">Not a hex or Base64 digest</StatusPill>
              ))}
          </div>
          <Input
            id="expected-hash"
            value={expected}
            onChange={(e) => setExpected(e.target.value)}
            placeholder="Paste the published SHA-256 / MD5 / … (hex or Base64)"
            className="font-mono text-[13px]"
            spellCheck={false}
          />
          <p className="text-xs text-muted-foreground">The algorithm is detected automatically. Lines like “&lt;hash&gt;  file.iso” work too.</p>
        </div>
      </div>
    </div>
  )
}

// ── HMAC ────────────────────────────────────────────────────────────

type KeyEncoding = 'utf8' | 'hex' | 'base64'

function HmacTab() {
  const [message, setMessage] = useState('')
  const [key, setKey] = useState('')
  const [keyEncoding, setKeyEncoding] = useState<KeyEncoding>('utf8')
  const [format, setFormat] = useState<DigestFormat>('hex')
  const [digests, setDigests] = useState<Digests>({})
  const [error, setError] = useState('')
  const deferredMessage = useDeferredValue(message)
  const deferredKey = useDeferredValue(key)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      let keyBytes: Uint8Array
      try {
        keyBytes = keyEncoding === 'hex' ? hexToBytes(deferredKey) : keyEncoding === 'base64' ? base64ToBytes(deferredKey) : utf8(deferredKey)
      } catch {
        setDigests({})
        return setError(`The key is not valid ${keyEncoding === 'hex' ? 'hex' : 'Base64'}.`)
      }
      setError('')
      const data = utf8(deferredMessage)
      const entries = await Promise.all(HMAC_ALGORITHMS.map(async (alg) => [alg, await hmac(alg, keyBytes, data)] as const))
      if (!cancelled) setDigests(Object.fromEntries(entries))
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [deferredMessage, deferredKey, keyEncoding])

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="hmac-key">Secret key</Label>
          <div className="flex gap-2">
            <Input
              id="hmac-key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Shared secret"
              className="flex-1 font-mono"
              autoComplete="off"
              spellCheck={false}
            />
            <Select value={keyEncoding} onValueChange={(v) => setKeyEncoding(v as KeyEncoding)}>
              <SelectTrigger className="w-28" aria-label="Key encoding">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="utf8">Text</SelectItem>
                <SelectItem value="hex">Hex</SelectItem>
                <SelectItem value="base64">Base64</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <ToolPanel title="Message">
          {(labelId) => (
            <CodeArea aria-labelledby={labelId} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message to sign…" />
          )}
        </ToolPanel>
      </div>
      <ToolPanel title="HMAC signatures" actions={<FormatToggle value={format} onChange={setFormat} />}>
        {() =>
          error ? (
            <p role="alert" className="px-3 py-4 text-sm text-destructive">
              {error}
            </p>
          ) : (
            <DigestRows digests={digests} format={format} busy={false} prefix="HMAC-" />
          )
        }
      </ToolPanel>
    </div>
  )
}

// ── Password strength ───────────────────────────────────────────────

const METER = ['bg-destructive', 'bg-destructive', 'bg-warning', 'bg-success', 'bg-success']

function PasswordTab() {
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const estimate = useMemo(() => (password ? estimatePassword(password) : null), [password])

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="space-y-2">
        <Label htmlFor="pw-input">Password</Label>
        <div className="relative">
          <Input
            id="pw-input"
            type={visible ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Type a password to test"
            className="h-11 pr-11 font-mono text-base"
            autoComplete="off"
            spellCheck={false}
            aria-describedby="pw-result"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute top-1/2 right-1.5 -translate-y-1/2"
            onClick={() => setVisible(!visible)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
          >
            {visible ? <EyeOff /> : <Eye />}
          </Button>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldAlert className="size-3.5" /> Checked locally. Still, don’t paste passwords you actually use into websites.
        </p>
      </div>

      <div id="pw-result" aria-live="polite" className="space-y-4">
        {estimate && (
          <>
            <div className="space-y-2">
              <div className="flex gap-1.5" role="meter" aria-valuemin={0} aria-valuemax={4} aria-valuenow={estimate.score} aria-label="Strength">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className={cn('h-2 flex-1 rounded-full bg-muted', i <= estimate.score && METER[estimate.score])} />
                ))}
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-lg font-semibold">{estimate.label}</span>
                <span className="text-sm text-muted-foreground">≈ {estimate.bits} bits of entropy</span>
              </div>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-card p-3">
                <dt className="text-xs text-muted-foreground">Offline attack (10 billion guesses/s)</dt>
                <dd className="mt-1 font-medium">{estimate.offlineCrackTime}</dd>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <dt className="text-xs text-muted-foreground">Online, rate-limited (100 guesses/h)</dt>
                <dd className="mt-1 font-medium">{estimate.onlineCrackTime}</dd>
              </div>
            </dl>

            {estimate.warnings.length > 0 && (
              <ul className="space-y-1 text-sm text-destructive">
                {estimate.warnings.map((w) => (
                  <li key={w}>• {w}</li>
                ))}
              </ul>
            )}
            <ul className="space-y-1 text-sm text-muted-foreground">
              {estimate.suggestions.map((s) => (
                <li key={s}>• {s}</li>
              ))}
            </ul>
          </>
        )}
        <Button variant="outline" size="sm" asChild>
          <Link to="/generators?tab=password">
            <Sparkles /> Generate a strong password
          </Link>
        </Button>
      </div>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────

export default function HashVerify() {
  const [tab, setTab] = useTabParam(TABS)

  return (
    <ToolPage
      toolId="hash-verify"
      meta={toolsMetadata.hashVerify}
      reference={
        <ul className="list-disc space-y-1 pl-5">
          <li>MD5 and SHA-1 are broken for security (collisions are practical). Use them only to match legacy checksums.</li>
          <li>A hash is not a password store. Use a slow, salted algorithm such as Argon2, scrypt or bcrypt for passwords.</li>
          <li>HMAC proves a message came from someone holding the key; it is how webhooks and JWT HS256 are signed.</li>
          <li>The strength estimate checks common passwords, keyboard walks, sequences, repeats and dates. It is an estimate.</li>
        </ul>
      }
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="hash">Hash</TabsTrigger>
          <TabsTrigger value="hmac">HMAC</TabsTrigger>
          <TabsTrigger value="password">Password strength</TabsTrigger>
        </TabsList>
        <TabsContent value="hash" className="mt-4">
          <HashTab />
        </TabsContent>
        <TabsContent value="hmac" className="mt-4">
          <HmacTab />
        </TabsContent>
        <TabsContent value="password" className="mt-4">
          <PasswordTab />
        </TabsContent>
      </Tabs>
    </ToolPage>
  )
}
