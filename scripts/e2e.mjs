#!/usr/bin/env node
/**
 * End-to-end smoke + accessibility check against the production build.
 *
 *   pnpm build && pnpm test:e2e
 *
 * For every route in dist/sitemap.xml (plus a 404), in light/desktop and
 * dark/mobile: the page renders a heading, no tool crashes, nothing scrolls
 * sideways on mobile, and axe-core finds no serious or critical issues.
 * All non-local requests are blocked, so runs never reach analytics.
 *
 * Env: CHROME=/path/to/chrome to use a system browser; E2E_ONLY=/path to
 * check a single route; E2E_VERBOSE=1 to list every violation node.
 */
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import puppeteer from 'puppeteer'

const require = createRequire(import.meta.url)
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
const PORT = 4318
const BASE = `http://localhost:${PORT}`

const sitemap = readFileSync('dist/sitemap.xml', 'utf8')
let routes = [...sitemap.matchAll(/<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g)].map((m) => m[1])
routes.push('/this-page-does-not-exist')
if (process.env.E2E_ONLY) routes = [process.env.E2E_ONLY]

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
const stop = () => server.kill()
process.on('exit', stop)

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(BASE)).ok) return
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error('preview server did not start')
}

const problems = []
const a11y = new Map() // rule id → { impact, help, pages: Set }

await waitForServer()
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME || undefined })

for (const [theme, width, height] of [
  ['light', 1440, 900],
  ['dark', 390, 844],
]) {
  const page = await browser.newPage()
  await page.setRequestInterception(true)
  page.on('request', (r) => {
    const { hostname, protocol } = new URL(r.url())
    return hostname === 'localhost' || protocol === 'data:' || protocol === 'blob:' ? r.continue() : r.abort()
  })
  let current = ''
  page.on('pageerror', (e) => {
    // The sandboxed playground iframes are *supposed* to throw on storage access.
    if (!/sandboxed and lacks the 'allow-same-origin'/.test(e.message)) problems.push(`${theme} ${current}: ${e.message}`)
  })
  await page.setViewport({ width, height })
  await page.evaluateOnNewDocument((t) => {
    try {
      localStorage.setItem('devutil-theme', t)
    } catch {
      /* sandboxed frames */
    }
  }, theme)

  for (const route of routes) {
    current = route
    await page.goto(BASE + route, { waitUntil: 'networkidle0' })
    await new Promise((r) => setTimeout(r, 300))
    const info = await page.evaluate(() => ({
      h1: document.querySelector('main h1')?.textContent ?? '',
      crashed: document.body.innerText.includes('This tool hit an error'),
      scrollWidth: document.documentElement.scrollWidth,
    }))
    if (!info.h1) problems.push(`${theme} ${route}: no <h1>`)
    if (info.crashed) problems.push(`${theme} ${route}: error boundary shown`)
    if (width < 500 && info.scrollWidth > width) problems.push(`${theme} ${route}: horizontal overflow (${info.scrollWidth}px)`)

    await page.evaluate(AXE)
    const result = await page.evaluate(async () => {
      // Excluded: preview iframes and [data-a11y-demo] samples, which show user content/colours.
      const r = await window.axe.run({ exclude: [['iframe'], ['[data-a11y-demo]']] }, { resultTypes: ['violations'] })
      return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map((n) => n.target.join(' ')) }))
    })
    for (const v of result) {
      if (v.impact !== 'serious' && v.impact !== 'critical') continue
      const entry = a11y.get(v.id) ?? { impact: v.impact, help: v.help, pages: new Set(), nodes: new Set() }
      entry.pages.add(`${theme} ${route}`)
      v.nodes.slice(0, 3).forEach((n) => entry.nodes.add(n))
      a11y.set(v.id, entry)
    }
  }
  await page.close()
}
await browser.close()
stop()

console.log(`Checked ${routes.length} routes × 2 (light desktop, dark mobile)`)
for (const p of problems) console.log(`✗ ${p}`)
for (const [id, v] of a11y) {
  console.log(`✗ a11y ${v.impact}: ${id}: ${v.help} (${v.pages.size} page/theme combos)`)
  if (process.env.E2E_VERBOSE) for (const n of v.nodes) console.log(`    ${n}`)
}
const failed = problems.length + a11y.size
console.log(failed ? `${failed} problem(s)` : '✓ all checks passed')
process.exit(failed ? 1 : 0)
