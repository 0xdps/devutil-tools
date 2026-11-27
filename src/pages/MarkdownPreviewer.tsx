import { useDeferredValue, useMemo, useState } from 'react'
import { marked } from 'marked'
import { useTheme } from 'next-themes'
import { ShieldCheck } from 'lucide-react'
import { ToolPage } from '@/components/tool/ToolPage'
import { ToolPanel } from '@/components/tool/ToolPanel'
import { CodeEditor } from '@/components/tool/CodeEditor'
import { CopyButton } from '@/components/tool/CopyButton'
import { DownloadButton } from '@/components/tool/DownloadButton'
import { toolsMetadata } from '@/config/seoConfig'
import { markdownDocument } from '@/lib/markdown-doc'
import { textStats } from '@/lib/text'

const EXAMPLE = `# Release notes

DevUtil **2.0** is a ground-up redesign. Everything still runs *locally*.

## What's new

- [x] Light, dark and system themes
- [x] Command palette (press \`⌘K\`)
- [ ] Shareable links

| Tool | Status |
| --- | --- |
| JWT Decoder | Signature verification |
| Regex Tester | Runs in a worker |

> Tip: HTML in Markdown is rendered, but scripts can't run here.

\`\`\`js
const greet = (name) => \`Hello, \${name}!\`
\`\`\`

[Source on GitHub](https://github.com/0xdps/devutil-tools)
`

export default function MarkdownPreviewer() {
  const [markdown, setMarkdown] = useState(EXAMPLE)
  const deferred = useDeferredValue(markdown)
  const { resolvedTheme } = useTheme()
  const html = useMemo(() => marked.parse(deferred, { gfm: true, async: false }) as string, [deferred])
  const doc = useMemo(() => markdownDocument(html, { dark: resolvedTheme === 'dark' }), [html, resolvedTheme])
  const stats = textStats(markdown)

  return (
    <ToolPage
      toolId="markdown-previewer"
      meta={toolsMetadata.markdownPreviewer}
      reference={
        <ul className="list-disc space-y-1 pl-5">
          <li>GitHub-flavored Markdown: tables, task lists, strikethrough and fenced code blocks.</li>
          <li>The preview is sandboxed with scripts disabled, so pasted Markdown can’t run code in your browser.</li>
          <li>Copy HTML gives you the rendered markup; Download HTML saves a styled standalone page.</li>
        </ul>
      }
    >
      <div className="grid gap-3 lg:grid-cols-2">
        <ToolPanel
          title="Markdown"
          actions={<DownloadButton value={markdown} filename="document.md" mime="text/markdown" toolName="markdown_previewer" />}
          footer={`${stats.words.toLocaleString()} words · ${Math.max(1, Math.round(stats.readingMinutes))} min read`}
        >
          {(labelId) => <CodeEditor value={markdown} onChange={setMarkdown} language="markdown" ariaLabelledBy={labelId} className="md:min-h-[32rem]" autoFocus />}
        </ToolPanel>
        <ToolPanel
          title={
            <span className="flex items-center gap-1.5">
              Preview <ShieldCheck className="size-3.5 text-success" aria-label="sandboxed" />
            </span>
          }
          actions={
            <>
              <DownloadButton value={markdownDocument(html, { dark: false })} filename="document.html" mime="text/html" toolName="markdown_previewer" />
              <CopyButton value={html} label="Copy HTML" toolName="markdown_previewer" />
            </>
          }
        >
          {() => (
            <iframe
              title="Rendered Markdown"
              srcDoc={doc}
              sandbox="allow-popups allow-popups-to-escape-sandbox"
              className="min-h-[32rem] w-full flex-1 bg-background"
            />
          )}
        </ToolPanel>
      </div>
    </ToolPage>
  )
}
