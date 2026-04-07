export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function isInSeason(mmdd, seasonStart, seasonEnd) {
  // seasonStart > seasonEnd means the season wraps across Jan 1 (e.g. Nov–May)
  const wraps = seasonStart > seasonEnd
  if (wraps) {
    return mmdd >= seasonStart || mmdd <= seasonEnd
  }
  return mmdd >= seasonStart && mmdd <= seasonEnd
}

/**
 * Returns the next date (YYYY-MM-DD) >= todayStr whose weekday matches
 * template.day_of_week and which falls within the season window.
 * Returns null if no such date exists within the next 7 days.
 *
 * @param {{ day_of_week: number, season_start: string, season_end: string }} template
 * @param {string} todayStr - YYYY-MM-DD
 * @returns {string|null}
 */
export function getNextOccurrence(template, todayStr) {
  const { day_of_week, season_start, season_end } = template
  const today = new Date(todayStr + 'T00:00:00')

  // Find the next date (including today) that matches the target weekday
  const candidate = new Date(today)
  for (let i = 0; i < 7; i++) {
    if (candidate.getDay() === day_of_week) break
    candidate.setDate(candidate.getDate() + 1)
  }

  const y = candidate.getFullYear()
  const m = String(candidate.getMonth() + 1).padStart(2, '0')
  const d = String(candidate.getDate()).padStart(2, '0')
  const candidateStr = `${y}-${m}-${d}`
  const mmdd = candidateStr.slice(5) // 'MM-DD'

  return isInSeason(mmdd, season_start, season_end) ? candidateStr : null
}
