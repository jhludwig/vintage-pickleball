import { describe, it, expect } from 'vitest'
import { ratingTierClass } from './playerName'

describe('ratingTierClass', () => {
  it('returns purple for 5.5', () => {
    expect(ratingTierClass('5.5')).toBe('border-l-purple-500')
  })
  it('returns purple for 6.0', () => {
    expect(ratingTierClass('6.0')).toBe('border-l-purple-500')
  })
  it('returns blue for 4.5', () => {
    expect(ratingTierClass('4.5')).toBe('border-l-blue-500')
  })
  it('returns blue for 5.49', () => {
    expect(ratingTierClass('5.49')).toBe('border-l-blue-500')
  })
  it('returns emerald for 3.5', () => {
    expect(ratingTierClass('3.5')).toBe('border-l-emerald-500')
  })
  it('returns emerald for 4.49', () => {
    expect(ratingTierClass('4.49')).toBe('border-l-emerald-500')
  })
  it('returns amber for 2.5', () => {
    expect(ratingTierClass('2.5')).toBe('border-l-amber-400')
  })
  it('returns amber for 3.49', () => {
    expect(ratingTierClass('3.49')).toBe('border-l-amber-400')
  })
  it('returns stone for 2.4', () => {
    expect(ratingTierClass('2.4')).toBe('border-l-stone-300')
  })
  it('returns stone for empty string', () => {
    expect(ratingTierClass('')).toBe('border-l-stone-300')
  })
  it('returns stone for non-numeric', () => {
    expect(ratingTierClass('N/A')).toBe('border-l-stone-300')
  })
})
