import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Play, RotateCcw, ShieldCheck } from 'lucide-react'
import { ToolPage } from '@/components/tool/ToolPage'
import { CodeEditor } from '@/components/tool/CodeEditor'
import { ConsolePanel, type ConsoleEntry } from '@/components/tool/ConsolePanel'
import { DownloadButton } from '@/components/tool/DownloadButton'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toolsMetadata } from '@/config/seoConfig'
import { playgroundDocument, standaloneDocument } from '@/lib/html-sandbox'
import type { ConsoleLevel } from '@/lib/js-sandbox'

const DEFAULTS = {
  html: `<main class="card">
  <h1>Hello, playground</h1>
  <p>Edit HTML, CSS and JavaScript. The preview updates as you type.</p>
  <button id="count">Clicked 0 times</button>
</main>`,
  css: `body { font-family: system-ui, sans-serif; display: grid; place-items: center; min-height: 90vh; margin: 0; background: #f4f6fb; }
.card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 24px rgb(0 0 0 / .08); max-width: 28rem; }
h1 { margin-top: 0; color: #0369a1; }
button { font: inherit; padding: .5rem 1rem; border-radius: 8px; border: 1px solid #cbd5e1; cursor: pointer; }`,
  js: `let clicks = 0
const button = document.querySelector('#count')
button.addEventListener('click', () => {
  clicks++
  button.textContent = \`Clicked \${clicks} time\${clicks === 1 ? '' : 's'}\`
  console.log('click', { clicks })
})
console.info('Ready')`,
}

type Pane = 'html' | 'css' | 'js'
const LANG = { html: 'html', css: 'css', js: 'javascript' } as const

let nextId = 1

export default function HTMLPlayground() {
  const [files, setFiles] = useState(DEFAULTS)
  const [pane, setPane] = useState<Pane>('html')
  const [autoRun, setAutoRun] = useState(true)
  const [runKey, setRunKey] = useState(0)
  const [snapshot, setSnapshot] = useState(DEFAULTS)
  const [entries, setEntries] = useState<ConsoleEntry[]>([])
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const token = useMemo(() => crypto.randomUUID(), [])
  const deferred = useDeferredValue(files)

  // Auto-run: rebuild the preview shortly after typing stops.
  useEffect(() => {
    if (!autoRun) return
    const t = setTimeout(() => {
      setSnapshot((current) => {
        // Unchanged code doesn't reload the iframe, so keep its console output.
        if (current.html === deferred.html && current.css === deferred.css && current.js === deferred.js) return current
        setEntries([])
        return deferred
      })
    }, 400)
    return () => clearTimeout(t)
  }, [deferred, autoRun])

  const run = useCallback(() => {
    setSnapshot(files)
    setEntries([])
    setRunKey((k) => k + 1) // remount the iframe even if the code is unchanged
  }, [files])

  // Console messages from *this* iframe only.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return
      const data = e.data as { __devutil?: string; level?: ConsoleLevel; text?: string }
      if (data?.__devutil !== token) return
      setEntries((prev) => [...prev, { id: nextId++, level: data.level ?? 'log', text: String(data.text ?? '') }].slice(-1000))
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [token])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        run()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [run])

  const srcDoc = useMemo(() => playgroundDocument({ ...snapshot, token }), [snapshot, token])

  return (
    <ToolPage
      toolId="html-playground"
      meta={toolsMetadata.htmlPlayground}
      reference={
        <ul className="list-disc space-y-1 pl-5">
          <li>The preview is a sandboxed iframe with its own opaque origin: scripts run, but can’t reach this site, its storage or cookies.</li>
          <li>JavaScript runs as a module, so you can use import from CDNs (for example esm.sh) and top-level await.</li>
          <li>Download saves a single self-contained HTML file.</li>
        </ul>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={run}>
          <Play /> Run
        </Button>
        <Label className="flex items-center gap-2 font-normal">
          <Switch checked={autoRun} onCheckedChange={setAutoRun} /> Auto-run
        </Label>
        <Button variant="ghost" size="sm" onClick={() => setFiles(DEFAULTS)}>
          <RotateCcw /> Reset example
        </Button>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <ShieldCheck className="size-3.5 text-success" /> Sandboxed preview
          </span>
          <DownloadButton value={standaloneDocument(files)} filename="playground.html" mime="text/html" toolName="html_playground" />
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card shadow-xs" aria-label="Source">
          <div className="flex h-11 items-center border-b px-2">
            <Tabs value={pane} onValueChange={(v) => setPane(v as Pane)}>
              <TabsList className="h-8">
                <TabsTrigger value="html">HTML</TabsTrigger>
                <TabsTrigger value="css">CSS</TabsTrigger>
                <TabsTrigger value="js">JavaScript</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {/* One editor per pane keeps undo history separate */}
          {(['html', 'css', 'js'] as Pane[]).map((p) => (
            <div key={p} className={p === pane ? 'flex flex-1 flex-col' : 'hidden'}>
              <CodeEditor
                value={files[p]}
                onChange={(v) => setFiles((f) => ({ ...f, [p]: v }))}
                language={LANG[p]}
                ariaLabel={`${p.toUpperCase()} source`}
                className="md:min-h-[30rem]"
              />
            </div>
          ))}
        </section>

        <div className="flex min-w-0 flex-col gap-3">
          <section className="overflow-hidden rounded-xl border bg-white shadow-xs" aria-label="Preview">
            <iframe
              key={runKey}
              ref={iframeRef}
              title="Preview"
              srcDoc={srcDoc}
              sandbox="allow-scripts allow-modals allow-forms allow-popups"
              className="h-80 w-full md:h-[22rem]"
            />
          </section>
          <ConsolePanel entries={entries} onClear={() => setEntries([])} className="h-44" />
        </div>
      </div>
    </ToolPage>
  )
}
