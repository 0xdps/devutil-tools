/**
 * Color parsing, conversion, contrast and palettes. Pure (no DOM).
 * Internal representation: sRGB channels 0–255 plus alpha 0–1.
 */

export interface Rgba {
  r: number
  g: number
  b: number
  a: number
}

// CSS named colors (CSS Color Module Level 4)
const NAMED: Record<string, string> = {
  aliceblue: 'f0f8ff', antiquewhite: 'faebd7', aqua: '00ffff', aquamarine: '7fffd4', azure: 'f0ffff', beige: 'f5f5dc', bisque: 'ffe4c4', black: '000000',
  blanchedalmond: 'ffebcd', blue: '0000ff', blueviolet: '8a2be2', brown: 'a52a2a', burlywood: 'deb887', cadetblue: '5f9ea0', chartreuse: '7fff00',
  chocolate: 'd2691e', coral: 'ff7f50', cornflowerblue: '6495ed', cornsilk: 'fff8dc', crimson: 'dc143c', cyan: '00ffff', darkblue: '00008b',
  darkcyan: '008b8b', darkgoldenrod: 'b8860b', darkgray: 'a9a9a9', darkgreen: '006400', darkgrey: 'a9a9a9', darkkhaki: 'bdb76b', darkmagenta: '8b008b',
  darkolivegreen: '556b2f', darkorange: 'ff8c00', darkorchid: '9932cc', darkred: '8b0000', darksalmon: 'e9967a', darkseagreen: '8fbc8f',
  darkslateblue: '483d8b', darkslategray: '2f4f4f', darkslategrey: '2f4f4f', darkturquoise: '00ced1', darkviolet: '9400d3', deeppink: 'ff1493',
  deepskyblue: '00bfff', dimgray: '696969', dimgrey: '696969', dodgerblue: '1e90ff', firebrick: 'b22222', floralwhite: 'fffaf0', forestgreen: '228b22',
  fuchsia: 'ff00ff', gainsboro: 'dcdcdc', ghostwhite: 'f8f8ff', gold: 'ffd700', goldenrod: 'daa520', gray: '808080', green: '008000',
  greenyellow: 'adff2f', grey: '808080', honeydew: 'f0fff0', hotpink: 'ff69b4', indianred: 'cd5c5c', indigo: '4b0082', ivory: 'fffff0', khaki: 'f0e68c',
  lavender: 'e6e6fa', lavenderblush: 'fff0f5', lawngreen: '7cfc00', lemonchiffon: 'fffacd', lightblue: 'add8e6', lightcoral: 'f08080', lightcyan: 'e0ffff',
  lightgoldenrodyellow: 'fafad2', lightgray: 'd3d3d3', lightgreen: '90ee90', lightgrey: 'd3d3d3', lightpink: 'ffb6c1', lightsalmon: 'ffa07a',
  lightseagreen: '20b2aa', lightskyblue: '87cefa', lightslategray: '778899', lightslategrey: '778899', lightsteelblue: 'b0c4de', lightyellow: 'ffffe0',
  lime: '00ff00', limegreen: '32cd32', linen: 'faf0e6', magenta: 'ff00ff', maroon: '800000', mediumaquamarine: '66cdaa', mediumblue: '0000cd',
  mediumorchid: 'ba55d3', mediumpurple: '9370db', mediumseagreen: '3cb371', mediumslateblue: '7b68ee', mediumspringgreen: '00fa9a',
  mediumturquoise: '48d1cc', mediumvioletred: 'c71585', midnightblue: '191970', mintcream: 'f5fffa', mistyrose: 'ffe4e1', moccasin: 'ffe4b5',
  navajowhite: 'ffdead', navy: '000080', oldlace: 'fdf5e6', olive: '808000', olivedrab: '6b8e23', orange: 'ffa500', orangered: 'ff4500', orchid: 'da70d6',
  palegoldenrod: 'eee8aa', palegreen: '98fb98', paleturquoise: 'afeeee', palevioletred: 'db7093', papayawhip: 'ffefd5', peachpuff: 'ffdab9', peru: 'cd853f',
  pink: 'ffc0cb', plum: 'dda0dd', powderblue: 'b0e0e6', purple: '800080', rebeccapurple: '663399', red: 'ff0000', rosybrown: 'bc8f8f', royalblue: '4169e1',
  saddlebrown: '8b4513', salmon: 'fa8072', sandybrown: 'f4a460', seagreen: '2e8b57', seashell: 'fff5ee', sienna: 'a0522d', silver: 'c0c0c0',
  skyblue: '87ceeb', slateblue: '6a5acd', slategray: '708090', slategrey: '708090', snow: 'fffafa', springgreen: '00ff7f', steelblue: '4682b4', tan: 'd2b48c',
  teal: '008080', thistle: 'd8bfd8', tomato: 'ff6347', turquoise: '40e0d0', violet: 'ee82ee', wheat: 'f5deb3', white: 'ffffff', whitesmoke: 'f5f5f5',
  yellow: 'ffff00', yellowgreen: '9acd32',
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const round = (v: number, digits = 0) => {
  const f = 10 ** digits
  return Math.round(v * f) / f
}

// ── Parsing ─────────────────────────────────────────────────────────

function parseHex(hex: string): Rgba | null {
  let h = hex.replace(/^#/, '')
  if (![3, 4, 6, 8].includes(h.length) || !/^[0-9a-f]+$/i.test(h)) return null
  if (h.length <= 4) h = [...h].map((c) => c + c).join('')
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16)
  return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? round(n(6) / 255, 3) : 1 }
}

/** Parses "12", "12%", "0.5", "120deg", "0.5turn" (number units per caller). */
function num(token: string, percentOf: number): number {
  const t = token.trim()
  if (t.endsWith('%')) return (parseFloat(t) / 100) * percentOf
  if (t.endsWith('deg')) return parseFloat(t)
  if (t.endsWith('turn')) return parseFloat(t) * 360
  if (t.endsWith('rad')) return (parseFloat(t) * 180) / Math.PI
  const v = parseFloat(t)
  if (Number.isNaN(v)) throw new Error(`“${token}” is not a number`)
  return v
}

function splitArgs(inner: string): { parts: string[]; alpha?: string } {
  const [main, slashAlpha] = inner.split('/')
  const parts = main.includes(',') ? main.split(',').map((s) => s.trim()) : main.trim().split(/\s+/)
  let alpha: string | undefined = slashAlpha?.trim()
  if (!alpha && parts.length === 4) alpha = parts.pop()
  return { parts, alpha }
}

export function parseColor(input: string): Rgba {
  const s = input.trim().toLowerCase()
  if (!s) throw new Error('Enter a color')
  if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }
  if (NAMED[s]) return parseHex(NAMED[s])!
  const hex = parseHex(s)
  if (hex) return hex
  const fn = s.match(/^([a-z]+)\((.*)\)$/)
  if (!fn) throw new Error('Not a recognised color. Try #0ea5e9, rgb(14 165 233), hsl(199 89% 48%), oklch(68% 0.15 237) or a name like “tomato”.')
  const [, name, inner] = fn
  const { parts, alpha } = splitArgs(inner)
  if (parts.length !== 3) throw new Error(`${name}() needs 3 values`)
  const a = alpha === undefined ? 1 : clamp(num(alpha, 1), 0, 1)
  switch (name) {
    case 'rgb':
    case 'rgba':
      return { r: clamp(num(parts[0], 255), 0, 255), g: clamp(num(parts[1], 255), 0, 255), b: clamp(num(parts[2], 255), 0, 255), a }
    case 'hsl':
    case 'hsla':
      return { ...hslToRgb(num(parts[0], 360), num(parts[1], 100), num(parts[2], 100)), a }
    case 'hwb':
      return { ...hwbToRgb(num(parts[0], 360), num(parts[1], 100), num(parts[2], 100)), a }
    case 'oklch':
      return { ...oklchToRgb(num(parts[0], 1), num(parts[1], 0.4), num(parts[2], 360)), a }
    default:
      throw new Error(`${name}() colors aren't supported`)
  }
}

// ── Conversions ─────────────────────────────────────────────────────

export function rgbToHsl({ r, g, b }: Rgba): { h: number; s: number; l: number } {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255]
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    h = max === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4
    h *= 60
  }
  return { h, s: s * 100, l: l * 100 }
}

export function hslToRgb(h: number, s: number, l: number): Omit<Rgba, 'a'> {
  const sn = clamp(s, 0, 100) / 100
  const ln = clamp(l, 0, 100) / 100
  const k = (n: number) => (n + ((h % 360) + 360) / 30) % 12
  const a = sn * Math.min(ln, 1 - ln)
  const f = (n: number) => ln - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))
  return { r: f(0) * 255, g: f(8) * 255, b: f(4) * 255 }
}

function hwbToRgb(h: number, w: number, bl: number): Omit<Rgba, 'a'> {
  const wn = w / 100
  const bn = bl / 100
  if (wn + bn >= 1) {
    const gray = (wn / (wn + bn)) * 255
    return { r: gray, g: gray, b: gray }
  }
  const base = hslToRgb(h, 100, 50)
  const scale = (c: number) => (c / 255) * (1 - wn - bn) * 255 + wn * 255
  return { r: scale(base.r), g: scale(base.g), b: scale(base.b) }
}

export function rgbToHsv({ r, g, b }: Rgba): { h: number; s: number; v: number } {
  const max = Math.max(r, g, b) / 255
  const min = Math.min(r, g, b) / 255
  const { h } = rgbToHsl({ r, g, b, a: 1 })
  return { h, s: max === 0 ? 0 : ((max - min) / max) * 100, v: max * 100 }
}

export function rgbToCmyk({ r, g, b }: Rgba): { c: number; m: number; y: number; k: number } {
  const k = 1 - Math.max(r, g, b) / 255
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 }
  const f = (v: number) => ((1 - v / 255 - k) / (1 - k)) * 100
  return { c: f(r), m: f(g), y: f(b), k: k * 100 }
}

// sRGB ↔ OKLab/OKLCH (Björn Ottosson)
const toLinear = (c: number) => {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}
const fromLinear = (v: number) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)

export function rgbToOklch({ r, g, b }: Rgba): { l: number; c: number; h: number } {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)]
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const C = Math.sqrt(A * A + B * B)
  let H = (Math.atan2(B, A) * 180) / Math.PI
  if (H < 0) H += 360
  return { l: L, c: C, h: C < 1e-4 ? 0 : H }
}

/** OKLCH → sRGB, reducing chroma until the color is in gamut. */
export function oklchToRgb(L: number, C: number, H: number): Omit<Rgba, 'a'> {
  const convert = (c: number) => {
    const hr = (H * Math.PI) / 180
    const A = c * Math.cos(hr)
    const B = c * Math.sin(hr)
    const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3
    const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3
    const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ]
  }
  // Tolerance absorbs floating-point noise on gamut-edge colors (e.g. pure red).
  const inGamut = (rgb: number[]) => rgb.every((v) => v >= -2e-3 && v <= 1 + 2e-3)
  let lin = convert(C)
  if (!inGamut(lin)) {
    // Binary-search the largest chroma that fits sRGB (keeps lightness and hue).
    let lo = 0
    let hi = C
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2
      if (inGamut(convert(mid))) lo = mid
      else hi = mid
    }
    lin = convert(lo)
  }
  const [r, g, b] = lin.map((v) => clamp(fromLinear(clamp(v, 0, 1)), 0, 255))
  return { r, g, b }
}

// ── Formatting ──────────────────────────────────────────────────────

const hex2 = (v: number) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')

export function toHex(c: Rgba, withAlpha = c.a < 1): string {
  return `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}${withAlpha ? hex2(c.a * 255) : ''}`
}

export interface ColorFormat {
  id: string
  label: string
  value: string
}

export function formatAll(c: Rgba): ColorFormat[] {
  const alpha = c.a < 1 ? ` / ${round(c.a, 2)}` : ''
  const hsl = rgbToHsl(c)
  const hsv = rgbToHsv(c)
  const ok = rgbToOklch(c)
  const cmyk = rgbToCmyk(c)
  return [
    { id: 'hex', label: 'HEX', value: toHex(c) },
    { id: 'rgb', label: 'RGB', value: `rgb(${Math.round(c.r)} ${Math.round(c.g)} ${Math.round(c.b)}${alpha})` },
    { id: 'hsl', label: 'HSL', value: `hsl(${round(hsl.h)} ${round(hsl.s)}% ${round(hsl.l)}%${alpha})` },
    { id: 'oklch', label: 'OKLCH', value: `oklch(${round(ok.l * 100, 1)}% ${round(ok.c, 3)} ${round(ok.h, 1)}${alpha})` },
    { id: 'hsv', label: 'HSV', value: `hsv(${round(hsv.h)}, ${round(hsv.s)}%, ${round(hsv.v)}%)` },
    { id: 'cmyk', label: 'CMYK', value: `cmyk(${round(cmyk.c)}%, ${round(cmyk.m)}%, ${round(cmyk.y)}%, ${round(cmyk.k)}%)` },
  ]
}

// ── Contrast (WCAG 2.x) ─────────────────────────────────────────────

export function relativeLuminance({ r, g, b }: Rgba): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

/** Composites `fg` (possibly translucent) over an opaque `bg`. */
export function composite(fg: Rgba, bg: Rgba): Rgba {
  const mix = (f: number, b: number) => f * fg.a + b * (1 - fg.a)
  return { r: mix(fg.r, bg.r), g: mix(fg.g, bg.g), b: mix(fg.b, bg.b), a: 1 }
}

export function contrastRatio(fg: Rgba, bg: Rgba): number {
  const solidBg = { ...bg, a: 1 }
  const L1 = relativeLuminance(composite(fg, solidBg))
  const L2 = relativeLuminance(solidBg)
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1]
  return (hi + 0.05) / (lo + 0.05)
}

export function wcagLevels(ratio: number) {
  return {
    aaNormal: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaaNormal: ratio >= 7,
    aaaLarge: ratio >= 4.5,
  }
}

// ── Palette ─────────────────────────────────────────────────────────

export const SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const
// Target OKLCH lightness per step (similar to Tailwind's scales)
const STEP_LIGHTNESS: Record<(typeof SCALE_STEPS)[number], number> = {
  50: 0.977, 100: 0.946, 200: 0.89, 300: 0.81, 400: 0.71, 500: 0.62, 600: 0.54, 700: 0.47, 800: 0.4, 900: 0.34, 950: 0.26,
}

/** An 11-step tint/shade scale with the same hue, evenly spaced in perceived lightness. */
export function generateScale(base: Rgba): { step: number; color: Rgba }[] {
  const { c, h } = rgbToOklch(base)
  return SCALE_STEPS.map((step) => {
    const L = STEP_LIGHTNESS[step]
    // Very light and very dark steps can't hold much chroma.
    const chroma = c * (1 - Math.abs(L - 0.6) * 0.9)
    return { step, color: { ...oklchToRgb(L, chroma, h), a: 1 } }
  })
}

/** Black or white, whichever reads better on `bg`. */
export function readableTextOn(bg: Rgba): Rgba {
  const white = { r: 255, g: 255, b: 255, a: 1 }
  const black = { r: 0, g: 0, b: 0, a: 1 }
  return contrastRatio(white, bg) >= contrastRatio(black, bg) ? white : black
}
