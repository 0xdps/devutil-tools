/**
 * Builds the source of a throwaway Web Worker that runs user JavaScript.
 *
 * The worker is created from a data: URL, which gives it an opaque origin:
 * no access to this app's storage, caches or cookies. It runs off the main
 * thread, so the page stays responsive and a runaway loop is ended with
 * worker.terminate().
 */
import { inspect } from './inspect'

export type ConsoleLevel = 'log' | 'info' | 'warn' | 'error' | 'debug' | 'result'

export interface SandboxMessage {
  type: 'console' | 'done' | 'error'
  level?: ConsoleLevel
  text?: string
  ms?: number
}

export function workerSource(code: string): string {
  return `
const inspect = ${inspect.toString()};
const send = (m) => postMessage(m);
const fmtArgs = (args) => {
  // printf-style %s %d %o for the first string argument
  if (typeof args[0] === 'string' && /%[sdiofOj%]/.test(args[0])) {
    let i = 1;
    const head = args[0].replace(/%([sdiofOj%])/g, (m, c) => {
      if (c === '%') return '%';
      if (i >= args.length) return m;
      const v = args[i++];
      return c === 's' ? String(v) : c === 'd' || c === 'i' ? String(parseInt(v)) : c === 'f' ? String(parseFloat(v)) : inspect(v);
    });
    args = [head, ...args.slice(i)];
  }
  return args.map((a) => (typeof a === 'string' ? a : inspect(a))).join(' ');
};
const counts = {};
const timers = {};
for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
  console[level] = (...args) => send({ type: 'console', level, text: fmtArgs(args) });
}
console.table = (data) => send({ type: 'console', level: 'log', text: inspect(data) });
console.dir = (v) => send({ type: 'console', level: 'log', text: inspect(v, 6) });
console.assert = (cond, ...args) => { if (!cond) send({ type: 'console', level: 'error', text: 'Assertion failed' + (args.length ? ': ' + fmtArgs(args) : '') }); };
console.count = (label = 'default') => { counts[label] = (counts[label] || 0) + 1; send({ type: 'console', level: 'log', text: label + ': ' + counts[label] }); };
console.time = (label = 'default') => { timers[label] = performance.now(); };
console.timeEnd = (label = 'default') => { const t = timers[label]; if (t !== undefined) send({ type: 'console', level: 'log', text: label + ': ' + (performance.now() - t).toFixed(2) + ' ms' }); delete timers[label]; };
self.addEventListener('unhandledrejection', (e) => send({ type: 'console', level: 'error', text: 'Uncaught (in promise) ' + inspect(e.reason) }));
const started = performance.now();
(async () => {
${code}
})().then(
  (value) => { if (value !== undefined) send({ type: 'console', level: 'result', text: inspect(value) }); send({ type: 'done', ms: performance.now() - started }); },
  (err) => { send({ type: 'error', text: err instanceof Error ? (err.stack || err.name + ': ' + err.message) : 'Uncaught ' + inspect(err) }); send({ type: 'done', ms: performance.now() - started }); },
);
`
}
