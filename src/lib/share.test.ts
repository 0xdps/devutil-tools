import { describe, expect, it } from 'vitest'
import { decodeShare, encodeShare, shareParam } from './share'

describe('share links', () => {
  it('round-trips arbitrary state, including unicode', async () => {
    const state = { input: 'héllo 👋 '.repeat(10), mode: 'decode', n: 3, list: [1, null, true] }
    const encoded = await encodeShare(state)
    expect(encoded).toMatch(/^1\.[A-Za-z0-9_-]+$/) // URL-safe, compressed
    expect(await decodeShare(encoded)).toEqual(state)
  })
  it('compresses repetitive content well', async () => {
    const big = { text: 'const answer = 42;\n'.repeat(500) }
    const encoded = await encodeShare(big)
    expect(encoded.length).toBeLessThan(JSON.stringify(big).length / 20)
  })
  it('reads the uncompressed fallback and rejects garbage', async () => {
    expect(await decodeShare('0.eyJhIjoxfQ')).toEqual({ a: 1 })
    await expect(decodeShare('9.abc')).rejects.toThrow(/Unrecognised/)
    await expect(decodeShare('1.not-deflate')).rejects.toThrow()
  })
  it('parses the hash', () => {
    expect(shareParam('#s=1.abc_-')).toBe('1.abc_-')
    expect(shareParam('#other')).toBeNull()
    expect(shareParam('#s=1.abc<script>')).toBeNull()
  })
})
