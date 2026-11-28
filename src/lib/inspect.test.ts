import { describe, expect, it } from 'vitest'
import { inspect } from './inspect'
import { workerSource } from './js-sandbox'

describe('inspect', () => {
  it('formats primitives (top-level strings unquoted)', () => {
    expect(inspect('hi')).toBe('hi')
    expect(inspect(['hi'])).toBe('[ "hi" ]')
    expect(inspect(10n)).toBe('10n')
    expect(inspect(-0)).toBe('-0')
    expect(inspect(undefined)).toBe('undefined')
    expect(inspect(Symbol('s'))).toBe('Symbol(s)')
  })
  it('formats objects, collections and class instances', () => {
    expect(inspect({ a: 1, 'b-c': [1, 2] })).toBe('{ a: 1, "b-c": [ 1, 2 ] }')
    expect(inspect(new Map([['k', 1]]))).toBe('Map(1) { "k" => 1 }')
    expect(inspect(new Set([1, 2]))).toBe('Set(2) { 1, 2 }')
    class Point {
      x = 1
    }
    expect(inspect(new Point())).toBe('Point { x: 1 }')
    expect(inspect(new Uint8Array([1, 2]))).toBe('Uint8Array(2) [ 1, 2 ]')
    expect(inspect(function named() {})).toBe('[Function: named]')
    expect(inspect(new Date(0))).toBe('1970-01-01T00:00:00.000Z')
  })
  it('handles circular references, depth and long arrays', () => {
    const a: Record<string, unknown> = { name: 'a' }
    a.self = a
    expect(inspect(a)).toBe('{ name: "a", self: [Circular] }')
    expect(inspect({ a: { b: { c: { d: { e: 1 } } } } })).toContain('[Object]')
    expect(inspect(Array.from({ length: 105 }, (_, i) => i))).toContain('... 5 more items')
  })
  it('wraps long output across lines', () => {
    const out = inspect({ alpha: 'a'.repeat(30), beta: 'b'.repeat(30), gamma: 'c'.repeat(30) })
    expect(out.split('\n')).toHaveLength(5)
  })
  it('survives being serialized into a worker (self-contained)', () => {
    // Re-create from source the way the worker does, with nothing else in scope.
    const rebuilt = new Function(`return (${inspect.toString()})`)() as typeof inspect
    expect(rebuilt({ ok: [1, new Set(['x'])] })).toBe('{ ok: [ 1, Set(1) { "x" } ] }')
  })
})

describe('workerSource', () => {
  it('embeds the user code inside an async wrapper', () => {
    const src = workerSource('await 1; console.log("x")')
    expect(src).toContain('(async () => {\nawait 1; console.log("x")\n})()')
    expect(() => new Function(src)).not.toThrow() // syntactically valid
  })
})
