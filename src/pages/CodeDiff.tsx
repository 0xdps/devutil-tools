import { useDeferredValue, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { createTwoFilesPatch, diffLines } from 'diff'
import { ArrowDown, ArrowLeftRight, ArrowUp, Eraser, FileUp, FlaskConical } from 'lucide-react'
import { toast } from 'sonner'
import { ToolPage } from '@/components/tool/ToolPage'
import { useShareState, useToolOutput } from '@/components/tool/tool-actions'
import { DiffEditor, type DiffEditorHandle } from '@/components/tool/DiffEditor'
import { DownloadButton } from '@/components/tool/DownloadButton'
import { StatusPill } from '@/components/tool/StatusPill'
import type { EditorLanguage } from '@/components/tool/code-editor-setup'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatBytes } from '@/lib/format'

const MAX_FILE = 5 * 1024 * 1024

const LANGUAGES: { value: EditorLanguage; label: string }[] = [
  { value: 'text', label: 'Plain text' },
  { value: 'json', label: 'JSON' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'yaml', label: 'YAML' },
  { value: 'xml', label: 'XML' },
  { value: 'markdown', label: 'Markdown' },
]

const EXT_LANGUAGE: Record<string, EditorLanguage> = {
  json: 'json', js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
  html: 'html', htm: 'html', css: 'css', scss: 'css', yml: 'yaml', yaml: 'yaml', xml: 'xml', svg: 'xml', md: 'markdown',
}

const EXAMPLE_A = `{
  "name": "localplus",
  "version": "1.4.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-hot-toast": "^2.4.1"
  }
}`
const EXAMPLE_B = `{
  "name": "localplus",
  "version": "2.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^19.2.5",
    "sonner": "^2.0.8"
  }
}`

function FileButton({ label, onLoad }: { label: string; onLoad: (text: string, name: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const onChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return
    if (file.size > MAX_FILE) {
      toast.error(`${file.name} is ${formatBytes(file.size)}; the limit is 5 MB.`)
      return
    }
    onLoad(await file.text(), file.name)
  }
  return (
    <>
      <Button variant="ghost" size="xs" onClick={() => inputRef.current?.click()}>
        <FileUp /> {label}
      </Button>
      <input ref={inputRef} type="file" className="sr-only" tabIndex={-1} aria-hidden onChange={onChange} />
    </>
  )
}

export default function CodeDiff() {
  const [original, setOriginal] = useState('')
  const [modified, setModified] = useState('')
  const [names, setNames] = useState({ a: 'original', b: 'modified' })
  // Two columns are too narrow on phones; start unified there.
  const [mode, setMode] = useState<'split' | 'unified'>(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches ? 'unified' : 'split',
  )
  const [language, setLanguage] = useState<EditorLanguage>('text')
  const [collapse, setCollapse] = useState(false)
  const editorRef = useRef<DiffEditorHandle>(null)
  const a = useDeferredValue(original)
  const b = useDeferredValue(modified)

  const stats = useMemo(() => {
    let added = 0
    let removed = 0
    for (const part of diffLines(a, b)) {
      if (part.added) added += part.count ?? 0
      if (part.removed) removed += part.count ?? 0
    }
    return { added, removed }
  }, [a, b])

  const patch = useMemo(() => (stats.added || stats.removed ? createTwoFilesPatch(names.a, names.b, a, b) : ''), [a, b, names, stats])

  useToolOutput(patch)
  useShareState({ original, modified, language, names }, (s) => {
    setOriginal(String(s.original ?? ''))
    setModified(String(s.modified ?? ''))
    if (LANGUAGES.some((l) => l.value === s.language)) setLanguage(s.language)
    if (s.names && typeof s.names.a === 'string' && typeof s.names.b === 'string') setNames(s.names)
  })

  const load = (side: 'a' | 'b') => (text: string, name: string) => {
    if (side === 'a') setOriginal(text)
    else setModified(text)
    setNames((n) => ({ ...n, [side]: name }))
    const guess = EXT_LANGUAGE[name.split('.').pop()?.toLowerCase() ?? '']
    if (guess) setLanguage(guess)
  }

  const swap = () => {
    setOriginal(modified)
    setModified(original)
    setNames((n) => ({ a: n.b, b: n.a }))
  }

  const identical = !!(a || b) && stats.added === 0 && stats.removed === 0

  return (
    <ToolPage
      toolId="text-diff"
      reference={
        <ul className="list-disc space-y-1 pl-5">
          <li>Both sides are editable; the diff updates as you type. Changed words within a line are highlighted.</li>
          <li>Use the arrows (or Ctrl/⌘-Alt-↓/↑ in the editor) to jump between changes; ⌘F searches.</li>
          <li>“Download patch” produces a standard unified diff you can apply with <code>git apply</code> or <code>patch</code>.</li>
          <li>Files are read locally and never uploaded (max 5 MB each).</li>
        </ul>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup type="single" variant="outline" size="sm" value={mode} onValueChange={(v) => v && setMode(v as 'split' | 'unified')} aria-label="View">
          <ToggleGroupItem value="split" className="px-3">
            Side by side
          </ToggleGroupItem>
          <ToggleGroupItem value="unified" className="px-3">
            Unified
          </ToggleGroupItem>
        </ToggleGroup>
        <Select value={language} onValueChange={(v) => setLanguage(v as EditorLanguage)}>
          <SelectTrigger className="h-8 w-36" aria-label="Syntax highlighting">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((l) => (
              <SelectItem key={l.value} value={l.value}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Label className="flex items-center gap-2 font-normal">
          <Switch checked={collapse} onCheckedChange={setCollapse} /> Collapse unchanged
        </Label>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          {identical ? (
            <StatusPill tone="success">Identical</StatusPill>
          ) : (
            (stats.added > 0 || stats.removed > 0) && (
              <span className="mr-1 flex items-center gap-2 font-mono text-xs" aria-label={`${stats.added} lines added, ${stats.removed} removed`}>
                <span className="text-success">+{stats.added}</span>
                <span className="text-destructive">−{stats.removed}</span>
              </span>
            )
          )}
          <Button variant="ghost" size="icon-sm" onClick={() => editorRef.current?.previousChange()} aria-label="Previous change" title="Previous change">
            <ArrowUp />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => editorRef.current?.nextChange()} aria-label="Next change" title="Next change">
            <ArrowDown />
          </Button>
          <DownloadButton value={patch} filename={`${names.b.replace(/\.[^.]+$/, '') || 'changes'}.diff`} mime="text/x-diff" toolName="code_diff" />
        </div>
      </div>

      <div className="space-y-2">
        <div className={mode === 'split' ? 'grid gap-2 sm:grid-cols-2 sm:gap-3' : 'flex flex-wrap justify-between gap-2'}>
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-2">
            <span className="truncate text-xs font-medium tracking-wide text-muted-foreground uppercase">Original · {names.a}</span>
            <div className="flex">
              <FileButton label="Open" onLoad={load('a')} />
              {mode === 'split' && (
                <Button variant="ghost" size="xs" onClick={() => setOriginal('')} disabled={!original}>
                  <Eraser /> Clear
                </Button>
              )}
            </div>
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-2">
            <span className="truncate text-xs font-medium tracking-wide text-muted-foreground uppercase">Modified · {names.b}</span>
            <div className="flex flex-wrap">
              <FileButton label="Open" onLoad={load('b')} />
              <Button variant="ghost" size="xs" onClick={swap} disabled={!original && !modified} title="Swap sides">
                <ArrowLeftRight /> Swap
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  setOriginal(EXAMPLE_A)
                  setModified(EXAMPLE_B)
                  setNames({ a: 'package.json (before)', b: 'package.json (after)' })
                  setLanguage('json')
                }}
              >
                <FlaskConical /> Example
              </Button>
            </div>
          </div>
        </div>
        <DiffEditor
          ref={editorRef}
          original={original}
          modified={modified}
          onOriginalChange={setOriginal}
          onModifiedChange={setModified}
          mode={mode}
          language={language}
          collapseUnchanged={collapse}
        />
        {mode === 'unified' && (
          <p className="text-xs text-muted-foreground">
            Unified view edits the modified text; deleted lines are shown inline. Switch to side by side to edit the original.
          </p>
        )}
      </div>
    </ToolPage>
  )
}
