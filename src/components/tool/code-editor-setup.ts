/**
 * Shared CodeMirror setup: a token-driven theme (follows light/dark through
 * CSS variables, so one theme serves both) and on-demand language loading.
 */
import { EditorView } from '@codemirror/view'
import { HighlightStyle, StreamLanguage, syntaxHighlighting, type LanguageSupport } from '@codemirror/language'
import type { Extension } from '@codemirror/state'
import { tags as t } from '@lezer/highlight'

export type EditorLanguage =
  | 'json'
  | 'javascript'
  | 'typescript'
  | 'css'
  | 'scss'
  | 'less'
  | 'html'
  | 'xml'
  | 'yaml'
  | 'toml'
  | 'markdown'
  | 'graphql'
  | 'csv'
  | 'text'

/** Dynamically imports the language package, so unused grammars are never downloaded. */
export async function loadLanguage(language: EditorLanguage): Promise<Extension> {
  switch (language) {
    case 'json':
      return (await import('@codemirror/lang-json')).json()
    case 'javascript':
      return (await import('@codemirror/lang-javascript')).javascript({ jsx: true })
    case 'typescript':
      return (await import('@codemirror/lang-javascript')).javascript({ typescript: true, jsx: true })
    case 'css':
      return (await import('@codemirror/lang-css')).css()
    case 'scss':
    case 'less': {
      // lang-css understands nesting well enough for highlighting SCSS/Less
      return (await import('@codemirror/lang-css')).css()
    }
    case 'html':
      return (await import('@codemirror/lang-html')).html()
    case 'xml':
      return (await import('@codemirror/lang-xml')).xml()
    case 'yaml':
      return (await import('@codemirror/lang-yaml')).yaml()
    case 'markdown':
      return (await import('@codemirror/lang-markdown')).markdown()
    case 'toml':
      return StreamLanguage.define((await import('@codemirror/legacy-modes/mode/toml')).toml)
    default:
      // GraphQL/CSV/plain text: no highlighting needed
      return [] as unknown as LanguageSupport
  }
}

export const tokenTheme: Extension = [
  EditorView.theme({
    '&': {
      color: 'var(--foreground)',
      backgroundColor: 'var(--code-background)',
      fontSize: '13px',
      height: '100%',
    },
    '&.cm-focused': { outline: 'none', backgroundColor: 'var(--background)' },
    '.cm-scroller': { fontFamily: "'JetBrains Mono Variable', ui-monospace, 'SF Mono', Menlo, monospace", lineHeight: '1.6', fontVariantLigatures: 'none' },
    '.cm-content': { caretColor: 'var(--primary)', padding: '10px 0' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--primary)' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: 'color-mix(in oklch, var(--primary) 22%, transparent) !important',
    },
    '.cm-gutters': {
      backgroundColor: 'transparent',
      color: 'var(--muted-foreground)',
      border: 'none',
      borderRight: '1px solid var(--border)',
    },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--foreground)' },
    '.cm-activeLine': { backgroundColor: 'color-mix(in oklch, var(--foreground) 4%, transparent)' },
    '.cm-placeholder': { color: 'var(--muted-foreground)' },
    '.cm-matchingBracket': { backgroundColor: 'color-mix(in oklch, var(--primary) 18%, transparent)', outline: 'none' },
    '.cm-foldPlaceholder': { backgroundColor: 'var(--muted)', border: 'none', color: 'var(--muted-foreground)' },
    '.cm-searchMatch': { backgroundColor: 'color-mix(in oklch, var(--warning) 30%, transparent)' },
    '.cm-panels': { backgroundColor: 'var(--card)', color: 'var(--foreground)', borderColor: 'var(--border)' },
    '.cm-panels input, .cm-panels button': { fontFamily: "'Inter Variable', ui-sans-serif, system-ui, sans-serif", fontSize: '12px' },
    '.cm-tooltip': { backgroundColor: 'var(--popover)', color: 'var(--popover-foreground)', border: '1px solid var(--border)' },
    // @codemirror/merge
    '.cm-changedLine': { backgroundColor: 'color-mix(in oklch, var(--warning) 8%, transparent) !important' },
    '&.cm-merge-a .cm-changedLine, .cm-deletedChunk': { backgroundColor: 'color-mix(in oklch, var(--destructive) 10%, transparent) !important' },
    '&.cm-merge-b .cm-changedLine, .cm-inlineChangedLine': { backgroundColor: 'color-mix(in oklch, var(--success) 10%, transparent) !important' },
    '&.cm-merge-a .cm-changedText, .cm-deletedChunk .cm-deletedText': {
      background: 'color-mix(in oklch, var(--destructive) 30%, transparent) !important',
    },
    '&.cm-merge-b .cm-changedText': { background: 'color-mix(in oklch, var(--success) 30%, transparent) !important' },
    '.cm-changeGutter': { width: '3px', paddingLeft: '0' },
    '&.cm-merge-a .cm-changedLineGutter, .cm-deletedLineGutter': { background: 'var(--destructive)' },
    '&.cm-merge-b .cm-changedLineGutter, .cm-changedLineGutter': { background: 'var(--success)' },
    '.cm-collapsedLines': {
      background: 'var(--muted)',
      color: 'var(--muted-foreground)',
      fontFamily: "'Inter Variable', ui-sans-serif, system-ui, sans-serif",
      fontSize: '12px',
    },
  }),
  syntaxHighlighting(
    HighlightStyle.define([
      { tag: [t.keyword, t.operatorKeyword, t.modifier, t.controlKeyword], color: 'var(--syn-keyword)' },
      { tag: [t.propertyName, t.attributeName, t.definition(t.propertyName)], color: 'var(--primary)' },
      { tag: [t.string, t.special(t.string), t.regexp], color: 'var(--success)' },
      { tag: [t.number, t.bool, t.null, t.atom], color: 'var(--syn-number)' },
      { tag: [t.comment, t.lineComment, t.blockComment], color: 'var(--muted-foreground)', fontStyle: 'italic' },
      { tag: [t.tagName, t.typeName, t.className], color: 'var(--syn-tag)' },
      { tag: [t.function(t.variableName), t.function(t.propertyName)], color: 'var(--syn-function)' },
      { tag: [t.heading], color: 'var(--primary)', fontWeight: '600' },
      { tag: [t.emphasis], fontStyle: 'italic' },
      { tag: [t.strong], fontWeight: '600' },
      { tag: [t.link, t.url], color: 'var(--primary)', textDecoration: 'underline' },
      { tag: [t.invalid], color: 'var(--destructive)' },
    ]),
  ),
]
