import type { ReactNode } from 'react'
import { Bug, Code2, Coffee, Lock, BarChart3, Cookie, Star } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { site } from '@/config/site'

interface SiteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function Section({ icon: Icon, title, children }: { icon: typeof Lock; title: string; children: ReactNode }) {
  return (
    <section className="flex gap-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div className="space-y-1 text-sm">
        <h3 className="font-medium text-foreground">{title}</h3>
        <div className="text-muted-foreground [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline">
          {children}
        </div>
      </div>
    </section>
  )
}

export function PrivacyDialog({ open, onOpenChange }: SiteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Privacy</DialogTitle>
          <DialogDescription>Your input stays on your device.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <Section icon={Lock} title="Everything runs in your browser">
            Encoding, hashing, formatting and every other tool run locally. What you paste is never uploaded
            to a server for processing.
          </Section>
          <Section icon={BarChart3} title="Anonymous usage statistics">
            We count which pages and tools are opened, in aggregate, so we know what to improve. We never
            record what you type into a tool, and there are no accounts.
          </Section>
          <Section icon={Cookie} title="Local preferences">
            Your theme, favorite tools and recently used tools are stored in your browser only.
          </Section>
          <Section icon={Code2} title="Open source">
            You can verify all of this in the{' '}
            <a href={site.repoUrl} target="_blank" rel="noopener noreferrer">
              source code on GitHub
            </a>
            .
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function SupportDialog({ open, onOpenChange }: SiteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Support the project</DialogTitle>
          <DialogDescription>{site.fullName} is free and open source.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <Section icon={Coffee} title="Buy me a coffee">
            Donations keep the project free and ad-free.{' '}
            <a href={site.donateUrl} target="_blank" rel="noopener noreferrer">
              Support on Buy Me a Coffee
            </a>
          </Section>
          <Section icon={Star} title="Star it on GitHub">
            A star helps other developers find the project.{' '}
            <a href={site.repoUrl} target="_blank" rel="noopener noreferrer">
              Open the repository
            </a>
          </Section>
          <Section icon={Bug} title="Report a bug or request a tool">
            <a href={site.issuesUrl} target="_blank" rel="noopener noreferrer">
              Open an issue
            </a>{' '}
            with steps to reproduce or a description of the tool you need.
          </Section>
          <Section icon={Code2} title="Contribute code">
            Fork the repository, add a tool or fix something, and open a pull request. See the{' '}
            <a href="/contribute">contribution guide</a>.
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
