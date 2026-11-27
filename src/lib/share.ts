/**
 * Encodes tool state for share links. The result goes in the URL *fragment*
 * (#s=…), which browsers never send to servers, so shared data stays between
 * the people holding the link.
 *
 * Format: "1." + base64url(deflate-raw(JSON)), or "0." + base64url(JSON) when
 * the browser lacks CompressionStream.
 */
import { base64ToBytes, bytesToBase64 } from './encoding'

const toB64Url = (bytes: Uint8Array) => bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes.slice().buffer as ArrayBuffer]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(out).arrayBuffer())
}

export async function encodeShare(state: unknown): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(state))
  if (typeof CompressionStream === 'function') return `1.${toB64Url(await pipe(json, new CompressionStream('deflate-raw')))}`
  return `0.${toB64Url(json)}`
}

export async function decodeShare(encoded: string): Promise<unknown> {
  const dot = encoded.indexOf('.')
  const version = encoded.slice(0, dot)
  const payload = base64ToBytes(encoded.slice(dot + 1))
  let json: Uint8Array
  if (version === '1') {
    if (typeof DecompressionStream !== 'function') throw new Error('This browser can’t open compressed share links')
    json = await pipe(payload, new DecompressionStream('deflate-raw'))
  } else if (version === '0') {
    json = payload
  } else {
    throw new Error('Unrecognised share link')
  }
  return JSON.parse(new TextDecoder().decode(json))
}

/** Reads the share payload from a location hash like "#s=1.abc". */
export function shareParam(hash: string): string | null {
  const match = hash.match(/^#s=([A-Za-z0-9_.-]+)$/)
  return match ? match[1] : null
}

/** Browsers and chat apps start truncating somewhere past this. */
export const MAX_SHARE_URL = 16_000
