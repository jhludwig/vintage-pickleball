import { describe, it, expect } from 'vitest'
import { currentSeasonRange } from './season'

describe('currentSeasonRange', () => {
  it('returns correct range for a date in November', () => {
    const result = currentSeasonRange(new Date('2025-11-15'))
    expect(result.start).toBe('2025-11-01')
    expect(result.end).toBe('2026-05-31')
    expect(result.label).toBe('2025–2026 Season')
  })

  it('returns correct range for a date in December', () => {
    const result = currentSeasonRange(new Date('2025-12-01'))
    expect(result.start).toBe('2025-11-01')
    expect(result.end).toBe('2026-05-31')
    expect(result.label).toBe('2025–2026 Season')
  })

  it('returns correct range for a date in January', () => {
    const result = currentSeasonRange(new Date('2026-01-20'))
    expect(result.start).toBe('2025-11-01')
    expect(result.end).toBe('2026-05-31')
    expect(result.label).toBe('2025–2026 Season')
  })

  it('returns correct range for a date in May', () => {
    const result = currentSeasonRange(new Date('2026-05-31'))
    expect(result.start).toBe('2025-11-01')
    expect(result.end).toBe('2026-05-31')
    expect(result.label).toBe('2025–2026 Season')
  })

  it('returns most recent season for an off-season date in June', () => {
    const result = currentSeasonRange(new Date('2026-06-01'))
    expect(result.start).toBe('2025-11-01')
    expect(result.end).toBe('2026-05-31')
    expect(result.label).toBe('2025–2026 Season')
  })

  it('returns most recent season for an off-season date in October', () => {
    const result = currentSeasonRange(new Date('2026-10-31'))
    expect(result.start).toBe('2025-11-01')
    expect(result.end).toBe('2026-05-31')
    expect(result.label).toBe('2025–2026 Season')
  })
})
