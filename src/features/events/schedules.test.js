import { describe, it, expect } from 'vitest'
import { getNextOccurrence, DAYS } from './schedules'

// Reference: 2026-04-07 is a Tuesday (day 2), in-season for Nov-May
const TUE = 2

describe('getNextOccurrence', () => {
  const NOV_MAY = { season_start: '11-01', season_end: '05-31' }

  it('returns today if today matches day_of_week and is in season', () => {
    expect(getNextOccurrence({ day_of_week: TUE, ...NOV_MAY }, '2026-04-07')).toBe('2026-04-07')
  })

  it('returns next matching weekday when today does not match', () => {
    // 2026-04-06 is Monday; next Tuesday is 2026-04-07
    expect(getNextOccurrence({ day_of_week: TUE, ...NOV_MAY }, '2026-04-06')).toBe('2026-04-07')
  })

  it('returns null when outside season (summer)', () => {
    // 2026-08-04 is a Tuesday but August is outside Nov-May
    expect(getNextOccurrence({ day_of_week: TUE, ...NOV_MAY }, '2026-08-04')).toBeNull()
  })

  it('returns date when today is the last day of the season', () => {
    // 2026-05-26 is a Tuesday (7 weeks after 2026-04-07), still in season
    expect(getNextOccurrence({ day_of_week: TUE, ...NOV_MAY }, '2026-05-26')).toBe('2026-05-26')
  })

  it('returns null when next matching weekday falls after season end', () => {
    // 2026-05-28 is Thursday; next Tuesday 2026-06-02 is outside season
    expect(getNextOccurrence({ day_of_week: TUE, ...NOV_MAY }, '2026-05-28')).toBeNull()
  })

  it('handles non-wrapping season (e.g. June–August)', () => {
    // 2026-07-07 is a Tuesday (13 weeks after 2026-04-07)
    expect(getNextOccurrence(
      { day_of_week: TUE, season_start: '06-01', season_end: '08-31' },
      '2026-07-07'
    )).toBe('2026-07-07')
  })

  it('returns null outside non-wrapping season', () => {
    expect(getNextOccurrence(
      { day_of_week: TUE, season_start: '06-01', season_end: '08-31' },
      '2026-04-07'
    )).toBeNull()
  })
})

describe('DAYS', () => {
  it('is a 7-element array starting with Sunday', () => {
    expect(DAYS).toHaveLength(7)
    expect(DAYS[0]).toBe('Sunday')
    expect(DAYS[2]).toBe('Tuesday')
    expect(DAYS[6]).toBe('Saturday')
  })
})

describe('getNextOccurrence wrapping season', () => {
  it('returns date on the first day of the wrapping season', () => {
    expect(getNextOccurrence(
      { day_of_week: 2, season_start: '11-01', season_end: '05-31' },
      '2025-11-04'
    )).toBe('2025-11-04')
  })
})
