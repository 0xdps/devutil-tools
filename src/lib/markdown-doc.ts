/**
 * Wraps rendered Markdown HTML in a standalone document for a sandboxed
 * iframe. Scripts are blocked twice: by the iframe sandbox (no
 * allow-scripts) and by a CSP meta tag, so `<img onerror=…>` in Markdown
 * can never run.
 */
export function markdownDocument(bodyHtml: string, { dark }: { dark: boolean }): string {
  const c = dark
    ? { bg: '#0e0f15', fg: '#e6e8ee', muted: '#9aa1b2', border: '#2a2d3a', code: '#171923', link: '#7cc4f5' }
    : { bg: '#ffffff', fg: '#1f2330', muted: '#5d6475', border: '#e3e6ee', code: '#f5f6fa', link: '#0369a1' }
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src * data: blob:; style-src 'unsafe-inline'; media-src *;">
<base target="_blank">
<style>
  :root { color-scheme: ${dark ? 'dark' : 'light'}; }
  body { margin: 0; padding: 24px 28px; background: ${c.bg}; color: ${c.fg}; font: 15px/1.65 'Inter Variable', Inter, system-ui, -apple-system, sans-serif; word-wrap: break-word; }
  h1, h2, h3, h4 { line-height: 1.25; margin: 1.6em 0 .6em; font-weight: 600; }
  h1 { font-size: 1.9em; border-bottom: 1px solid ${c.border}; padding-bottom: .3em; margin-top: 0; }
  h2 { font-size: 1.45em; border-bottom: 1px solid ${c.border}; padding-bottom: .25em; }
  h3 { font-size: 1.2em; }
  p, ul, ol, blockquote, table, pre { margin: 0 0 1em; }
  a { color: ${c.link}; }
  code { font: .88em/1.5 'JetBrains Mono Variable', ui-monospace, Menlo, monospace; background: ${c.code}; padding: .15em .35em; border-radius: 4px; font-variant-ligatures: none; }
  pre { background: ${c.code}; padding: 14px 16px; border-radius: 8px; overflow: auto; border: 1px solid ${c.border}; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 4px solid ${c.border}; color: ${c.muted}; padding: 0 1em; margin-left: 0; }
  table { border-collapse: collapse; display: block; overflow: auto; }
  th, td { border: 1px solid ${c.border}; padding: 6px 12px; }
  th { background: ${c.code}; }
  img { max-width: 100%; }
  hr { border: 0; border-top: 1px solid ${c.border}; margin: 1.5em 0; }
  li + li { margin-top: .25em; }
  input[type=checkbox] { margin-right: .4em; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`
}
