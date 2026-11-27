import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { CircleAlert, CornerLeftUp, Eraser, FlaskConical, Loader2 } from 'lucide-react'
import { ToolPage } from '@/components/tool/ToolPage'
import { useShareState, useToolOutput } from '@/components/tool/tool-actions'
import { ToolPanel } from '@/components/tool/ToolPanel'
import { CodeEditor } from '@/components/tool/CodeEditor'
import { CopyButton } from '@/components/tool/CopyButton'
import { DownloadButton } from '@/components/tool/DownloadButton'
import { JsonView } from '@/components/tool/JsonView'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useTabParam } from '@/hooks/use-tab-param'
import { CODE_LANGUAGES, formatCode, minifyCode, parseJsonStrict, queryJsonPath, type CodeLanguage, type JsonPathMatch } from '@/lib/code-format'

const TABS = ['format', 'jsonpath'] as const

const EXAMPLES: Record<CodeLanguage, string> = {
  json: '{"name":"devutil","version":"2.0.0","scripts":{"dev":"vite","build":"tsc && vite build"},"private":true,"keywords":["tools","privacy"]}',
  javascript: "const greet=(name)=>{if(!name){return 'Hello, stranger'}return `Hello, ${name}!`};export default greet",
  typescript: 'interface User{id:number;name:string;roles?:string[]}export function isAdmin(u:User):boolean{return u.roles?.includes("admin")??false}',
  css: '.card{display:flex;gap:1rem;padding:16px}.card:hover{box-shadow:0 2px 8px rgba(0,0,0,.1)}@media (max-width:600px){.card{flex-direction:column}}',
  scss: '$gap:1rem;.card{display:flex;gap:$gap;&:hover{opacity:.9}.title{font-weight:600}}',
  less: '@gap:1rem;.card{display:flex;gap:@gap;&:hover{opacity:.9}}',
  html: '<!doctype html><html><head><title>Demo</title><style>body{margin:0}</style></head><body><main><h1>Hello</h1><p>Formatted with <b>Prettier</b>.</p></main></body></html>',
  markdown: '# Title\nSome *text* here.\n* one\n* two\n\n|a|b|\n|-|-|\n|1|2|',
  yaml: 'name:   devutil\nversion: 2\nscripts: {dev: vite, build: "tsc && vite build"}\nkeywords: [tools,   privacy]',
  graphql: 'query GetUser($id:ID!){user(id:$id){id name posts(first:5){edges{node{title}}}}}',
}

const FILE_EXT: Record<CodeLanguage, string> = {
  json: 'json',
  javascript: 'js',
  typescript: 'ts',
  css: 'css',
  scss: 'scss',
  less: 'less',
  html: 'html',
  markdown: 'md',
  yaml: 'yaml',
  graphql: 'graphql',
}

type Mode = 'format' | 'minify'

function FormatTab() {
  const [language, setLanguage] = useState<CodeLanguage>('json')
  const [mode, setMode] = useState<Mode>('format')
  const [indent, setIndent] = useState(2)
  const [sortKeys, setSortKeys] = useState(false)
  const [input, setInput] = useState('')
  const [state, setState] = useState<{ output: string; error: string; busy: boolean }>({ output: '', error: '', busy: false })
  const deferred = useDeferredValue(input)
  const canMinify = CODE_LANGUAGES.find((l) => l.value === language)!.minify
  const effectiveMode: Mode = canMinify ? mode : 'format'

  useEffect(() => {
    if (!deferred.trim()) {
      setState({ output: '', error: '', busy: false })
      return
    }
    let cancelled = false
    setState((s) => ({ ...s, busy: true }))
    // Debounce: Prettier is fast but not free on large inputs.
    const timer = setTimeout(async () => {
      try {
        const output =
          effectiveMode === 'minify'
            ? await minifyCode(language, deferred, { sortKeys })
            : await formatCode(language, deferred, { indent, sortKeys })
        if (!cancelled) setState({ output, error: '', busy: false })
      } catch (e) {
        if (!cancelled) setState({ output: '', error: e instanceof Error ? e.message : String(e), busy: false })
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [deferred, language, effectiveMode, indent, sortKeys])

  const savedBytes = state.output && input ? input.length - state.output.length : 0
  useToolOutput(state.output)
  useShareState({ language, mode, indent, sortKeys, input }, (s) => {
    if (CODE_LANGUAGES.some((l) => l.value === s.language)) setLanguage(s.language)
    setMode(s.mode === 'minify' ? 'minify' : 'format')
    if ([0, 2, 4].includes(Number(s.indent))) setIndent(Number(s.indent))
    setSortKeys(s.sortKeys === true)
    setInput(String(s.input ?? ''))
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cf-lang" className="text-xs text-muted-foreground">
            Language
          </Label>
          <Select value={language} onValueChange={(v) => setLanguage(v as CodeLanguage)}>
            <SelectTrigger id="cf-lang" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CODE_LANGUAGES.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ToggleGroup type="single" variant="outline" size="sm" value={effectiveMode} onValueChange={(v) => v && setMode(v as Mode)} aria-label="Mode">
          <ToggleGroupItem value="format" className="h-9 px-3">
            Format
          </ToggleGroupItem>
          <ToggleGroupItem
            value="minify"
            className="h-9 px-3"
            disabled={!canMinify}
            title={canMinify ? undefined : 'Minify is available for JSON, JavaScript and CSS'}
          >
            Minify
          </ToggleGroupItem>
        </ToggleGroup>
        {effectiveMode === 'format' && (
          <div className="space-y-1.5">
            <Label htmlFor="cf-indent" className="text-xs text-muted-foreground">
              Indent
            </Label>
            <Select value={String(indent)} onValueChange={(v) => setIndent(Number(v))}>
              <SelectTrigger id="cf-indent" className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 spaces</SelectItem>
                <SelectItem value="4">4 spaces</SelectItem>
                <SelectItem value="0">Tabs</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {language === 'json' && (
          <Label className="flex h-9 items-center gap-2 font-normal">
            <Switch checked={sortKeys} onCheckedChange={setSortKeys} /> Sort keys
          </Label>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <ToolPanel
          title="Input"
          actions={
            <>
              <Button variant="ghost" size="xs" onClick={() => setInput(EXAMPLES[language])}>
                <FlaskConical /> Example
              </Button>
              <Button variant="ghost" size="xs" onClick={() => setInput('')} disabled={!input}>
                <Eraser /> Clear
              </Button>
            </>
          }
          footer={`${input.length.toLocaleString()} characters`}
        >
          {(labelId) => (
            <CodeEditor value={input} onChange={setInput} language={language} ariaLabelledBy={labelId} placeholder="Paste code…" autoFocus />
          )}
        </ToolPanel>

        <ToolPanel
          title={effectiveMode === 'minify' ? 'Minified' : 'Formatted'}
          actions={
            <>
              {state.busy && <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-label="Working" />}
              <Button variant="ghost" size="xs" onClick={() => setInput(state.output)} disabled={!state.output || state.output === input}>
                <CornerLeftUp /> Use as input
              </Button>
              <DownloadButton value={state.output} filename={`formatted.${FILE_EXT[language]}`} toolName="code_formatter" />
              <CopyButton value={state.output} toolName="code_formatter" />
            </>
          }
          footer={
            state.error ? (
              <span role="alert" className="flex items-start gap-1.5 text-destructive">
                <CircleAlert className="mt-0.5 size-3.5 shrink-0" /> {state.error}
              </span>
            ) : state.output ? (
              `${state.output.length.toLocaleString()} characters${
                effectiveMode === 'minify' && savedBytes > 0 ? ` · ${Math.round((savedBytes / input.length) * 100)}% smaller` : ''
              }`
            ) : (
              'Formats as you type'
            )
          }
        >
          {(labelId) => <CodeEditor value={state.output} language={language} readOnly ariaLabelledBy={labelId} placeholder="Result appears here" />}
        </ToolPanel>
      </div>
    </div>
  )
}

const PATH_EXAMPLES = ['$.store.book[*].title', '$..price', '$.store.book[?(@.price < 10)]', '$.store.book[-1:]', '$..*']
const JSONPATH_SAMPLE = JSON.stringify(
  {
    store: {
      book: [
        { category: 'reference', author: 'Nigel Rees', title: 'Sayings of the Century', price: 8.95 },
        { category: 'fiction', author: 'Herman Melville', title: 'Moby Dick', isbn: '0-553-21311-3', price: 8.99 },
        { category: 'fiction', author: 'J. R. R. Tolkien', title: 'The Lord of the Rings', isbn: '0-395-19395-8', price: 22.99 },
      ],
      bicycle: { color: 'red', price: 19.95 },
    },
  },
  null,
  2,
)

function JsonPathTab() {
  const [json, setJson] = useState(JSONPATH_SAMPLE)
  const [path, setPath] = useState('$.store.book[?(@.price < 10)].title')
  const [state, setState] = useState<{ matches: JsonPathMatch[]; error: string }>({ matches: [], error: '' })
  const deferredJson = useDeferredValue(json)
  const deferredPath = useDeferredValue(path)

  const parsed = useMemo((): { data?: unknown; error?: string } => {
    try {
      return { data: parseJsonStrict(deferredJson) }
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) }
    }
  }, [deferredJson])

  useEffect(() => {
    let cancelled = false
    if (parsed.error) {
      setState({ matches: [], error: `JSON: ${parsed.error}` })
      return
    }
    if (!deferredPath.trim()) {
      setState({ matches: [], error: '' })
      return
    }
    queryJsonPath(parsed.data, deferredPath)
      .then((matches) => {
        if (!cancelled) setState({ matches, error: '' })
      })
      .catch((e: unknown) => {
        if (!cancelled) setState({ matches: [], error: `Path: ${e instanceof Error ? e.message : String(e)}` })
      })
    return () => {
      cancelled = true
    }
  }, [parsed, deferredPath])

  const values = state.matches.map((m) => m.value)
  useToolOutput(state.matches.length ? JSON.stringify(values, null, 2) : '')
  useShareState({ json, path }, (s) => {
    setJson(String(s.json ?? ''))
    setPath(String(s.path ?? ''))
  })

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="jp-path">JSONPath expression</Label>
        <Input
          id="jp-path"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          className="h-10 font-mono text-[14px]"
          spellCheck={false}
          aria-invalid={state.error.startsWith('Path')}
        />
        <div className="flex flex-wrap gap-1.5" aria-label="Examples">
          {PATH_EXAMPLES.map((p) => (
            <Button key={p} variant="outline" size="xs" className="font-mono" onClick={() => setPath(p)}>
              {p}
            </Button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <ToolPanel
          title="JSON"
          actions={
            <Button variant="ghost" size="xs" onClick={() => setJson('')} disabled={!json}>
              <Eraser /> Clear
            </Button>
          }
        >
          {(labelId) => <CodeEditor value={json} onChange={setJson} language="json" ariaLabelledBy={labelId} placeholder="Paste JSON…" />}
        </ToolPanel>
        <ToolPanel
          title={`Matches (${state.matches.length})`}
          actions={<CopyButton value={state.matches.length ? JSON.stringify(values, null, 2) : ''} label="Copy values" toolName="json_tools" />}
          footer={
            state.error ? (
              <span role="alert" className="text-destructive">
                {state.error}
              </span>
            ) : undefined
          }
        >
          {() =>
            state.matches.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">{state.error ? 'Fix the error to see matches.' : 'No matches.'}</p>
            ) : (
              <ol tabIndex={0} aria-label="JSONPath matches" className="max-h-[32rem] divide-y overflow-auto outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50">
                {state.matches.map((m) => (
                  <li key={m.path}>
                    <div className="flex items-center justify-between gap-2 px-3 pt-2">
                      <code className="truncate font-mono text-xs text-muted-foreground">{m.path}</code>
                      <CopyButton value={m.path} label="Copy path" iconOnly />
                    </div>
                    <JsonView value={m.value} className="bg-transparent pt-1" />
                  </li>
                ))}
              </ol>
            )
          }
        </ToolPanel>
      </div>
    </div>
  )
}

export default function CodeAndJSONTools() {
  const [tab, setTab] = useTabParam(TABS)

  return (
    <ToolPage
      toolId="code-json"
      reference={
        <ul className="list-disc space-y-1 pl-5">
          <li>Formatting uses Prettier, loaded on demand in your browser. JSON is formatted natively, with exact line/column errors.</li>
          <li>JavaScript is minified with Terser (safe: strings and line-break-sensitive code are preserved).</li>
          <li>
            JSONPath supports wildcards (<code>[*]</code>), recursive descent (<code>..</code>), slices (<code>[-1:]</code>) and filters (
            <code>[?(@.price &lt; 10)]</code>). Filters run in a sandboxed evaluator.
          </li>
        </ul>
      }
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="format">Format & minify</TabsTrigger>
          <TabsTrigger value="jsonpath">JSONPath query</TabsTrigger>
        </TabsList>
        <TabsContent value="format" className="mt-4">
          <FormatTab />
        </TabsContent>
        <TabsContent value="jsonpath" className="mt-4">
          <JsonPathTab />
        </TabsContent>
      </Tabs>
    </ToolPage>
  )
}
