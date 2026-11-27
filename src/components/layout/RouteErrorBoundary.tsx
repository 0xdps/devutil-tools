import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RotateCcw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { site } from '@/config/site'

interface Props {
  /** Changing this (e.g. the pathname) clears the error. */
  resetKey: string
  children: ReactNode
}

interface State {
  error: Error | null
}

/** Keeps the shell usable when one tool throws while rendering. */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Tool crashed:', error, info.componentStack)
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="mx-auto mt-10 max-w-lg rounded-xl border bg-card p-6 text-center shadow-xs">
        <TriangleAlert className="mx-auto mb-3 size-8 text-warning" />
        <h1 className="text-lg font-semibold">This tool hit an error</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Nothing was sent anywhere. Try again, or{' '}
          <a className="text-primary underline-offset-4 hover:underline" href={site.issuesUrl} target="_blank" rel="noopener noreferrer">
            report it
          </a>{' '}
          with what you were doing.
        </p>
        <pre className="mt-4 max-h-32 overflow-auto rounded-md bg-muted p-3 text-left text-xs text-muted-foreground">
          {this.state.error.message}
        </pre>
        <Button className="mt-4" variant="outline" onClick={() => this.setState({ error: null })}>
          <RotateCcw /> Try again
        </Button>
      </div>
    )
  }
}
