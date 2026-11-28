/**
 * Builds the srcdoc for the HTML Playground preview. The iframe is sandboxed
 * without allow-same-origin, so the page runs in an opaque origin and can't
 * touch this app. A small bridge forwards console output via postMessage.
 */
import { inspect } from './inspect'

/** Stops user text from closing our wrapper tags early. */
const guard = (s: string, tag: 'script' | 'style') => s.replace(new RegExp(`</${tag}`, 'gi'), `<\\/${tag}`)

export function playgroundDocument({ html, css, js, token }: { html: string; css: string; js: string; token: string }): string {
  const bridge = `
(() => {
  const inspect = ${inspect.toString()};
  const send = (level, args) => parent.postMessage({ __devutil: ${JSON.stringify(token)}, level, text: args.map((a) => (typeof a === 'string' ? a : inspect(a))).join(' ') }, '*');
  for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
    const original = console[level].bind(console);
    console[level] = (...args) => { send(level, args); original(...args); };
  }
  addEventListener('error', (e) => send('error', [e.error instanceof Error ? (e.error.stack || String(e.error)) : e.message + ' (line ' + e.lineno + ')']));
  addEventListener('unhandledrejection', (e) => send('error', ['Uncaught (in promise) ' + inspect(e.reason)]));
})();`
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script>${bridge}</script>
<style>${guard(css, 'style')}</style>
</head>
<body>
${html}
<script type="module">${guard(js, 'script')}</script>
</body>
</html>`
}

/** A standalone file for "Download": same content, no console bridge. */
export function standaloneDocument({ html, css, js }: { html: string; css: string; js: string }): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Playground</title>
  <style>
${guard(css, 'style')}
  </style>
</head>
<body>
${html}
  <script type="module">
${guard(js, 'script')}
  </script>
</body>
</html>
`
}
