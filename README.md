# LocalPlus

> Free developer tools that run in your browser. Encode, convert, format, hash, decode and test without uploading anything.

**Live site:** [localplus.app](https://localplus.app) · **Repository:** [0xdps/devutil-tools](https://github.com/0xdps/devutil-tools)

## Why

- **Private.** Every tool runs locally. What you paste is never sent to a server. See [Privacy](#privacy).
- **Fast.** One small shell; each tool (and heavy dependencies like the code editor, Prettier and Terser) loads only when you open it.
- **Works offline.** Installable as a PWA; cached tools keep working without a connection.
- **Keyboard-first.** `⌘K` searches every tool and every feature inside a tool. Paste a JWT, JSON, timestamp or hash into the search box (or the home page) and LocalPlus opens the right tool with your content filled in.
- **Open source** (MIT), with light, dark and system themes.

## Tools

| Category | Tool | What it does |
| --- | --- | --- |
| Convert & encode | **Data Transform** | JSON ⇄ YAML ⇄ CSV ⇄ XML ⇄ TOML, with warnings for lossy conversions |
| | **Encode / Decode** | Base64, Base64URL, URL, HTML entities, Base32, Base58, data URIs |
| | **URL Tools** | Parse URLs, edit query parameters in a table |
| Text & code | **Code & JSON** | Prettier formatting for 10 languages, JS/CSS/JSON minify, JSONPath |
| | **Text Utilities** | 12 case styles (understands acronyms), statistics, sort/dedupe lines |
| | **Text Diff** | Live side-by-side or unified diff; export a `.diff` patch |
| | **Regex Tester** | Highlighting, groups, replace, plain-English explainer; runs in a worker |
| Security | **JWT Decoder** | Decode claims and verify HS/RS/PS/ES signatures locally |
| | **Hash & Verify** | MD5 and SHA digests of text or files, checksum verify, HMAC, password strength |
| | **Generators** | UUID v1/v4/v5/v7 + inspector, passwords, random numbers, Lorem Ipsum |
| Web & design | **Color Picker** | HEX/RGB/HSL/OKLCH/HSV/CMYK, WCAG contrast, tint/shade scale |
| | **QR Code** | Links, Wi-Fi, email, phone/SMS and vCard; PNG and SVG |
| | **SEO Generator** | Meta/social tags with previews, robots.txt, sitemap.xml, JSON-LD |
| Date & time | **Timestamp & Cron** | Epoch ⇄ date in any unit; cron explainer with next runs |
| | **Timezone Compare** | World clock and meeting planner (DST-aware) |
| Playgrounds | **Markdown Preview** | GitHub-flavored Markdown with a script-blocking preview |
| | **HTML Playground** | HTML/CSS/JS with a sandboxed live preview and console |
| | **JavaScript Runner** | Runs code in an isolated worker with top-level await |

Sharing: tools that take text input have a **Share** button (`⌥⇧S`). The input is compressed into the URL fragment (`#s=…`), which browsers never send to a server. Shared code never runs until the recipient presses Run. Tools whose input is usually a secret (JWT, hashes, QR, generators) deliberately have no share link.

Press `?` in the app for all keyboard shortcuts.

## Getting started

Requires **Node `^20.19` or `>=22.12`** and [pnpm](https://pnpm.io).

```bash
git clone https://github.com/0xdps/devutil-tools.git
cd devutil-tools
pnpm install
pnpm dev            # http://localhost:3000
```

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Dev server with HMR |
| `pnpm build` | Type-check, then production build into `dist/` (also writes per-route HTML, `sitemap.xml`, `_redirects`) |
| `pnpm preview` | Build, then serve with the Cloudflare Workers runtime (`wrangler dev`) |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm typecheck` | `tsc` for the app and the build tooling |
| `pnpm lint` | ESLint (zero warnings allowed) |
| `pnpm test:e2e` | After `pnpm build`: opens every route in a real browser, in light and dark, desktop and mobile, and runs an axe-core accessibility audit. Set `CHROME=/path/to/chrome` to use a system browser. |
| `pnpm deploy` | Build and deploy to Cloudflare Workers |
| `node scripts/generate-og.mjs` | Regenerate the 1200×630 social card (`public/og-image.png`) after changing the name or tagline |

## Architecture

**Stack:** React 19, TypeScript, Vite 8, Tailwind CSS 4, [shadcn/ui](https://ui.shadcn.com) on Radix, React Router 7, CodeMirror 6, Cloudflare Workers (static assets).

```
src/
├── tools/
│   ├── catalog.ts         # THE tool list: pure data (names, paths, tabs, keywords, SEO copy)
│   ├── registry.ts        # binds an icon + lazy page to each catalog entry
│   └── seo-head.ts        # builds <head> tags; shared by the app and the build
├── pages/                 # one file per tool (+ Home, Contribution, NotFound)
├── lib/                   # pure logic with unit tests: no React, no DOM
│   ├── encoding.ts  jwt.ts  hash.ts  transform.ts  regex.ts  color.ts  cron.ts …
│   └── *.test.ts
├── components/
│   ├── ui/                # shadcn components (owned here, edit freely)
│   ├── tool/              # ToolPage, ToolPanel, CodeEditor, CopyButton, …
│   └── layout/            # app shell, sidebar, ⌘K palette, smart paste
├── hooks/                 # favorites/recents, tab URLs, worker hooks
└── index.css              # design tokens (light/dark) and base styles
vite-plugins/static-routes.ts   # per-route HTML, sitemap.xml, _redirects
scripts/e2e.mjs                 # browser smoke + accessibility audit
docs/                           # analytics, event tracking, shared-core plan
```

**Branding.** The name and URL are `SITE_NAME` and `SITE_URL` in `src/tools/catalog.ts`; everything else (titles, Open Graph, JSON-LD, sitemap, the app shell) derives from them. The PWA manifest is in `vite.config.ts` and the social card is generated by `scripts/generate-og.mjs`.

**Single source of truth.** `src/tools/catalog.ts` drives the sidebar, home page, ⌘K palette, routes, redirects, page titles/descriptions, structured data, the sitemap and the legacy-URL redirects. Adding a tool there makes it appear everywhere.

**Logic lives in `src/lib/`.** Tool pages are thin: they call tested pure functions and render the result. This keeps the logic portable (for a future CLI; see [docs/SHARED_CORE_AND_CLI_PLAN.md](docs/SHARED_CORE_AND_CLI_PLAN.md)) and easy to test.

**SEO without prerendering.** At build time `vite-plugins/static-routes.ts` writes an HTML file per tool and tab (`/generators/lorem` → `generators/lorem.html`) with its own title, description, canonical URL, Open Graph tags and JSON-LD, plus a `<noscript>` fallback. In the browser the app removes that block at startup and manages the tags itself, so there are never duplicates. Legacy URLs get real 301s via `_redirects`.

**Untrusted code is sandboxed.** The JavaScript Runner executes code in a Web Worker created from a `data:` URL (opaque origin: no access to this site's storage). The HTML Playground and Markdown preview render in sandboxed iframes without `allow-same-origin`; the Markdown preview also has a CSP that blocks scripts. Regexes run in a worker with a one-second limit.

## Adding a tool

1. **Logic:** put it in `src/lib/<tool>.ts` as pure functions, with `<tool>.test.ts` beside it.
2. **Page:** create `src/pages/<Tool>.tsx` using `ToolPage`, `ToolPanel`, `CodeEditor` and `CopyButton` from `src/components/tool`. Call `useToolOutput(...)` so `⌥⇧C` copies the result, and `useShareState(...)` if the input is safe to put in a link.
3. **Register:** add an entry to `src/tools/catalog.ts` (name, path, category, keywords, features, `tabs` if it has them, and SEO copy in `TOOL_SEO`), and bind its icon and page in `src/tools/registry.ts`.
4. **Check:** `pnpm typecheck && pnpm lint && pnpm test --run && pnpm build && pnpm test:e2e`.

`catalog.test.ts` enforces title length (≤ 60), description length (70–160), unique paths and titles, and that tab names match.

If a tool has tabs, list them in the catalog's `tabs` and use `useTabParam(TABS)` in the page; each tab gets its own URL (`/tool/tab`) and its own SEO copy.

## Privacy

- **Tool processing is 100% client-side.** Inputs and results are not sent to our servers.
- **Anonymous, aggregate usage statistics** (which pages/tools are opened) help prioritise improvements. Nothing you type into a tool is recorded, and there are no accounts. Details: [docs/ANALYTICS_SETUP.md](docs/ANALYTICS_SETUP.md), [docs/EVENT_TRACKING.md](docs/EVENT_TRACKING.md).
- **Local preferences** (theme, favorites, recent tools, saved time zones) live in your browser only.
- **One third-party script:** the privacy-oriented analytics script in `index.html`. Tool inputs are still processed locally; the only network use by a tool is stated in its UI (for example, the SEO Generator fetches a social image only if you click to preview it).
- Don't treat any website as a secret store. Use copies you control for highly sensitive material, and note that the password strength checker is an estimate, not a guarantee.

## Browser support

Current and previous major versions of Chrome, Edge, Firefox and Safari (desktop and mobile). Share links use `CompressionStream` and fall back to uncompressed links where it is missing.

## Contributing

Bug reports, tool ideas and pull requests are welcome. Start with [Contribute](https://localplus.app/contribute) or open an [issue](https://github.com/0xdps/devutil-tools/issues). Keep each pull request focused, include tests for logic in `src/lib/`, and screenshots for UI changes. Run the checks listed under [Adding a tool](#adding-a-tool) before pushing.

## License

MIT. See [LICENSE](LICENSE).

## Author and support

Built by [Devendra Pratap Singh](https://github.com/0xdps) ([0xdps.xyz](https://0xdps.xyz)). If LocalPlus saves you time, a ⭐ on GitHub or a [coffee](https://buymeacoffee.com/0xdps) helps keep it free.
