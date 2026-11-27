import { useCallback, useEffect, useRef, useState } from 'react'
import { Play, ShieldCheck, Square } from 'lucide-react'
import { ToolPage } from '@/components/tool/ToolPage'
import { useShareState } from '@/components/tool/tool-actions'
import { ToolPanel } from '@/components/tool/ToolPanel'
import { CodeEditor } from '@/components/tool/CodeEditor'
import { ConsolePanel, type ConsoleEntry } from '@/components/tool/ConsolePanel'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toolsMetadata } from '@/config/seoConfig'
import { workerSource, type SandboxMessage } from '@/lib/js-sandbox'
import { modKey } from '@/lib/platform'

const EXAMPLE = `// Runs in an isolated worker: no access to this page, its storage or cookies.
const users = [
  { name: 'Ada', langs: ['js', 'py'] },
  { name: 'Alan', langs: ['go'] },
]

console.log('Users:', users)
console.table(users.map((u) => ({ name: u.name, count: u.langs.length })))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
console.time('wait')
await sleep(120)
console.timeEnd('wait')

console.warn('Top-level await works')
// Return a value to print it:
return new Map([['answer', 42]])
`

let nextId = 1

export default function JavaScriptRunner() {
  const [code, setCode] = useState(EXAMPLE)
  const [entries, setEntries] = useState<ConsoleEntry[]>([])
  const [running, setRunning] = useState(false)
  const [timeoutSec, setTimeoutSec] = useState('5')
  const workerRef = useRef<Worker | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useShareState({ code }, (s) => setCode(String(s.code ?? '')), {
    note: 'The link contains your code (after #). It is never sent to our server, and it never runs until someone presses Run.',
  })

  const push = useCallback((level: ConsoleEntry['level'], text: string) => setEntries((prev) => [...prev, { id: nextId++, level, text }].slice(-2000)), [])

  const stop = useCallback(
    (reason?: string) => {
      clearTimeout(timerRef.current)
      workerRef.current?.terminate()
      workerRef.current = null
      setRunning(false)
      if (reason) push('system', reason)
    },
    [push],
  )

  const run = useCallback(() => {
    stop()
    setEntries([])
    let worker: Worker
    try {
      worker = new Worker(`data:text/javascript;charset=utf-8,${encodeURIComponent(workerSource(code))}`)
    } catch (e) {
      push('error', `Could not start the sandbox: ${e instanceof Error ? e.message : String(e)}`)
      return
    }
    workerRef.current = worker
    setRunning(true)
    worker.onmessage = (e: MessageEvent<SandboxMessage>) => {
      const m = e.data
      if (m.type === 'console') push(m.level ?? 'log', m.text ?? '')
      else if (m.type === 'error') push('error', m.text ?? 'Error')
      else if (m.type === 'done') {
        clearTimeout(timerRef.current)
        push('system', `Finished in ${(m.ms ?? 0).toFixed(1)} ms`)
        setRunning(false)
        // Keep the worker alive briefly so pending timers/promises can still log.
        const w = worker
        setTimeout(() => workerRef.current !== w || stop(), 3000)
      }
    }
    // Syntax errors surface here (the worker script fails to parse).
    worker.onerror = (e) => {
      e.preventDefault()
      push('error', e.message ? e.message.replace(/^Uncaught /, '') : 'The script could not run')
      stop()
    }
    timerRef.current = setTimeout(() => stop(`Stopped after ${timeoutSec} s. Is there an infinite loop?`), Number(timeoutSec) * 1000)
  }, [code, push, stop, timeoutSec])

  // ⌘/Ctrl+Enter runs
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        // Capture phase + stopPropagation: CodeMirror would otherwise also insert a blank line.
        e.preventDefault()
        e.stopPropagation()
        run()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [run])

  useEffect(() => () => workerRef.current?.terminate(), [])

  return (
    <ToolPage
      toolId="js-runner"
      meta={toolsMetadata.jsRunner}
      reference={
        <ul className="list-disc space-y-1 pl-5">
          <li>Code runs in a Web Worker with an opaque origin: it can’t read this site’s storage, cookies or page, and it can’t freeze the tab.</li>
          <li>Top-level await works. Use return to print a final value. There’s no DOM; use the HTML Playground for that.</li>
          <li>Supported: console.log/info/warn/error/debug, table, dir, assert, count, time/timeEnd.</li>
        </ul>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        {running ? (
          <Button variant="destructive" onClick={() => stop('Stopped.')}>
            <Square /> Stop
          </Button>
        ) : (
          <Button onClick={run}>
            <Play /> Run <Kbd className="ml-1 bg-primary-foreground/15 text-primary-foreground">{modKey} ↵</Kbd>
          </Button>
        )}
        <Label className="ml-2 text-xs font-normal text-muted-foreground" htmlFor="js-timeout">
          Time limit
        </Label>
        <Select value={timeoutSec} onValueChange={setTimeoutSec}>
          <SelectTrigger id="js-timeout" className="h-8 w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {['2', '5', '15', '60'].map((s) => (
              <SelectItem key={s} value={s}>
                {s} s
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-success" /> Isolated sandbox
        </span>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <ToolPanel title="JavaScript">
          {(labelId) => <CodeEditor value={code} onChange={setCode} language="javascript" ariaLabelledBy={labelId} className="md:min-h-[28rem]" autoFocus />}
        </ToolPanel>
        <ConsolePanel entries={entries} onClear={() => setEntries([])} className="lg:max-h-[33rem]" />
      </div>
    </ToolPage>
  )
}
