import { Suspense, lazy } from 'react'
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import type { ReactElement } from 'react'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { AppShell } from '@/components/layout/AppShell'
import { Toaster } from '@/components/ui/sonner'
import { Skeleton } from '@/components/ui/skeleton'
import PWAUpdatePrompt from '@/components/PWAUpdatePrompt'
import Home from '@/pages/Home'
import { toolHref, tools } from '@/tools/registry'

const Contribution = lazy(() => import('@/pages/Contribution'))
const NotFound = lazy(() => import('@/pages/NotFound'))

function TabRoute({ tabs, base, element }: { tabs: readonly string[]; base: string; element: ReactElement }) {
  const { tab } = useParams()
  const { search } = useLocation()
  // The first tab lives at the base path; unknown tabs go back to the tool.
  return tab && tabs.includes(tab) && tab !== tabs[0] ? element : <Navigate to={`${base}${search}`} replace />
}

function RedirectKeepingSearch({ to }: { to: string }) {
  const { search, hash } = useLocation()
  return <Navigate to={`${to}${search}${hash}`} replace />
}

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
              {tools.flatMap((tool) => {
                const { id, path, tabs, aliases = [], component: Component } = tool
                return [
                  <Route key={id} path={path} element={<Component />} />,
                  // Tab sub-routes: /generators/uuid. Unknown tabs fall back to the tool.
                  ...(tabs
                    ? [
                        <Route
                          key={`${id}/tab`}
                          path={`${path}/:tab`}
                          element={<TabRoute tabs={tabs} base={path} element={<Component />} />}
                        />,
                      ]
                    : []),
                  // Legacy URLs redirect (keeping the query string, e.g. ?tab=).
                  ...aliases.map((alias) => (
                    <Route key={`${id}${alias.path}`} path={alias.path} element={<RedirectKeepingSearch to={toolHref(tool, alias.tab)} />} />
                  )),
                ]
              })}
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
