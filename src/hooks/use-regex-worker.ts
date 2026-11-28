import { useEffect, useRef, useState } from 'react'
import type { RegexResult } from '@/lib/regex'
import type { RegexRequest } from '@/lib/regex.worker'

const TIMEOUT_MS = 1000
const DEBOUNCE_MS = 120

export type RegexState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; result: RegexResult }
  | { status: 'error'; message: string }
  | { status: 'timeout' }

const createWorker = () => new Worker(new URL('../lib/regex.worker.ts', import.meta.url), { type: 'module' })

/**
 * Evaluates a regex off the main thread. A pattern with catastrophic
 * backtracking can't freeze the page: after 1 s the worker is terminated.
 */
export function useRegexWorker(pattern: string, flags: string, text: string, replacement?: string): RegexState {
  const [state, setState] = useState<RegexState>({ status: 'idle' })
  const workerRef = useRef<Worker | null>(null)
  const requestId = useRef(0)

  useEffect(() => () => workerRef.current?.terminate(), [])

  useEffect(() => {
    if (!pattern) {
      setState({ status: 'idle' })
      return
    }
    const id = ++requestId.current
    let timeout: ReturnType<typeof setTimeout> | undefined
    const debounce = setTimeout(() => {
      const worker = (workerRef.current ??= createWorker())
      setState({ status: 'running' })
      worker.onmessage = (e: MessageEvent<{ id: number; ok: boolean; result?: RegexResult; error?: string }>) => {
        if (e.data.id !== requestId.current) return
        clearTimeout(timeout)
        setState(e.data.ok ? { status: 'done', result: e.data.result! } : { status: 'error', message: e.data.error! })
      }
      timeout = setTimeout(() => {
        if (id !== requestId.current) return
        worker.terminate()
        workerRef.current = null
        setState({ status: 'timeout' })
      }, TIMEOUT_MS)
      worker.postMessage({ id, pattern, flags, text, replacement } satisfies RegexRequest)
    }, DEBOUNCE_MS)
    return () => {
      clearTimeout(debounce)
      clearTimeout(timeout)
    }
  }, [pattern, flags, text, replacement])

  return state
}
