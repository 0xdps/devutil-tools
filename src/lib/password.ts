/**
 * Offline password strength estimate. Not zxcvbn, but it models the things
 * attackers actually try first: common passwords, keyboard walks, sequences,
 * repeats, dates and dictionary-word-plus-digits shapes.
 */

export type StrengthScore = 0 | 1 | 2 | 3 | 4

export interface PasswordEstimate {
  /** Estimated guessing entropy in bits after penalties. */
  bits: number
  score: StrengthScore
  label: 'Very weak' | 'Weak' | 'Fair' | 'Strong' | 'Very strong'
  /** Time to guess at 10 billion guesses/s (offline attack on a fast hash). */
  offlineCrackTime: string
  /** Time to guess at 100 guesses/hour (rate-limited online attack). */
  onlineCrackTime: string
  warnings: string[]
  suggestions: string[]
}

// Most common passwords (short list; enough to catch the obvious).
const COMMON = new Set(
  `123456 password 12345678 qwerty 123456789 12345 1234 111111 1234567 dragon 123123 baseball abc123 football monkey letmein 696969 shadow master 666666 qwertyuiop 123321 mustang 1234567890 michael 654321 superman 1qaz2wsx 7777777 121212 000000 qazwsx 123qwe killer trustno1 jordan jennifer zxcvbnm asdfgh hunter buster soccer harley batman andrew tigger sunshine iloveyou 2000 charlie robert thomas hockey ranger daniel starwars klaster 112233 george computer michelle jessica pepper 1111 zxcvbn 555555 11111111 131313 freedom 777777 pass maggie 159753 aaaaaa ginger princess joshua cheese amanda summer love ashley 6969 nicole chelsea biteme matthew access yankees 987654321 dallas austin thunder taylor matrix admin welcome login passw0rd password1 password123 qwerty123 iloveyou1 admin123 welcome1 changeme secret`.split(
    /\s+/,
  ),
)

const KEYBOARD_ROWS = ['`1234567890-=', 'qwertyuiop[]\\', "asdfghjkl;'", 'zxcvbnm,./', '1qaz2wsx3edc4rfv5tgb6yhn7ujm8ik9ol0p']
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'
const DIGITS = '0123456789'

function poolSize(pw: string): number {
  let pool = 0
  if (/[a-z]/.test(pw)) pool += 26
  if (/[A-Z]/.test(pw)) pool += 26
  if (/[0-9]/.test(pw)) pool += 10
  if (/[^a-zA-Z0-9]/.test(pw)) pool += 33
  if (/[^\x00-\x7f]/.test(pw)) pool += 100
  return pool || 1
}

/** Length of the longest run that is a sequence in `source` (forward or back). */
function longestSequence(pw: string, sources: string[]): number {
  const lower = pw.toLowerCase()
  let best = 0
  for (const src of sources) {
    for (const s of [src, [...src].reverse().join('')]) {
      for (let i = 0; i < lower.length; i++) {
        let len = 0
        const pos = s.indexOf(lower[i])
        while (pos >= 0 && i + len < lower.length && s[pos + len] === lower[i + len]) len++
        if (len > best) best = len
      }
    }
  }
  return best
}

export function formatDuration(seconds: number): string {
  if (seconds < 1) return 'instantly'
  const units: [string, number][] = [
    ['century', 3_153_600_000],
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
    ['second', 1],
  ]
  if (seconds >= 100 * 3_153_600_000) return 'centuries'
  for (const [name, size] of units) {
    if (seconds >= size) {
      const n = Math.round(seconds / size)
      const plural = name === 'century' ? 'centuries' : `${name}s`
      return `${n} ${n === 1 ? name : plural}`
    }
  }
  return 'instantly'
}

export function estimatePassword(password: string): PasswordEstimate {
  const warnings: string[] = []
  const suggestions: string[] = []
  const lower = password.toLowerCase()
  let bits = password.length * Math.log2(poolSize(password))

  const stripped = lower.replace(/[^a-z]/g, '')
  const deLeet = lower.replace(/0/g, 'o').replace(/1/g, 'l').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/@/g, 'a').replace(/\$/g, 's')
  if (COMMON.has(lower) || COMMON.has(deLeet) || COMMON.has(deLeet.replace(/[^a-z]+$/, ''))) {
    bits = Math.min(bits, 10)
    warnings.push('This is one of the most common passwords.')
  } else if (COMMON.has(stripped) && stripped.length >= 4) {
    bits = Math.min(bits, 18 + (password.length - stripped.length) * 2)
    warnings.push('Common words with a few digits or symbols added are easy to guess.')
  }

  const keyboard = longestSequence(password, KEYBOARD_ROWS)
  if (keyboard >= 4) {
    bits -= keyboard * 2.5
    warnings.push('Keyboard patterns like “qwerty” or “asdf” are tried early.')
  }
  const sequence = longestSequence(password, [ALPHABET, DIGITS])
  if (sequence >= 4) {
    bits -= sequence * 2.5
    warnings.push('Sequences like “abcd” or “1234” are easy to guess.')
  }
  const repeats = password.match(/(.+?)\1{2,}/g)
  if (repeats) {
    bits -= repeats.reduce((n, r) => n + r.length, 0) * 2
    warnings.push('Repeated characters add little strength.')
  }
  if (/(19|20)\d{2}/.test(password)) {
    bits -= 6
    warnings.push('Years and dates are common in guessed passwords.')
  }
  if (/^[A-Z]?[a-z]+\d{1,4}[!@#$%^&*?]?$/.test(password)) {
    bits -= 10
    warnings.push('“Word + digits (+ symbol)” is the most-guessed password shape.')
  }

  bits = Math.max(0, Math.round(bits))
  const score: StrengthScore = bits < 28 ? 0 : bits < 40 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4
  const labels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'] as const

  if (password.length < 12) suggestions.push('Use at least 12 characters; length helps more than symbols.')
  if (score < 3) suggestions.push('A passphrase of 4–5 random words is strong and easy to remember.')
  if (score < 4 && !/[^a-zA-Z0-9]/.test(password) && password.length < 16) suggestions.push('Add a symbol or make it longer.')
  if (score >= 3 && warnings.length === 0) suggestions.push('Use a password manager so every site gets a different password.')

  const guesses = 2 ** bits / 2
  return {
    bits,
    score,
    label: labels[score],
    offlineCrackTime: formatDuration(guesses / 1e10),
    onlineCrackTime: formatDuration(guesses / (100 / 3600)),
    warnings: [...new Set(warnings)],
    suggestions,
  }
}
