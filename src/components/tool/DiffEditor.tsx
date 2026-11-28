import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { Compartment, EditorState, type Extension } from '@codemirror/state'
import { EditorView, drawSelection, highlightActiveLine, keymap, lineNumbers } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { search, searchKeymap } from '@codemirror/search'
import { MergeView, goToNextChunk, goToPreviousChunk, unifiedMergeView } from '@codemirror/merge'
import { cn } from '@/lib/utils'
import { loadLanguage, tokenTheme, type EditorLanguage } from './code-editor-setup'

export interface DiffEditorHandle {
  nextChange: () => void
  previousChange: () => void
}

interface DiffEditorProps {
  original: string
  modified: string
  onOriginalChange: (value: string) => void
  onModifiedChange: (value: string) => void
  mode: 'split' | 'unified'
  language: EditorLanguage
  collapseUnchanged: boolean
  className?: string
}

/** Live, editable diff. Split = two editors; unified = one editor with deletions inline. */
export const DiffEditor = forwardRef<DiffEditorHandle, DiffEditorProps>(function DiffEditor(
  { original, modified, onOriginalChange, onModifiedChange, mode, language, collapseUnchanged, className },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null)
  const mergeRef = useRef<MergeView | null>(null)
  const unifiedRef = useRef<EditorView | null>(null)
  const langA = useRef(new Compartment())
  const langB = useRef(new Compartment())
  const callbacks = useRef({ onOriginalChange, onModifiedChange })
  callbacks.current = { onOriginalChange, onModifiedChange }
  // Latest docs, so a rebuild (mode switch) starts from current text.
  const docs = useRef({ original, modified })
  docs.current = { original, modified }

  const modifiedView = () => mergeRef.current?.b ?? unifiedRef.current

  useImperativeHandle(ref, () => ({
    nextChange: () => {
      const v = modifiedView()
      if (v) goToNextChunk(v)
    },
    previousChange: () => {
      const v = modifiedView()
      if (v) goToPreviousChunk(v)
    },
  }))

  // (Re)build when the layout-affecting options change.
  useEffect(() => {
    const base = (onChange: (v: string) => void, compartment: Compartment): Extension[] => [
      lineNumbers(),
      history(),
      drawSelection(),
      highlightActiveLine(),
      search({ top: true }),
      keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
      EditorView.lineWrapping,
      tokenTheme,
      compartment.of([]),
      EditorView.updateListener.of((u) => {
        if (u.docChanged) onChange(u.state.doc.toString())
      }),
    ]
    const collapse = collapseUnchanged ? { margin: 3, minSize: 6 } : undefined

    if (mode === 'split') {
      mergeRef.current = new MergeView({
        parent: hostRef.current!,
        a: {
          doc: docs.current.original,
          extensions: [...base((v) => callbacks.current.onOriginalChange(v), langA.current), EditorView.contentAttributes.of({ 'aria-label': 'Original text' })],
        },
        b: {
          doc: docs.current.modified,
          extensions: [...base((v) => callbacks.current.onModifiedChange(v), langB.current), EditorView.contentAttributes.of({ 'aria-label': 'Modified text' })],
        },
        gutter: true,
        highlightChanges: true,
        collapseUnchanged: collapse,
      })
    } else {
      unifiedRef.current = new EditorView({
        parent: hostRef.current!,
        state: EditorState.create({
          doc: docs.current.modified,
          extensions: [
            ...base((v) => callbacks.current.onModifiedChange(v), langB.current),
            unifiedMergeView({ original: docs.current.original, mergeControls: false, gutter: true, collapseUnchanged: collapse }),
            EditorView.contentAttributes.of({ 'aria-label': 'Modified text with deletions shown inline' }),
          ],
        }),
      })
    }
    return () => {
      mergeRef.current?.destroy()
      unifiedRef.current?.destroy()
      mergeRef.current = null
      unifiedRef.current = null
    }
    // Rebuilding on `original` in unified mode is handled below.
  }, [mode, collapseUnchanged])

  // Push external text changes (file loads, swap, clear) into the editors.
  useEffect(() => {
    const sync = (view: EditorView | undefined | null, text: string) => {
      if (!view) return
      const current = view.state.doc.toString()
      if (current !== text) view.dispatch({ changes: { from: 0, to: current.length, insert: text } })
    }
    if (mergeRef.current) {
      sync(mergeRef.current.a, original)
      sync(mergeRef.current.b, modified)
    } else if (unifiedRef.current) {
      sync(unifiedRef.current, modified)
    }
  }, [original, modified])

  // Unified view's "original" lives in its config; rebuild that view when it changes externally.
  const lastOriginal = useRef(original)
  useEffect(() => {
    if (mode !== 'unified' || lastOriginal.current === original) {
      lastOriginal.current = original
      return
    }
    lastOriginal.current = original
    const view = unifiedRef.current
    if (!view) return
    view.setState(
      EditorState.create({
        doc: view.state.doc,
        extensions: [
          lineNumbers(),
          history(),
          drawSelection(),
          highlightActiveLine(),
          search({ top: true }),
          keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
          EditorView.lineWrapping,
          tokenTheme,
          langB.current.of([]),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) callbacks.current.onModifiedChange(u.state.doc.toString())
          }),
          unifiedMergeView({ original, mergeControls: false, gutter: true, collapseUnchanged: collapseUnchanged ? { margin: 3, minSize: 6 } : undefined }),
        ],
      }),
    )
    loadLanguage(language).then((ext) => view.dispatch({ effects: langB.current.reconfigure(ext) }))
  }, [original, mode, collapseUnchanged, language])

  // Language (loaded on demand).
  useEffect(() => {
    let cancelled = false
    loadLanguage(language).then((ext) => {
      if (cancelled) return
      mergeRef.current?.a.dispatch({ effects: langA.current.reconfigure(ext) })
      ;(mergeRef.current?.b ?? unifiedRef.current)?.dispatch({ effects: langB.current.reconfigure(ext) })
    })
    return () => {
      cancelled = true
    }
  }, [language, mode, collapseUnchanged])

  return (
    <div
      ref={hostRef}
      className={cn(
        'min-h-80 overflow-hidden rounded-xl border bg-code shadow-xs [&_.cm-editor]:min-h-80 [&_.cm-mergeView]:min-h-80 [&_.cm-mergeViewEditor+.cm-mergeViewEditor]:border-l',
        className,
      )}
    />
  )
})
