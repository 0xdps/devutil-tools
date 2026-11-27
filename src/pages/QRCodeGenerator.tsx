import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from 'react'
import QRCode from 'qrcode'
import { Download, QrCode, TriangleAlert } from 'lucide-react'
import { ToolPage } from '@/components/tool/ToolPage'
import { SegmentedControl } from '@/components/tool/SegmentedControl'
import { useIncomingInput, useToolOutput } from '@/components/tool/tool-actions'
import { CopyButton } from '@/components/tool/CopyButton'
import { CodeArea } from '@/components/tool/ToolPanel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { useTabParam } from '@/hooks/use-tab-param'
import { contrastRatio, parseColor, relativeLuminance } from '@/lib/color'
import { emailPayload, phonePayload, vcardPayload, wifiPayload, type ContactFields, type WifiSecurity } from '@/lib/qr-payload'
import { trackDownload } from '@/utils/analytics'

const TABS = ['text', 'wifi', 'email', 'phone', 'contact'] as const
type Ecc = 'L' | 'M' | 'Q' | 'H'

const ECC_LABELS: Record<Ecc, string> = {
  L: 'Low (7%)',
  M: 'Medium (15%)',
  Q: 'Quartile (25%)',
  H: 'High (30%), best with a logo',
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  )
}

function saveDataUrl(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  trackDownload('qr_code', filename.split('.').pop())
}

export default function QRCodeGenerator() {
  const [tab, setTab] = useTabParam(TABS)

  // Content
  const [text, setText] = useState('https://devutil.codes')
  const [wifi, setWifi] = useState({ ssid: '', password: '', security: 'WPA' as WifiSecurity, hidden: false })
  const [email, setEmail] = useState({ to: '', subject: '', body: '' })
  const [phone, setPhone] = useState({ number: '', sms: '', asSms: false })
  const [contact, setContact] = useState<ContactFields>({ firstName: '', lastName: '', organization: '', title: '', phone: '', email: '', website: '' })

  // Appearance
  const [ecc, setEcc] = useState<Ecc>('M')
  const [size, setSize] = useState(512)
  const [margin, setMargin] = useState(2)
  const [fg, setFg] = useState('#111111')
  const [bg, setBg] = useState('#ffffff')

  const payload = useMemo((): { value?: string; error?: string } => {
    try {
      switch (tab) {
        case 'wifi':
          return { value: wifiPayload(wifi) }
        case 'email':
          return { value: emailPayload(email) }
        case 'phone':
          return { value: phonePayload({ number: phone.number, sms: phone.asSms ? phone.sms : undefined }) }
        case 'contact':
          return { value: vcardPayload(contact) }
        default:
          return text ? { value: text } : { error: 'Enter text or a URL' }
      }
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) }
    }
  }, [tab, text, wifi, email, phone, contact])

  const deferredPayload = useDeferredValue(payload.value)
  useToolOutput(payload.value ?? '')
  useIncomingInput<{ text: string }>((v) => typeof v.text === 'string' && setText(v.text))
  const colors = useMemo(() => {
    try {
      const f = parseColor(fg)
      const b = parseColor(bg)
      return { dark: fg, light: bg, ratio: contrastRatio(f, b), inverted: relativeLuminance(f) > relativeLuminance(b) }
    } catch {
      return null
    }
  }, [fg, bg])

  const [svg, setSvg] = useState('')
  const [renderError, setRenderError] = useState('')
  useEffect(() => {
    if (!deferredPayload || !colors) {
      setSvg('')
      return
    }
    let cancelled = false
    QRCode.toString(deferredPayload, { type: 'svg', errorCorrectionLevel: ecc, margin, color: { dark: colors.dark, light: colors.light } })
      .then((s) => {
        if (!cancelled) {
          setSvg(s)
          setRenderError('')
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setSvg('')
          setRenderError(e instanceof Error ? e.message : String(e))
        }
      })
    return () => {
      cancelled = true
    }
  }, [deferredPayload, ecc, margin, colors])

  const svgUrl = svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : ''

  const downloadPng = async () => {
    if (!deferredPayload || !colors) return
    const url = await QRCode.toDataURL(deferredPayload, { width: size, errorCorrectionLevel: ecc, margin, color: { dark: colors.dark, light: colors.light } })
    saveDataUrl(url, 'qr-code.png')
  }

  const lowContrast = colors && (colors.ratio < 3 || colors.inverted)

  return (
    <ToolPage
      toolId="qr-code"
      reference={
        <ul className="list-disc space-y-1 pl-5">
          <li>Wi-Fi codes let phones join a network by scanning; special characters in the name or password are escaped for you.</li>
          <li>Higher error correction survives damage or a logo on top, at the cost of a denser code.</li>
          <li>Keep dark modules on a light background with strong contrast; inverted or low-contrast codes fail on many scanners.</li>
        </ul>
      }
    >
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <SegmentedControl
            label="QR code content"
            value={tab}
            onValueChange={setTab}
            options={[
              { value: 'text', label: 'Text / URL' },
              { value: 'wifi', label: 'Wi-Fi' },
              { value: 'email', label: 'Email' },
              { value: 'phone', label: 'Phone / SMS' },
              { value: 'contact', label: 'Contact' },
            ]}
          />

          <div className="space-y-3 rounded-xl border bg-card p-4 shadow-xs">
            {tab === 'text' && (
              <Field label="Text or URL" htmlFor="qr-text">
                <div className="overflow-hidden rounded-md border">
                  <CodeArea id="qr-text" value={text} onChange={(e) => setText(e.target.value)} className="min-h-28 md:min-h-28" autoFocus />
                </div>
              </Field>
            )}
            {tab === 'wifi' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Network name (SSID)" htmlFor="qr-ssid">
                  <Input id="qr-ssid" value={wifi.ssid} onChange={(e) => setWifi({ ...wifi, ssid: e.target.value })} autoComplete="off" />
                </Field>
                <Field label="Security" htmlFor="qr-sec">
                  <Select value={wifi.security} onValueChange={(v) => setWifi({ ...wifi, security: v as WifiSecurity })}>
                    <SelectTrigger id="qr-sec" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WPA">WPA / WPA2 / WPA3</SelectItem>
                      <SelectItem value="WEP">WEP (legacy)</SelectItem>
                      <SelectItem value="nopass">No password</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                {wifi.security !== 'nopass' && (
                  <Field label="Password" htmlFor="qr-pass">
                    <Input id="qr-pass" value={wifi.password} onChange={(e) => setWifi({ ...wifi, password: e.target.value })} autoComplete="off" spellCheck={false} />
                  </Field>
                )}
                <Label className="flex items-center gap-2 self-end pb-2 font-normal">
                  <Switch checked={wifi.hidden} onCheckedChange={(hidden) => setWifi({ ...wifi, hidden })} /> Hidden network
                </Label>
              </div>
            )}
            {tab === 'email' && (
              <div className="grid gap-3">
                <Field label="To" htmlFor="qr-to">
                  <Input id="qr-to" type="email" value={email.to} onChange={(e) => setEmail({ ...email, to: e.target.value })} />
                </Field>
                <Field label="Subject" htmlFor="qr-subject">
                  <Input id="qr-subject" value={email.subject} onChange={(e) => setEmail({ ...email, subject: e.target.value })} />
                </Field>
                <Field label="Message" htmlFor="qr-body">
                  <div className="overflow-hidden rounded-md border">
                    <CodeArea id="qr-body" value={email.body} onChange={(e) => setEmail({ ...email, body: e.target.value })} className="min-h-20 font-sans md:min-h-20" />
                  </div>
                </Field>
              </div>
            )}
            {tab === 'phone' && (
              <div className="grid gap-3">
                <Field label="Phone number" htmlFor="qr-phone">
                  <Input id="qr-phone" type="tel" value={phone.number} onChange={(e) => setPhone({ ...phone, number: e.target.value })} placeholder="+1 555 010 9999" />
                </Field>
                <Label className="flex items-center gap-2 font-normal">
                  <Switch checked={phone.asSms} onCheckedChange={(asSms) => setPhone({ ...phone, asSms })} /> Open a text message instead of calling
                </Label>
                {phone.asSms && (
                  <Field label="Message" htmlFor="qr-sms">
                    <Input id="qr-sms" value={phone.sms} onChange={(e) => setPhone({ ...phone, sms: e.target.value })} />
                  </Field>
                )}
              </div>
            )}
            {tab === 'contact' && (
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ['firstName', 'First name', 'text'],
                    ['lastName', 'Last name', 'text'],
                    ['organization', 'Company', 'text'],
                    ['title', 'Job title', 'text'],
                    ['phone', 'Phone', 'tel'],
                    ['email', 'Email', 'email'],
                    ['website', 'Website', 'url'],
                  ] as [keyof ContactFields, string, string][]
                ).map(([key, label, type]) => (
                  <Field key={key} label={label} htmlFor={`qr-${key}`}>
                    <Input id={`qr-${key}`} type={type} value={contact[key] ?? ''} onChange={(e) => setContact({ ...contact, [key]: e.target.value })} />
                  </Field>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 rounded-xl border bg-card p-4 shadow-xs sm:grid-cols-2">
            <Field label="Error correction" htmlFor="qr-ecc">
              <Select value={ecc} onValueChange={(v) => setEcc(v as Ecc)}>
                <SelectTrigger id="qr-ecc" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ECC_LABELS) as Ecc[]).map((e) => (
                    <SelectItem key={e} value={e}>
                      {ECC_LABELS[e]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={`PNG size: ${size}px`} htmlFor="qr-size">
              <Slider id="qr-size" min={128} max={2048} step={64} value={[size]} onValueChange={([v]) => setSize(v)} className="py-3" aria-label="PNG size" />
            </Field>
            <Field label={`Quiet zone: ${margin} modules`} htmlFor="qr-margin">
              <Slider id="qr-margin" min={0} max={8} value={[margin]} onValueChange={([v]) => setMargin(v)} className="py-3" aria-label="Quiet zone" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ['qr-fg', 'Foreground', fg, setFg],
                  ['qr-bg', 'Background', bg, setBg],
                ] as [string, string, string, (v: string) => void][]
              ).map(([id, label, value, set]) => (
                <Field key={id} label={label} htmlFor={id}>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'}
                      onChange={(e) => set(e.target.value)}
                      className="size-9 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5"
                      aria-label={`${label} color picker`}
                    />
                    <Input id={id} value={value} onChange={(e) => set(e.target.value)} className="font-mono text-xs" spellCheck={false} />
                  </div>
                </Field>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3 lg:sticky lg:top-20">
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border bg-card p-6 shadow-xs">
            {svgUrl ? (
              <img src={svgUrl} alt={`QR code for: ${deferredPayload}`} className="size-full object-contain [image-rendering:pixelated]" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
                <QrCode className="size-10" />
                {payload.error || renderError || 'Your QR code appears here'}
              </div>
            )}
          </div>
          {lowContrast && (
            <p className="flex items-start gap-1.5 text-xs text-warning">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              {colors?.inverted ? 'Light-on-dark codes fail on many scanners.' : `Low contrast (${colors?.ratio.toFixed(1)}:1) may not scan.`} Use a dark foreground on a light background.
            </p>
          )}
          {renderError && <p className="text-xs text-destructive">{renderError}</p>}
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={downloadPng} disabled={!svgUrl}>
              <Download /> PNG
            </Button>
            <Button variant="outline" onClick={() => saveDataUrl(svgUrl, 'qr-code.svg')} disabled={!svgUrl}>
              <Download /> SVG
            </Button>
          </div>
          {deferredPayload && (
            <div className="rounded-lg border bg-code p-2">
              <div className="flex items-center justify-between gap-2 px-1">
                <span className="text-xs text-muted-foreground">Encoded content</span>
                <CopyButton value={deferredPayload} label="Copy encoded content" iconOnly />
              </div>
              <pre tabIndex={0} aria-label="Encoded content" className="max-h-32 overflow-auto px-1 font-mono text-xs whitespace-pre-wrap break-all outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50">{deferredPayload}</pre>
            </div>
          )}
        </div>
      </div>
    </ToolPage>
  )
}
