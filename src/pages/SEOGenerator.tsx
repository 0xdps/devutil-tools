import { useMemo, useState, type ReactNode } from 'react'
import { Bot, ImageIcon, Plus, ShieldOff, Trash2, TriangleAlert } from 'lucide-react'
import { ToolPage } from '@/components/tool/ToolPage'
import { ToolPanel } from '@/components/tool/ToolPanel'
import { CodeEditor } from '@/components/tool/CodeEditor'
import { CopyButton } from '@/components/tool/CopyButton'
import { DownloadButton } from '@/components/tool/DownloadButton'
import type { EditorLanguage } from '@/components/tool/code-editor-setup'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { toolsMetadata } from '@/config/seoConfig'
import { useTabParam } from '@/hooks/use-tab-param'
import {
  AI_CRAWLERS,
  DESCRIPTION_LIMIT,
  TITLE_LIMIT,
  jsonLd,
  metaTags,
  robotsTxt,
  sitemapXml,
  type ChangeFreq,
  type MetaInput,
  type RobotsGroup,
  type SchemaInput,
  type SchemaType,
} from '@/lib/seo'
import { cn } from '@/lib/utils'

const TABS = ['meta', 'robots', 'sitemap', 'schema'] as const
const lines = (s: string) => s.split('\n')

function Field({ label, htmlFor, hint, children, className }: { label: string; htmlFor: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">
          {label}
        </Label>
        {hint}
      </div>
      {children}
    </div>
  )
}

function Counter({ value, limit }: { value: string; limit: number }) {
  const over = value.length > limit
  return (
    <span className={cn('text-xs tabular-nums', over ? 'text-warning' : 'text-muted-foreground')}>
      {value.length}/{limit}
      {over && ' · may be truncated'}
    </span>
  )
}

function Output({ value, language, filename }: { value: string; language: EditorLanguage; filename?: string }) {
  return (
    <ToolPanel
      title="Output"
      actions={
        <>
          {filename && <DownloadButton value={value} filename={filename} toolName="seo_generator" />}
          <CopyButton value={value} toolName="seo_generator" />
        </>
      }
    >
      {(labelId) => <CodeEditor value={value} language={language} readOnly ariaLabelledBy={labelId} className="md:min-h-72" />}
    </ToolPanel>
  )
}

// ── Meta & social ───────────────────────────────────────────────────

function hostOf(url: string) {
  try {
    const u = new URL(url)
    return { host: u.hostname, path: u.pathname.split('/').filter(Boolean) }
  } catch {
    return { host: 'example.com', path: [] as string[] }
  }
}

function MetaTab() {
  const [m, setM] = useState<MetaInput>({
    title: 'DevUtil: private developer tools in your browser',
    description: 'Encode, convert, format, hash and decode without uploading anything. Free and open source.',
    canonical: 'https://devutil.codes/',
    siteName: 'DevUtil',
    image: '',
    imageAlt: '',
    type: 'website',
    twitterSite: '',
    locale: 'en_US',
    noindex: false,
  })
  const [showImage, setShowImage] = useState(false)
  const set = <K extends keyof MetaInput>(k: K, v: MetaInput[K]) => setM((prev) => ({ ...prev, [k]: v }))
  const { host, path } = hostOf(m.canonical)
  const output = metaTags(m)

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <div className="space-y-3 rounded-xl border bg-card p-4 shadow-xs">
        <Field label="Title" htmlFor="seo-title" hint={<Counter value={m.title} limit={TITLE_LIMIT} />}>
          <Input id="seo-title" value={m.title} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <Field label="Description" htmlFor="seo-desc" hint={<Counter value={m.description} limit={DESCRIPTION_LIMIT} />}>
          <Textarea id="seo-desc" value={m.description} onChange={(e) => set('description', e.target.value)} rows={3} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Canonical URL" htmlFor="seo-canonical">
            <Input id="seo-canonical" type="url" value={m.canonical} onChange={(e) => set('canonical', e.target.value)} />
          </Field>
          <Field label="Site name" htmlFor="seo-site">
            <Input id="seo-site" value={m.siteName} onChange={(e) => set('siteName', e.target.value)} />
          </Field>
          <Field label="Social image URL (1200×630)" htmlFor="seo-image">
            <Input
              id="seo-image"
              type="url"
              value={m.image}
              onChange={(e) => {
                set('image', e.target.value)
                setShowImage(false)
              }}
            />
          </Field>
          <Field label="Image alt text" htmlFor="seo-image-alt">
            <Input id="seo-image-alt" value={m.imageAlt} onChange={(e) => set('imageAlt', e.target.value)} disabled={!m.image} />
          </Field>
          <Field label="Type" htmlFor="seo-type">
            <Select value={m.type} onValueChange={(v) => set('type', v as MetaInput['type'])}>
              <SelectTrigger id="seo-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['website', 'article', 'product', 'profile'].map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="X / Twitter handle" htmlFor="seo-twitter">
            <Input id="seo-twitter" value={m.twitterSite} onChange={(e) => set('twitterSite', e.target.value)} placeholder="@yourbrand" />
          </Field>
        </div>
        <Label className="flex items-center gap-2 pt-1 font-normal">
          <Switch checked={m.noindex} onCheckedChange={(v) => set('noindex', v)} /> Hide this page from search engines (noindex)
        </Label>
      </div>

      <div className="space-y-4">
        <section aria-label="Search result preview" className="rounded-xl border bg-card p-4 shadow-xs">
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Search result</p>
          <div className="space-y-0.5 font-[Arial,sans-serif]">
            <p className="truncate text-xs text-muted-foreground">
              {m.siteName || host} · {[host, ...path].join(' › ')}
            </p>
            <p className="line-clamp-1 text-lg text-[#1a0dab] dark:text-[#99c3ff]">{m.title || 'Page title'}</p>
            <p className="line-clamp-2 text-sm text-muted-foreground">{m.description || 'Add a description to control the snippet.'}</p>
          </div>
        </section>

        <section aria-label="Social card preview" className="overflow-hidden rounded-xl border bg-card shadow-xs">
          <div className="flex aspect-[1.91/1] items-center justify-center bg-muted">
            {m.image && showImage ? (
              <img src={m.image} alt={m.imageAlt} className="size-full object-cover" referrerPolicy="no-referrer" />
            ) : m.image ? (
              <Button variant="outline" size="sm" onClick={() => setShowImage(true)}>
                <ImageIcon /> Load image preview
              </Button>
            ) : (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <ImageIcon className="size-4" /> No social image
              </span>
            )}
          </div>
          <div className="space-y-0.5 border-t px-4 py-3">
            <p className="text-xs text-muted-foreground uppercase">{host}</p>
            <p className="line-clamp-1 font-semibold">{m.title || 'Page title'}</p>
            <p className="line-clamp-1 text-sm text-muted-foreground">{m.description}</p>
          </div>
        </section>
        {m.image && !showImage && (
          <p className="text-xs text-muted-foreground">The image is only fetched from that URL when you load the preview.</p>
        )}

        <Output value={output} language="html" />
      </div>
    </div>
  )
}

// ── robots.txt ──────────────────────────────────────────────────────

type GroupDraft = { agents: string; allow: string; disallow: string }
const toGroups = (drafts: GroupDraft[]): RobotsGroup[] =>
  drafts.map((d) => ({ userAgents: d.agents.split(',').map((a) => a.trim()), allow: lines(d.allow), disallow: lines(d.disallow) }))

const ROBOTS_PRESETS: { label: string; icon?: typeof Bot; groups: GroupDraft[] }[] = [
  { label: 'Allow everything', groups: [{ agents: '*', allow: '', disallow: '' }] },
  { label: 'Typical site', groups: [{ agents: '*', allow: '', disallow: '/admin/\n/api/\n/search' }] },
  {
    label: 'Block AI crawlers',
    icon: Bot,
    groups: [
      { agents: '*', allow: '', disallow: '' },
      { agents: AI_CRAWLERS.join(', '), allow: '', disallow: '/' },
    ],
  },
  { label: 'Block everything', icon: ShieldOff, groups: [{ agents: '*', allow: '', disallow: '/' }] },
]

function RobotsTab() {
  const [groups, setGroups] = useState<GroupDraft[]>(ROBOTS_PRESETS[1].groups)
  const [sitemap, setSitemap] = useState('https://example.com/sitemap.xml')
  const update = (i: number, patch: Partial<GroupDraft>) => setGroups(groups.map((g, j) => (j === i ? { ...g, ...patch } : g)))
  const output = robotsTxt(toGroups(groups), [sitemap])

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {ROBOTS_PRESETS.map((p) => (
            <Button key={p.label} variant="outline" size="sm" onClick={() => setGroups(p.groups)}>
              {p.icon && <p.icon />} {p.label}
            </Button>
          ))}
        </div>
        {groups.map((g, i) => (
          <div key={i} className="space-y-3 rounded-xl border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Rule group {i + 1}</span>
              <Button variant="ghost" size="icon-xs" aria-label={`Remove rule group ${i + 1}`} onClick={() => setGroups(groups.filter((_, j) => j !== i))} disabled={groups.length === 1}>
                <Trash2 />
              </Button>
            </div>
            <Field label="User-agents (comma-separated, * = all)" htmlFor={`ua-${i}`}>
              <Input id={`ua-${i}`} value={g.agents} onChange={(e) => update(i, { agents: e.target.value })} className="font-mono text-[13px]" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Disallow (one path per line)" htmlFor={`dis-${i}`}>
                <Textarea id={`dis-${i}`} rows={3} value={g.disallow} onChange={(e) => update(i, { disallow: e.target.value })} className="font-mono text-[13px]" />
              </Field>
              <Field label="Allow (exceptions)" htmlFor={`allow-${i}`}>
                <Textarea id={`allow-${i}`} rows={3} value={g.allow} onChange={(e) => update(i, { allow: e.target.value })} className="font-mono text-[13px]" />
              </Field>
            </div>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={() => setGroups([...groups, { agents: '', allow: '', disallow: '' }])}>
          <Plus /> Add rule group
        </Button>
        <Field label="Sitemap URL" htmlFor="robots-sitemap">
          <Input id="robots-sitemap" type="url" value={sitemap} onChange={(e) => setSitemap(e.target.value)} />
        </Field>
      </div>
      <Output value={output} language="text" filename="robots.txt" />
    </div>
  )
}

// ── sitemap.xml ─────────────────────────────────────────────────────

function SitemapTab() {
  const [urls, setUrls] = useState('https://example.com/\nhttps://example.com/about\nhttps://example.com/blog?tag=news&page=2')
  const [useLastmod, setUseLastmod] = useState(true)
  const [lastmod, setLastmod] = useState(() => new Date().toISOString().slice(0, 10))
  const [changefreq, setChangefreq] = useState<ChangeFreq | 'none'>('none')
  const [priority, setPriority] = useState('none')

  const result = useMemo(() => {
    try {
      return sitemapXml(lines(urls), {
        lastmod: useLastmod ? lastmod : undefined,
        changefreq: changefreq === 'none' ? undefined : changefreq,
        priority: priority === 'none' ? undefined : Number(priority),
      })
    } catch (e) {
      return { xml: '', invalid: [], duplicates: 0, error: e instanceof Error ? e.message : String(e) }
    }
  }, [urls, useLastmod, lastmod, changefreq, priority])

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <div className="space-y-3">
        <ToolPanel title="Page URLs (one per line)">
          {(labelId) => <CodeEditor value={urls} onChange={setUrls} ariaLabelledBy={labelId} className="md:min-h-56" />}
        </ToolPanel>
        <div className="grid gap-3 rounded-xl border bg-card p-4 shadow-xs sm:grid-cols-3">
          <Field label="Last modified" htmlFor="sm-lastmod" hint={<Switch size="sm" checked={useLastmod} onCheckedChange={setUseLastmod} aria-label="Include last modified" />}>
            <Input id="sm-lastmod" type="date" value={lastmod} onChange={(e) => setLastmod(e.target.value)} disabled={!useLastmod} />
          </Field>
          <Field label="Change frequency" htmlFor="sm-freq">
            <Select value={changefreq} onValueChange={(v) => setChangefreq(v as ChangeFreq | 'none')}>
              <SelectTrigger id="sm-freq" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Omit</SelectItem>
                {['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'].map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Priority" htmlFor="sm-priority">
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="sm-priority" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Omit</SelectItem>
                {['1.0', '0.8', '0.5', '0.3', '0.1'].map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        {(result.invalid.length > 0 || result.duplicates > 0 || 'error' in result) && (
          <div className="space-y-1 text-xs text-warning">
            {'error' in result && <p>{result.error}</p>}
            {result.invalid.length > 0 && (
              <p className="flex items-start gap-1.5">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" /> Skipped {result.invalid.length} line(s) that aren’t http(s) URLs: {result.invalid.slice(0, 3).join(', ')}
              </p>
            )}
            {result.duplicates > 0 && <p>Removed {result.duplicates} duplicate URL(s).</p>}
          </div>
        )}
        <p className="text-xs text-muted-foreground">Google ignores changefreq and priority; an accurate lastmod is what matters.</p>
      </div>
      <Output value={result.xml} language="xml" filename="sitemap.xml" />
    </div>
  )
}

// ── Schema.org ──────────────────────────────────────────────────────

function SchemaTab() {
  const [type, setType] = useState<SchemaType>('Organization')
  const [s, setS] = useState<SchemaInput>({
    name: 'DevUtil',
    url: 'https://devutil.codes',
    logo: 'https://devutil.codes/icon-512x512.png',
    description: 'Private developer utilities that run in your browser.',
    sameAs: ['https://github.com/0xdps/devutil-tools'],
    headline: '',
    author: '',
    datePublished: '',
    image: '',
    breadcrumbs: ['Home | https://devutil.codes/', 'Tools | https://devutil.codes/tools'],
    searchUrl: 'https://devutil.codes/?q={search_term_string}',
  })
  const set = <K extends keyof SchemaInput>(k: K, v: SchemaInput[K]) => setS((prev) => ({ ...prev, [k]: v }))
  const input = (key: 'name' | 'url' | 'logo' | 'description' | 'headline' | 'author' | 'image' | 'searchUrl', label: string, typeAttr = 'text') => (
    <Field key={key} label={label} htmlFor={`schema-${key}`}>
      <Input id={`schema-${key}`} type={typeAttr} value={s[key]} onChange={(e) => set(key, e.target.value)} />
    </Field>
  )

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <div className="space-y-3 rounded-xl border bg-card p-4 shadow-xs">
        <Field label="Type" htmlFor="schema-type">
          <Select value={type} onValueChange={(v) => setType(v as SchemaType)}>
            <SelectTrigger id="schema-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Organization">Organization</SelectItem>
              <SelectItem value="WebSite">WebSite (with sitelinks search)</SelectItem>
              <SelectItem value="Article">Article / blog post</SelectItem>
              <SelectItem value="BreadcrumbList">Breadcrumbs</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          {type === 'Organization' && [input('name', 'Name'), input('url', 'Website', 'url'), input('logo', 'Logo URL', 'url'), input('description', 'Description')]}
          {type === 'WebSite' && [input('name', 'Name'), input('url', 'URL', 'url'), input('searchUrl', 'Search URL template'), input('description', 'Description')]}
          {type === 'Article' && [
            input('headline', 'Headline'),
            input('author', 'Author'),
            input('image', 'Image URL', 'url'),
            input('url', 'Article URL', 'url'),
            input('name', 'Publisher name'),
            input('logo', 'Publisher logo URL', 'url'),
          ]}
        </div>
        {type === 'Article' && (
          <Field label="Published" htmlFor="schema-date">
            <Input id="schema-date" type="date" value={s.datePublished} onChange={(e) => set('datePublished', e.target.value)} />
          </Field>
        )}
        {type === 'Organization' && (
          <Field label="Profiles (sameAs), one URL per line" htmlFor="schema-sameas">
            <Textarea id="schema-sameas" rows={3} value={s.sameAs.join('\n')} onChange={(e) => set('sameAs', lines(e.target.value))} className="font-mono text-[13px]" />
          </Field>
        )}
        {type === 'BreadcrumbList' && (
          <Field label="Crumbs: “Name | URL”, one per line" htmlFor="schema-crumbs">
            <Textarea id="schema-crumbs" rows={4} value={s.breadcrumbs.join('\n')} onChange={(e) => set('breadcrumbs', lines(e.target.value))} className="font-mono text-[13px]" />
          </Field>
        )}
      </div>
      <Output value={jsonLd(type, s)} language="html" />
    </div>
  )
}

export default function SEOGenerator() {
  const [tab, setTab] = useTabParam(TABS)
  return (
    <ToolPage
      toolId="seo-generator"
      meta={toolsMetadata.seoGenerator}
      reference={
        <ul className="list-disc space-y-1 pl-5">
          <li>All values are HTML/XML-escaped, so quotes and ampersands can’t break your markup.</li>
          <li>Search engines usually show about 60 title characters and 160 description characters.</li>
          <li>robots.txt is advisory: well-behaved crawlers follow it, but it is not access control.</li>
          <li>Validate structured data with Google’s Rich Results Test before shipping.</li>
        </ul>
      }
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="meta">Meta & social</TabsTrigger>
          <TabsTrigger value="robots">robots.txt</TabsTrigger>
          <TabsTrigger value="sitemap">sitemap.xml</TabsTrigger>
          <TabsTrigger value="schema">Schema.org</TabsTrigger>
        </TabsList>
        <TabsContent value="meta" className="mt-4">
          <MetaTab />
        </TabsContent>
        <TabsContent value="robots" className="mt-4">
          <RobotsTab />
        </TabsContent>
        <TabsContent value="sitemap" className="mt-4">
          <SitemapTab />
        </TabsContent>
        <TabsContent value="schema" className="mt-4">
          <SchemaTab />
        </TabsContent>
      </Tabs>
    </ToolPage>
  )
}
