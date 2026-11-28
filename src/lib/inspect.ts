/**
 * Formats any JS value for a console, like Node's util.inspect (simplified).
 *
 * IMPORTANT: this function is serialized with .toString() and injected into
 * sandboxed workers, so it must be fully self-contained: no imports and no
 * references to anything outside its own body.
 */
export function inspect(value: unknown, depth = 3): string {
  const seen = new WeakSet<object>()
  const MAX_ITEMS = 100

  const fmt = (v: unknown, level: number, nested: boolean): string => {
    if (v === null) return 'null'
    if (v === undefined) return 'undefined'
    const t = typeof v
    if (t === 'string') return nested ? JSON.stringify(v) : (v as string)
    if (t === 'number') return Object.is(v, -0) ? '-0' : String(v)
    if (t === 'bigint') return `${String(v)}n`
    if (t === 'boolean') return String(v)
    if (t === 'symbol') return String(v)
    if (t === 'function') {
      const fn = v as { name?: string; toString(): string }
      return `[${/^class\b/.test(Function.prototype.toString.call(v)) ? 'class' : 'Function'}${fn.name ? `: ${fn.name}` : ' (anonymous)'}]`
    }
    const obj = v as object
    if (obj instanceof Date) return Number.isNaN(obj.getTime()) ? 'Invalid Date' : obj.toISOString()
    if (obj instanceof RegExp) return String(obj)
    if (obj instanceof Error) return obj.stack && obj.stack.includes(obj.message) ? obj.stack : `${obj.name}: ${obj.message}`
    if (seen.has(obj)) return '[Circular]'
    if (level > depth) return Array.isArray(obj) ? '[Array]' : '[Object]'
    seen.add(obj)
    try {
      const pad = '  '.repeat(level + 1)
      const close = '  '.repeat(level)
      const wrap = (open: string, items: string[], end: string, extra = 0) => {
        if (items.length === 0 && extra === 0) return `${open}${end}`
        const more = extra > 0 ? [`... ${extra} more item${extra > 1 ? 's' : ''}`] : []
        const all = [...items, ...more]
        const oneLine = `${open} ${all.join(', ')} ${end}`
        return oneLine.length <= 72 && !oneLine.includes('\n') ? oneLine : `${open}\n${all.map((i) => pad + i).join(',\n')}\n${close}${end}`
      }
      if (Array.isArray(obj)) {
        const items = obj.slice(0, MAX_ITEMS).map((x) => fmt(x, level + 1, true))
        return wrap('[', items, ']', obj.length - items.length)
      }
      if (obj instanceof Map) {
        const entries = [...obj.entries()].slice(0, MAX_ITEMS).map(([k, x]) => `${fmt(k, level + 1, true)} => ${fmt(x, level + 1, true)}`)
        return wrap(`Map(${obj.size}) {`, entries, '}', obj.size - entries.length)
      }
      if (obj instanceof Set) {
        const items = [...obj.values()].slice(0, MAX_ITEMS).map((x) => fmt(x, level + 1, true))
        return wrap(`Set(${obj.size}) {`, items, '}', obj.size - items.length)
      }
      if (ArrayBuffer.isView(obj) && !(obj instanceof DataView)) {
        const arr = Array.from(obj as unknown as ArrayLike<number>)
        const items = arr.slice(0, MAX_ITEMS).map(String)
        return wrap(`${obj.constructor.name}(${arr.length}) [`, items, ']', arr.length - items.length)
      }
      if (typeof (obj as { then?: unknown }).then === 'function') return 'Promise { <pending> }'
      const keys = Object.keys(obj)
      const ctor = (obj as { constructor?: { name?: string } }).constructor
      const prefix = ctor && ctor.name && ctor.name !== 'Object' ? `${ctor.name} ` : Object.getPrototypeOf(obj) === null ? '[Object: null prototype] ' : ''
      const items = keys.slice(0, MAX_ITEMS).map((k) => {
        const key = /^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)
        return `${key}: ${fmt((obj as Record<string, unknown>)[k], level + 1, true)}`
      })
      return wrap(`${prefix}{`, items, '}', keys.length - items.length)
    } finally {
      seen.delete(obj)
    }
  }

  return fmt(value, 0, false)
}
