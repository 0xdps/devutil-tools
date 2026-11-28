import { describe, expect, it } from 'vitest'
import { contrastRatio, formatAll, generateScale, parseColor, rgbToOklch, toHex, wcagLevels } from './color'

const hexOf = (s: string) => toHex(parseColor(s))

describe('parseColor', () => {
  it.each([
    ['#0ea5e9', '#0ea5e9'],
    ['#0AF', '#00aaff'],
    ['#00aaff80', '#00aaff80'],
    ['tomato', '#ff6347'],
    ['rgb(14 165 233)', '#0ea5e9'],
    ['rgba(14, 165, 233, 0.5)', '#0ea5e980'],
    ['rgb(100% 0% 50%)', '#ff0080'],
    ['hsl(0 100% 50%)', '#ff0000'],
    ['hsl(120deg, 100%, 25%)', '#008000'],
    ['hwb(0 0% 0%)', '#ff0000'],
    ['oklch(62.8% 0.2577 29.23)', '#ff0000'],
  ])('%s → %s', (input, hex) => expect(hexOf(input)).toBe(hex))

  it('explains bad input', () => {
    expect(() => parseColor('')).toThrow(/Enter/)
    expect(() => parseColor('blurple')).toThrow(/Not a recognised color/)
    expect(() => parseColor('rgb(1 2)')).toThrow(/3 values/)
  })
})

describe('conversions', () => {
  it('formats in every space', () => {
    const f = Object.fromEntries(formatAll(parseColor('#0ea5e9')).map((x) => [x.id, x.value]))
    expect(f.rgb).toBe('rgb(14 165 233)')
    expect(f.hsl).toBe('hsl(199 89% 48%)')
    expect(f.oklch).toMatch(/^oklch\(68\.\d% 0\.1[45]\d 237\.\d\)$/)
    expect(f.cmyk).toBe('cmyk(94%, 29%, 0%, 9%)')
  })
  it('round-trips through OKLCH', () => {
    for (const hex of ['#0ea5e9', '#ff6347', '#123456', '#ffffff', '#000000']) {
      const { l, c, h } = rgbToOklch(parseColor(hex))
      expect(hexOf(`oklch(${l * 100}% ${c} ${h})`)).toBe(hex)
    }
  })
})

describe('contrast', () => {
  it('matches WCAG reference values', () => {
    expect(contrastRatio(parseColor('#000'), parseColor('#fff'))).toBeCloseTo(21, 5)
    expect(contrastRatio(parseColor('#777'), parseColor('#fff'))).toBeCloseTo(4.48, 2)
    expect(wcagLevels(4.48)).toEqual({ aaNormal: false, aaLarge: true, aaaNormal: false, aaaLarge: false })
  })
  it('composites translucent foregrounds', () => {
    expect(contrastRatio(parseColor('rgb(0 0 0 / 0)'), parseColor('#fff'))).toBeCloseTo(1, 5)
  })
})

describe('scale', () => {
  it('produces 11 steps from light to dark with the same hue', () => {
    const scale = generateScale(parseColor('#0ea5e9'))
    expect(scale.map((s) => s.step)).toEqual([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950])
    const lightness = scale.map((s) => rgbToOklch(s.color).l)
    expect([...lightness].sort((a, b) => b - a)).toEqual(lightness)
    for (const s of scale.slice(2, 9)) expect(Math.abs(rgbToOklch(s.color).h - 237)).toBeLessThan(6)
  })
})
