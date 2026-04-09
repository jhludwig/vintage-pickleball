/**
 * Returns the current season's date range and display label.
 * Season runs Nov 1 – May 31 (wraps across Jan 1).
 * In-season (Nov–May): returns the active season.
 * Off-season (Jun–Oct): returns the most recently completed season.
 *
 * @param {Date} [today] - defaults to now
 * @returns {{ start: string, end: string, label: string }}
 */
export function currentSeasonRange(today = new Date()) {
  const year = today.getFullYear()
  const month = today.getMonth() + 1 // 1–12

  if (month >= 11) {
    return {
      start: `${year}-11-01`,
      end: `${year + 1}-05-31`,
      label: `${year}–${year + 1} Season`,
    }
  }
  return {
    start: `${year - 1}-11-01`,
    end: `${year}-05-31`,
    label: `${year - 1}–${year} Season`,
  }
}
