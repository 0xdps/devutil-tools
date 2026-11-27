import { Suspense, lazy } from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { AppShell } from '@/components/layout/AppShell'
import { Toaster } from '@/components/ui/sonner'
import { Skeleton } from '@/components/ui/skeleton'
import PWAUpdatePrompt from '@/components/PWAUpdatePrompt'
import Home from '@/pages/Home'
import { tools } from '@/tools/registry'

const Contribution = lazy(() => import('@/pages/Contribution'))
const NotFound = lazy(() => import('@/pages/NotFound'))

/** Mirrors the ToolPage header + two panels so navigation doesn't jump. */
function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6" aria-busy="true" aria-label="Loading tool">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
      <Skeleton className="h-8 w-full max-w-md" />
      <div className="grid gap-3 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppShell>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/" element={<Home />} />
              {tools.flatMap(({ id, path, aliases = [], component: Component }) =>
                // Aliases render the tool directly for now: some pages read the
                // path (e.g. /json-tools opens the JSON tab). Phase 3 replaces
                // them with sub-routes + <Navigate> redirects.
                [path, ...aliases].map((p) => <Route key={`${id}${p}`} path={p} element={<Component />} />),
              )}
              <Route path="/contribute" element={<Contribution />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AppShell>
        <Toaster position="bottom-right" />
        <PWAUpdatePrompt />
      </Router>
    </ThemeProvider>
  )
}
