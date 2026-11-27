import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Eraser, FlaskConical, KeyRound, Lock } from 'lucide-react'
import { ToolPage } from '@/components/tool/ToolPage'
import { CodeArea, ToolPanel } from '@/components/tool/ToolPanel'
import { CopyButton } from '@/components/tool/CopyButton'
import { JsonView } from '@/components/tool/JsonView'
import { StatusPill, type StatusTone } from '@/components/tool/StatusPill'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toolsMetadata } from '@/config/seoConfig'
import {
  CLAIM_LABELS,
  TIME_CLAIMS,
  decodeJwt,
  formatRelative,
  keyKindFor,
  tokenStatus,
  verifyJwtSignature,
  type DecodedJwt,
  type JsonObject,
} from '@/lib/jwt'

const EXAMPLE_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkYSBMb3ZlbGFjZSIsImVtYWlsIjoiYWRhQGV4YW1wbGUuY29tIiwicm9sZXMiOlsiYWRtaW4iLCJlZGl0b3IiXSwiaXNzIjoiaHR0cHM6Ly9hdXRoLmV4YW1wbGUuY29tIiwiYXVkIjoiZGV2dXRpbCIsImlhdCI6MTc2NzIyNTYwMCwiZXhwIjo0MTAyNDQ0ODAwfQ.ToEq3HpIuoV9lYfjj1v4ucScGfsj2pOFuYozmxOepv0'
const EXAMPLE_SECRET = 'devutil-example-secret'

const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'long' })

function formatClaimTime(seconds: number) {
  const date = new Date(seconds * 1000)
  if (Number.isNaN(date.getTime())) return null
  return { absolute: dateFmt.format(date), relative: formatRelative(seconds - Date.now() / 1000) }
}

function ClaimsTable({ claims }: { claims: JsonObject }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <tbody>
          {Object.entries(claims).map(([key, value]) => {
            const time = TIME_CLAIMS.has(key) && typeof value === 'number' ? formatClaimTime(value) : null
            return (
              <tr key={key} className="border-b last:border-0 align-top">
                <th scope="row" className="w-40 px-3 py-2 text-left font-normal">
                  <code className="font-mono text-[13px] text-primary">{key}</code>
                  {CLAIM_LABELS[key] && <div className="text-xs text-muted-foreground">{CLAIM_LABELS[key]}</div>}
                </th>
                <td className="px-3 py-2 font-mono text-[13px] break-all">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  {time && (
                    <div className="mt-0.5 font-sans text-xs text-muted-foreground">
                      {time.absolute} · {time.relative}
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ValidityPill({ payload }: { payload: JsonObject }) {
  const status = tokenStatus(payload)
  const map: Record<typeof status.state, [StatusTone, string]> = {
    valid: ['success', `Not expired · expires ${formatRelative(status.expiresIn ?? 0)}`],
    expired: ['danger', `Expired ${formatRelative(status.expiresIn ?? 0)}`],
    'not-yet-valid': ['warning', `Not valid yet · starts ${formatRelative(status.validIn ?? 0)}`],
    'no-expiry': ['neutral', 'No expiry (exp) claim'],
  }
  const [tone, label] = map[status.state]
  return <StatusPill tone={tone}>{label}</StatusPill>
}

type VerifyState = { status: 'idle' } | { status: 'checking' } | { status: 'done'; valid: boolean } | { status: 'error'; message: string }

function VerifySignature({ jwt, initialKey }: { jwt: DecodedJwt; initialKey: string }) {
  const keyKind = keyKindFor(jwt.header.alg)
  const [key, setKey] = useState(initialKey)
  const [base64Secret, setBase64Secret] = useState(false)
  const [result, setResult] = useState<VerifyState>({ status: 'idle' })
  const deferredKey = useDeferredValue(key)

  useEffect(() => setKey(initialKey), [initialKey])

  useEffect(() => {
    if (!deferredKey.trim() || keyKind === 'unsupported') {
      setResult({ status: 'idle' })
      return
    }
    let cancelled = false
    setResult({ status: 'checking' })
    verifyJwtSignature(jwt, deferredKey, { secretEncoding: base64Secret ? 'base64' : 'utf8' })
      .then((valid) => !cancelled && setResult({ status: 'done', valid }))
      .catch((e: unknown) => !cancelled && setResult({ status: 'error', message: e instanceof Error ? e.message : String(e) }))
    return () => {
      cancelled = true
    }
  }, [jwt, deferredKey, base64Secret, keyKind])

  return (
    <section aria-labelledby="verify-title" className="space-y-3 rounded-xl border bg-card p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="verify-title" className="flex items-center gap-2 text-sm font-medium">
          <KeyRound className="size-4 text-muted-foreground" /> Verify signature
        </h2>
        {result.status === 'done' &&
          (result.valid ? (
            <StatusPill tone="success">Signature verified</StatusPill>
          ) : (
            <StatusPill tone="danger">Invalid signature</StatusPill>
          ))}
        {result.status === 'checking' && <StatusPill tone="neutral">Checking…</StatusPill>}
      </div>

      {keyKind === 'unsupported' ? (
        <p className="text-sm text-muted-foreground">
          {jwt.header.alg === 'none'
            ? 'This token is unsigned (alg “none”). Never accept unsigned tokens.'
            : `Verification isn’t available for alg “${String(jwt.header.alg)}”.`}
        </p>
      ) : keyKind === 'secret' ? (
        <div className="space-y-2">
          <Label htmlFor="jwt-secret" className="text-xs text-muted-foreground">
            Shared secret ({String(jwt.header.alg)})
          </Label>
          <Input
            id="jwt-secret"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Enter the HMAC secret"
            className="font-mono"
            autoComplete="off"
            spellCheck={false}
          />
          <div className="flex items-center gap-2">
            <Switch id="jwt-b64" size="sm" checked={base64Secret} onCheckedChange={setBase64Secret} />
            <Label htmlFor="jwt-b64" className="text-xs font-normal text-muted-foreground">
              Secret is Base64-encoded
            </Label>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="jwt-pubkey" className="text-xs text-muted-foreground">
            Public key ({String(jwt.header.alg)}): PEM or JWK
          </Label>
          <CodeArea
            id="jwt-pubkey"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={'-----BEGIN PUBLIC KEY-----\n…\n-----END PUBLIC KEY-----'}
            className="min-h-28 rounded-md border md:min-h-28"
          />
        </div>
      )}

      {result.status === 'error' && (
        <p role="alert" className="text-xs text-destructive">
          {result.message}
        </p>
      )}
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="size-3" /> Verified with WebCrypto in your browser. Keys are never sent anywhere.
      </p>
    </section>
  )
}

export default function JWTDecoder() {
  const [token, setToken] = useState('')
  const [payloadView, setPayloadView] = useState<'claims' | 'json'>('claims')
  const deferredToken = useDeferredValue(token)

  const result = useMemo((): { jwt?: DecodedJwt; error?: string } => {
    if (!deferredToken.trim()) return {}
    try {
      return { jwt: decodeJwt(deferredToken) }
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) }
    }
  }, [deferredToken])

  const { jwt, error } = result
  const isExample = token.trim() === EXAMPLE_TOKEN

  return (
    <ToolPage
      toolId="jwt-decoder"
      meta={toolsMetadata.jwtDecoder}
      reference={
        <ul className="list-disc space-y-1 pl-5">
          <li>A JWT is three Base64URL parts: header, payload (claims) and signature. Anyone can read the first two.</li>
          <li>Decoding is not verification. Only trust claims after the signature checks out with the issuer’s key.</li>
          <li>
            Time claims (<code>exp</code>, <code>nbf</code>, <code>iat</code>) are seconds since the Unix epoch, shown here in
            your local time zone.
          </li>
        </ul>
      }
    >
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="space-y-4 lg:sticky lg:top-20">
          <ToolPanel
            title="Encoded token"
            actions={
              <>
                <Button variant="ghost" size="xs" onClick={() => setToken(EXAMPLE_TOKEN)}>
                  <FlaskConical /> Example
                </Button>
                <Button variant="ghost" size="xs" onClick={() => setToken('')} disabled={!token}>
                  <Eraser /> Clear
                </Button>
              </>
            }
            footer={
              error ? (
                <span role="alert" className="text-destructive">
                  {error}
                </span>
              ) : jwt ? (
                <span className="flex flex-wrap gap-x-3">
                  <span>
                    alg <code className="text-foreground">{String(jwt.header.alg ?? '—')}</code>
                  </span>
                  {jwt.header.typ !== undefined && (
                    <span>
                      typ <code className="text-foreground">{String(jwt.header.typ)}</code>
                    </span>
                  )}
                  {jwt.header.kid !== undefined && (
                    <span className="truncate">
                      kid <code className="text-foreground">{String(jwt.header.kid)}</code>
                    </span>
                  )}
                </span>
              ) : (
                'Paste a token. A “Bearer ” prefix is fine.'
              )
            }
          >
            {(labelId) => (
              <CodeArea
                aria-labelledby={labelId}
                autoFocus
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="eyJhbGciOi…"
                aria-invalid={!!error}
                className="break-all md:min-h-48"
              />
            )}
          </ToolPanel>

          {jwt && <VerifySignature jwt={jwt} initialKey={isExample ? EXAMPLE_SECRET : ''} />}
        </div>

        {jwt ? (
          <div className="space-y-4">
            <ValidityPill payload={jwt.payload} />

            <ToolPanel title="Header" actions={<CopyButton value={JSON.stringify(jwt.header, null, 2)} toolName="jwt_decoder" />}>
              {() => <JsonView value={jwt.header} />}
            </ToolPanel>

            <ToolPanel
              title="Payload"
              actions={
                <>
                  <Tabs value={payloadView} onValueChange={(v) => setPayloadView(v as 'claims' | 'json')}>
                    <TabsList className="h-7" aria-label="Payload view">
                      <TabsTrigger value="claims" className="px-2 text-xs">
                        Claims
                      </TabsTrigger>
                      <TabsTrigger value="json" className="px-2 text-xs">
                        JSON
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <CopyButton value={JSON.stringify(jwt.payload, null, 2)} toolName="jwt_decoder" />
                </>
              }
            >
              {() => (payloadView === 'json' ? <JsonView value={jwt.payload} /> : <ClaimsTable claims={jwt.payload} />)}
            </ToolPanel>

            <ToolPanel title="Signature" actions={<CopyButton value={jwt.signature} toolName="jwt_decoder" />}>
              {() => (
                <p className="bg-code px-3 py-2.5 font-mono text-[13px] break-all text-muted-foreground">
                  {jwt.signature || <em className="font-sans">empty (unsigned token)</em>}
                </p>
              )}
            </ToolPanel>
          </div>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-8 text-center">
            <KeyRound className="size-8 text-muted-foreground" />
            <div>
              <p className="font-medium">Paste a JWT to decode it</p>
              <p className="text-sm text-muted-foreground">Header, claims, expiry and signature appear here.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setToken(EXAMPLE_TOKEN)}>
              <FlaskConical /> Try an example
            </Button>
          </div>
        )}
      </div>
    </ToolPage>
  )
}
