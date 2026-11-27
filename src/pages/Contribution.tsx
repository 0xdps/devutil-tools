import { Link } from 'react-router-dom'
import { Bug, GitFork, GitPullRequest, Lightbulb, Palette, Star, type LucideIcon } from 'lucide-react'
import SEO from '@/components/SEO'
import { pageMeta } from '@/tools/catalog'
import { CopyButton } from '@/components/tool/CopyButton'
import { Button } from '@/components/ui/button'
import { GithubIcon } from '@/components/icons'
import { site } from '@/config/site'

const WAYS: { icon: LucideIcon; title: string; description: string; href?: string }[] = [
  { icon: Bug, title: 'Report a bug', description: 'Tell us what you did, what you expected and what happened.', href: `${site.issuesUrl}/new` },
  { icon: Lightbulb, title: 'Request a tool', description: 'Describe the task you keep doing by hand and the input/output you need.', href: `${site.issuesUrl}/new` },
  { icon: GitPullRequest, title: 'Send a pull request', description: 'Fix a bug, improve a tool or add a new one.' },
  { icon: Palette, title: 'Improve design & copy', description: 'Accessibility, clearer wording and better empty states all help.' },
  { icon: Star, title: 'Spread the word', description: 'Star the repository or share a tool that saved you time.', href: site.repoUrl },
]

const STEPS: { title: string; description: string; code?: string }[] = [
  { title: 'Fork and clone', description: `Fork ${site.repoUrl.replace('https://github.com/', '')} on GitHub, then clone your fork.`, code: 'git clone https://github.com/<your-username>/devutil-tools.git\ncd devutil-tools' },
  { title: 'Install and run', description: 'Node 20+ and pnpm. The dev server opens at http://localhost:3000.', code: 'pnpm install\npnpm dev' },
  { title: 'Create a branch and make your change', description: 'Keep each pull request focused on one fix or feature.', code: 'git checkout -b fix/short-description' },
  { title: 'Check it', description: 'Run the type checker, linter and unit tests before pushing.', code: 'pnpm typecheck && pnpm lint && pnpm test --run' },
  { title: 'Push and open a pull request', description: 'Describe what changed and how you tested it; include screenshots for UI changes.', code: 'git push origin fix/short-description' },
]

const ADD_TOOL = [
  ['Logic', 'Put the transformation in src/lib/<tool>.ts as pure functions, with a <tool>.test.ts next to it.'],
  ['Page', 'Create src/pages/<Tool>.tsx using ToolPage, ToolPanel, CodeEditor and CopyButton from src/components/tool.'],
  ['Register', 'Add one entry to src/tools/registry.ts. Routes, navigation, search and the home page update automatically.'],
  ['Privacy', 'Never send user input over the network. Untrusted code or HTML must run in a sandboxed iframe or worker.'],
]

export default function Contribution() {

  return (
    <>
      <SEO meta={pageMeta('contribute', '/contribute')} />
      <div className="mx-auto max-w-4xl space-y-12">
        <section className="space-y-4 pt-2 sm:pt-6">
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Help build DevUtil</h1>
          <p className="max-w-2xl text-muted-foreground">
            {site.fullName} is free and open source. Bug reports, tool ideas and pull requests are all welcome. Here’s how to get
            started.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <a href={`${site.repoUrl}/fork`} target="_blank" rel="noopener noreferrer">
                <GitFork /> Fork on GitHub
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={site.issuesUrl} target="_blank" rel="noopener noreferrer">
                <GithubIcon className="size-4" /> Browse issues
              </a>
            </Button>
          </div>
        </section>

        <section aria-labelledby="ways" className="space-y-4">
          <h2 id="ways" className="text-lg font-semibold">
            Ways to contribute
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {WAYS.map(({ icon: Icon, title, description, href }) => {
              const body = (
                <>
                  <Icon className="mb-2 size-5 text-primary" />
                  <h3 className="font-medium">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                </>
              )
              return (
                <li key={title}>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block h-full rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-primary/40 hover:bg-accent/40"
                    >
                      {body}
                    </a>
                  ) : (
                    <div className="h-full rounded-xl border bg-card p-4 shadow-xs">{body}</div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        <section aria-labelledby="setup" className="space-y-4">
          <h2 id="setup" className="text-lg font-semibold">
            Your first pull request
          </h2>
          <ol className="space-y-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{i + 1}</span>
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <h3 className="font-medium">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                  {step.code && (
                    <div className="flex items-start gap-2 rounded-lg border bg-code px-3 py-2">
                      <pre tabIndex={0} aria-label={`Commands: ${step.title}`} className="min-w-0 flex-1 overflow-x-auto font-mono text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50">{step.code}</pre>
                      <CopyButton value={step.code} label="Copy command" iconOnly />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="add-tool" className="space-y-4 rounded-xl border bg-card p-5 shadow-xs">
          <h2 id="add-tool" className="text-lg font-semibold">
            Adding a new tool
          </h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            {ADD_TOOL.map(([term, text]) => (
              <div key={term}>
                <dt className="text-sm font-medium">{term}</dt>
                <dd className="text-sm text-muted-foreground">{text}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-muted-foreground">
            Not sure where to start? Look at an existing tool like the{' '}
            <Link to="/encoding" className="text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary">
              Encode / Decode
            </Link>{' '}
            page and its tests.
          </p>
        </section>
      </div>
    </>
  )
}
