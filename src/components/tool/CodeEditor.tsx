import { useEffect, useRef } from 'react'
import { Compartment, EditorState } from '@codemirror/state'
import {
  Decoration,
  EditorView,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder as placeholderExt,
} from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { bracketMatching, foldGutter, indentOnInput } from '@codemirror/language'
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search'
import { cn } from '@/lib/utils'
import { loadLanguage, tokenTheme, type EditorLanguage } from './code-editor-setup'

/** A highlighted range (UTF-16 offsets, same as JS string indices). */
export interface EditorMark {
  from: number
  to: number
  className: string
}

export interface CodeEditorProps {
  value: string
  onChange?: (value: string) => void
  language?: EditorLanguage
  readOnly?: boolean
  placeholder?: string
  /** Accessible name for the editable region. */
  ariaLabel?: string
  ariaLabelledBy?: string
  lineWrapping?: boolean
  className?: string
  autoFocus?: boolean
  /** Ranges to highlight, e.g. regex matches. */
  marks?: EditorMark[]
}

/**
 * CodeMirror 6 editor: line numbers, folding, search (⌘F), bracket matching,
 * undo history. Controlled: `value` updates are applied without losing the
 * cursor when they come from this editor.
 */
export function CodeEditor({
  value,
  onChange,
  language = 'text',
  readOnly = false,
  placeholder = '',
  ariaLabel,
  ariaLabelledBy,
  lineWrapping = true,
  className,
  autoFocus = false,
  marks,
}: CodeEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const languageCompartment = useRef(new Compartment())
  const marksCompartment = useRef(new Compartment())
  onChangeRef.current = onChange

  // Create once.
  useEffect(() => {
    const view = new EditorView({
      parent: hostRef.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          foldGutter(),
          highlightActiveLineGutter(),
          history(),
          drawSelection(),
          indentOnInput(),
          bracketMatching(),
          highlightActiveLine(),
          highlightSelectionMatches(),
          search({ top: true }),
          keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
          tokenTheme,
          languageCompartment.current.of([]),
          marksCompartment.current.of([]),
          lineWrapping ? EditorView.lineWrapping : [],
          EditorState.readOnly.of(readOnly),
          EditorView.editable.of(!readOnly),
          placeholder ? placeholderExt(placeholder) : [],
          EditorView.contentAttributes.of({
            ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
            ...(ariaLabelledBy ? { 'aria-labelledby': ariaLabelledBy } : {}),
            ...(readOnly ? { 'aria-readonly': 'true' } : {}),
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current?.(update.state.doc.toString())
          }),
        ],
      }),
    })
    viewRef.current = view
    if (autoFocus) view.focus()
    return () => {
      view.destroy()
      viewRef.current = null
    }
    // Static options are fixed at mount; value/language are synced below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // External value changes (e.g. "Format", "Clear", "Example").
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== value) view.dispatch({ changes: { from: 0, to: current.length, insert: value } })
  }, [value])

  // Highlight marks (skip empty and out-of-range ranges; CM requires sorted input).
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const length = view.state.doc.length
    const ranges = (marks ?? [])
      .filter((m) => m.to > m.from && m.to <= length)
      .map((m) => Decoration.mark({ class: m.className }).range(m.from, m.to))
    view.dispatch({ effects: marksCompartment.current.reconfigure(EditorView.decorations.of(Decoration.set(ranges, true))) })
  }, [marks])

  // Language: load the grammar on demand, then swap it in.
  useEffect(() => {
    let cancelled = false
    loadLanguage(language).then((ext) => {
      if (!cancelled) viewRef.current?.dispatch({ effects: languageCompartment.current.reconfigure(ext) })
    })
    return () => {
      cancelled = true
    }
  }, [language])

  return <div ref={hostRef} className={cn('min-h-56 flex-1 overflow-hidden md:min-h-80 [&_.cm-editor]:h-full [&_.cm-editor]:min-h-[inherit]', className)} />
}
