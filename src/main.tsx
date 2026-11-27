import React from 'react'
import ReactDOM from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.tsx'
import './index.css'

/**
 * The build writes each route's SEO tags (title, description, canonical,
 * social, JSON-LD) between <!--seo:start--> and <!--seo:end--> for crawlers.
 * In the browser React renders and updates its own copies on navigation, so
 * remove the static ones first; otherwise the head would hold duplicates.
 */
function removeStaticSeoTags() {
  const nodes = [...document.head.childNodes]
  const start = nodes.findIndex((n) => n.nodeType === Node.COMMENT_NODE && n.nodeValue === 'seo:start')
  const end = nodes.findIndex((n) => n.nodeType === Node.COMMENT_NODE && n.nodeValue === 'seo:end')
  if (start < 0 || end < start) return
  for (const node of nodes.slice(start, end + 1)) node.remove()
}

removeStaticSeoTags()

// #root is always empty in the static HTML (content lives in <noscript>), so render, don't hydrate.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>,
)
