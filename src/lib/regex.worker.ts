/// <reference lib="webworker" />
import { runRegex } from './regex'

export interface RegexRequest {
  id: number
  pattern: string
  flags: string
  text: string
  replacement?: string
}

self.onmessage = (event: MessageEvent<RegexRequest>) => {
  const { id, pattern, flags, text, replacement } = event.data
  try {
    self.postMessage({ id, ok: true, result: runRegex(pattern, flags, text, replacement) })
  } catch (e) {
    self.postMessage({ id, ok: false, error: e instanceof Error ? e.message : String(e) })
  }
}
