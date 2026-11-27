#!/usr/bin/env node
/**
 * Renders public/og-image.png (1200×630), the social card used by Open Graph
 * and Twitter tags. Re-run after changing the name or tagline:
 *
 *   node scripts/generate-og.mjs          (CHROME=/path/to/chrome if needed)
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import puppeteer from 'puppeteer'

const require = createRequire(import.meta.url)
const font = readFileSync(require.resolve('@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')).toString('base64')
const logo = readFileSync('public/logo.svg', 'utf8')

const NAME = 'LocalPlus'
const TAGLINE = 'Free, private developer tools that run in your browser'
const CHIPS = ['JWT', 'Base64', 'JSON', 'Regex', 'UUID', 'Hash', 'Cron', 'Diff', 'QR']

const html = `<!doctype html><meta charset="utf-8"><style>
  @font-face { font-family: Inter; font-weight: 100 900; src: url(data:font/woff2;base64,${font}) format('woff2'); }
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; font-family: Inter, sans-serif; color: #f1f3f9; overflow: hidden;
    background: radial-gradient(900px 500px at 85% 10%, rgba(56,189,248,.22), transparent 60%),
                radial-gradient(700px 500px at 0% 100%, rgba(45,212,191,.14), transparent 60%), #0b0d14;
    display: flex; flex-direction: column; justify-content: space-between; padding: 72px 80px; }
  .brand { display: flex; align-items: center; gap: 28px; }
  .brand svg { width: 120px; height: 120px; border-radius: 28px; box-shadow: 0 12px 40px rgba(0,0,0,.45); }
  .name { font-size: 104px; font-weight: 760; letter-spacing: -.035em; line-height: 1; }
  .name b { color: #38bdf8; font-weight: 760; }
  .tag { font-size: 44px; font-weight: 500; line-height: 1.25; color: #c9cfdd; max-width: 900px; letter-spacing: -.01em; }
  .tag em { font-style: normal; color: #f1f3f9; }
  .chips { display: flex; gap: 14px; flex-wrap: wrap; }
  .chip { font: 600 24px/1 ui-monospace, 'SF Mono', Menlo, monospace; padding: 12px 20px; border-radius: 12px;
    border: 1.5px solid rgba(255,255,255,.16); background: rgba(255,255,255,.05); color: #dfe4f0; }
  .foot { display: flex; justify-content: space-between; align-items: center; font-size: 28px; color: #8c94a8; }
  .foot strong { color: #38bdf8; font-weight: 650; }
</style>
<div class="brand">${logo}<div class="name">Local<b>Plus</b></div></div>
<div class="tag">${TAGLINE.replace('private', '<em>private</em>')}</div>
<div class="chips">${CHIPS.map((c) => `<span class="chip">${c}</span>`).join('')}</div>
<div class="foot"><span>Nothing you paste is ever uploaded</span><strong>localplus.app</strong></div>`

if (!html.includes(NAME.slice(0, 5))) throw new Error('name missing from template')

const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME || undefined })
const page = await browser.newPage()
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 })
await page.setContent(html, { waitUntil: 'load' })
await page.evaluate(() => document.fonts.ready)
await page.screenshot({ path: 'public/og-image.png', type: 'png' })
await browser.close()
console.log('wrote public/og-image.png (1200×630)')
