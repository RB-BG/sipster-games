import type { Die } from './types'

/**
 * Score-rang voor vergelijking, hoger = beter.
 * Gewone worpen zijn hun numerieke waarde (65 > 64 > ... > 41 > 32),
 * honderdtallen 100..600 liggen daar natuurlijk boven, mex (21) is 1000.
 * 31 komt nooit als eindscore voor: daar volgt altijd een herworp op.
 */
export function scoreRank(a: Die, b: Die): number {
  const hoog = Math.max(a, b)
  const laag = Math.min(a, b)
  if (hoog === 2 && laag === 1) return 1000
  if (hoog === laag) return hoog * 100
  return hoog * 10 + laag
}

export function isMex(a: Die, b: Die): boolean {
  return scoreRank(a, b) === 1000
}

export function is31(a: Die, b: Die): boolean {
  return Math.max(a, b) === 3 && Math.min(a, b) === 1
}

export function is32(a: Die, b: Die): boolean {
  return Math.max(a, b) === 3 && Math.min(a, b) === 2
}

export function isDouble(a: Die, b: Die): boolean {
  return a === b
}

/** Weergavenaam van een worp, bv. '64', '300', 'mex', '31'. */
export function scoreLabel(a: Die, b: Die): string {
  if (isMex(a, b)) return 'mex'
  if (isDouble(a, b)) return String(a * 100)
  return String(Math.max(a, b) * 10 + Math.min(a, b))
}
