/**
 * Parse a DUPR-style ranking string to float.
 * Returns -1 for unparseable values (sorts last).
 * @param {string} ranking
 * @returns {number}
 */
export function parseRank(ranking) {
  const n = parseFloat(ranking)
  return isNaN(n) ? -1 : n
}

/**
 * Shuffle array in place using Fisher-Yates.
 * @param {any[]} arr
 * @returns {any[]}
 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Split players into a court assignment: first 2 = team1, last 2 = team2.
 * @param {number} courtNumber
 * @param {object[]} four - exactly 4 players
 */
function makeCourt(courtNumber, four) {
  return {
    court_number: courtNumber,
    team1: four.slice(0, 2),
    team2: four.slice(2, 4),
  }
}

/**
 * Main entry point.
 *
 * @param {object} input
 * @param {object[]} input.participants - checked players for this round
 * @param {number[]} input.activeCourts - e.g. [1,2,3]
 * @param {object} input.options - { memberPriority, genderPriority, rankPriority, socialPriority, mixedPriority, riverMode, rotationPriority }
 * @param {object[]} [input.priorRounds] - Committed rounds in the current event.
 *   Shape: [{ assignments: [{ court_number: number, players: string[] }] }]
 *   where players is an array of player ID strings.
 * @param {object} [input.priorRoundResult] - { [courtNum]: { winners: Player[], losers: Player[] } }
 * @param {object} [input.sittingOutCounts] - { [playerId]: number } — how many prior rounds each player was a participant but not assigned. Higher = more sit-outs.
 * @returns {{ court_number: number, team1: object[], team2: object[] }[]}
 */
export function suggest({ participants, activeCourts, options = {}, priorRounds = [], priorRoundResult = null, sittingOutCounts = {} }) {
  // Pros are never assigned by algorithm
  const pool = participants.filter(p => p.player_type !== 'pro')

  if (options.randomMode) {
    const slots = activeCourts.length * 4
    let base = shuffle([...pool])
    if (options.rotationPriority) {
      base = rotationPrioritySort(base, sittingOutCounts)
    }
    let selected = base.slice(0, slots)
    if (options.genderPriority) {
      selected = genderGroup(selected, activeCourts.length)
    } else if (options.mixedDoubles) {
      selected = mixedDoublesGroup(selected, activeCourts.length)
    }
    return activeCourts.map((courtNum, i) => makeCourt(courtNum, selected.slice(i * 4, i * 4 + 4)))
  }

  if (options.riverMode && priorRoundResult) {
    // rotationPriority is not applied in river mode — river ordering is determined by prior results
    return riverAssign(pool, activeCourts, priorRoundResult)
  }

  return standardAssign(pool, activeCourts, options, priorRounds, sittingOutCounts)
}

function rotationPrioritySort(pool, sittingOutCounts) {
  const sitters = pool
    .filter(p => (sittingOutCounts[p.id] ?? 0) > 0)
    .sort((a, b) => (sittingOutCounts[b.id] ?? 0) - (sittingOutCounts[a.id] ?? 0))
  const others = pool.filter(p => (sittingOutCounts[p.id] ?? 0) === 0)
  return [...sitters, ...others]
}

function standardAssign(pool, activeCourts, options, priorRounds, sittingOutCounts = {}) {
  const slots = activeCourts.length * 4
  let sorted = [...pool]

  // Member Priority: members before guests
  if (options.memberPriority) {
    sorted.sort((a, b) => {
      const rank = t => t === 'member' ? 0 : 1
      return rank(a.player_type) - rank(b.player_type)
    })
  }

  // Rank Priority: sort by rank descending (stable within member/guest groups if memberPriority also set)
  if (options.rankPriority) {
    sorted.sort((a, b) => {
      if (options.memberPriority) {
        const rankType = t => t === 'member' ? 0 : 1
        const typeDiff = rankType(a.player_type) - rankType(b.player_type)
        if (typeDiff !== 0) return typeDiff
      }
      return parseRank(b.ranking) - parseRank(a.ranking)
    })
  }

  // Mixed Priority: tier by rank, shuffle within tiers
  if (options.mixedPriority) {
    sorted = mixedPrioritySort(sorted, activeCourts.length)
  }

  // Rotation Priority: players who sat out come first
  if (options.rotationPriority) {
    sorted = rotationPrioritySort(sorted, sittingOutCounts)
  }

  // Take only as many players as fit
  let selected = sorted.slice(0, slots)

  // Gender options: single-gender courts, mixed doubles teams, or ignore gender
  if (options.genderPriority) {
    selected = genderGroup(selected, activeCourts.length)
  } else if (options.mixedDoubles) {
    selected = mixedDoublesGroup(selected, activeCourts.length)
  }

  // Social Priority: rearrange to minimize repeat court-sharings
  if (options.socialPriority && priorRounds.length > 0) {
    selected = socialPriorityArrange(selected, activeCourts.length, priorRounds)
  }

  return activeCourts.map((courtNum, i) =>
    makeCourt(courtNum, selected.slice(i * 4, i * 4 + 4))
  )
}

function mixedPrioritySort(pool, numCourts) {
  // Sort by rank descending, then divide into tiers, shuffle within each tier
  const byRank = [...pool].sort((a, b) => parseRank(b.ranking) - parseRank(a.ranking))
  const slots = numCourts * 4

  // Tier boundaries: top 3 courts, mid 3 courts, bottom 2 courts (scaled to numCourts)
  const topCourts = Math.min(3, Math.ceil(numCourts * 0.375))
  const botCourts = Math.min(2, Math.floor(numCourts * 0.25))
  const midCourts = numCourts - topCourts - botCourts

  const topSlots = topCourts * 4
  const midSlots = midCourts * 4
  const botSlots = botCourts * 4

  const top = shuffle(byRank.slice(0, topSlots))
  const mid = shuffle(byRank.slice(topSlots, topSlots + midSlots))
  const bot = shuffle(byRank.slice(topSlots + midSlots, topSlots + midSlots + botSlots))

  return [...top, ...mid, ...bot].slice(0, slots)
}

function genderGroup(selected, numCourts) {
  // Separate by gender, fill courts with single-gender groups where possible
  const groups = {}
  for (const p of selected) {
    const g = p.gender || 'Other'
    if (!groups[g]) groups[g] = []
    groups[g].push(p)
  }
  const genders = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length)

  const result = []
  const used = new Set()

  // Fill courts 4 at a time, preferring same gender
  for (let i = 0; i < numCourts; i++) {
    const court = []
    // Try to fill from the largest gender group first
    for (const g of genders) {
      const avail = groups[g].filter(p => !used.has(p.id))
      for (const p of avail) {
        if (court.length < 4) { court.push(p); used.add(p.id) }
      }
      if (court.length >= 4) break
    }
    result.push(...court)
  }

  // Append any unused players (shouldn't happen but safety net)
  for (const p of selected) {
    if (!used.has(p.id)) result.push(p)
  }

  return result.slice(0, selected.length)
}

function mixedDoublesGroup(selected, numCourts) {
  // Arrange players so each team has one male and one female.
  // Output order per court: [M, F, M, F] → makeCourt yields team1=[M,F], team2=[M,F].
  // If genders are uneven, falls back to available players.
  const males = [...selected.filter(p => p.gender === 'M')]
  const females = [...selected.filter(p => p.gender === 'F')]
  const others = [...selected.filter(p => p.gender !== 'M' && p.gender !== 'F')]

  // Distribute non-binary/unknown into the smaller pool
  for (const p of others) {
    males.length <= females.length ? males.push(p) : females.push(p)
  }

  const result = []
  while (result.length < numCourts * 4 && (males.length > 0 || females.length > 0)) {
    result.push(males.length > 0 ? males.shift() : females.shift())   // team1[0]
    if (!males.length && !females.length) break
    result.push(females.length > 0 ? females.shift() : males.shift()) // team1[1]
    if (!males.length && !females.length) break
    result.push(males.length > 0 ? males.shift() : females.shift())   // team2[0]
    if (!males.length && !females.length) break
    result.push(females.length > 0 ? females.shift() : males.shift()) // team2[1]
  }

  return result
}

function socialPriorityArrange(selected, numCourts, priorRounds) {
  // Build co-play count: how many times each pair has shared a court
  const coPlay = {}
  function key(a, b) { return [a, b].sort().join('|') }

  for (const round of priorRounds) {
    for (const assignment of (round.assignments ?? [])) {
      const courtPlayers = assignment.players ?? []
      // courtPlayers contains player ID strings (not objects)
      for (let i = 0; i < courtPlayers.length; i++) {
        for (let j = i + 1; j < courtPlayers.length; j++) {
          const k = key(courtPlayers[i], courtPlayers[j])
          coPlay[k] = (coPlay[k] ?? 0) + 1
        }
      }
    }
  }

  function courtScore(group) {
    let score = 0
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        score += coPlay[key(group[i].id, group[j].id)] ?? 0
      }
    }
    return score
  }

  // Greedy: for each court slot, pick the player that minimizes score
  const remaining = [...selected]
  const result = []

  for (let c = 0; c < numCourts; c++) {
    const court = []
    for (let slot = 0; slot < 4 && remaining.length > 0; slot++) {
      // Find the player in remaining that minimizes total co-play with current court members
      let bestIdx = 0
      let bestScore = Infinity
      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i]
        const s = courtScore([...court, candidate])
        if (s < bestScore) { bestScore = s; bestIdx = i }
      }
      court.push(remaining.splice(bestIdx, 1)[0])
    }
    result.push(...court)
  }

  return result
}

function riverAssign(pool, activeCourts, priorRoundResult) {
  // Winners of court N move to court N-1; losers move to court N+1.
  // Court 1 winners stay; lowest court losers stay.
  // Former teammates are always split across teams at their new court.
  // Only include courts that have results — courts that were active but
  // never played leave a gap that would incorrectly shift the bottom boundary.
  const sortedCourts = [...activeCourts]
    .sort((a, b) => a - b)
    .filter(c => !!priorRoundResult[c])
  const numCourts = sortedCourts.length

  // newGroups[i] = array of [Player, Player] pairs (former teammates to be split)
  const newGroups = {}
  for (let i = 0; i < numCourts; i++) newGroups[i] = []

  for (let i = 0; i < numCourts; i++) {
    const courtNum = sortedCourts[i]
    const result = priorRoundResult[courtNum]
    if (!result) continue
    const { winners, losers } = result
    const winIdx = Math.max(0, i - 1)
    const loseIdx = Math.min(numCourts - 1, i + 1)
    newGroups[winIdx].push(winners)  // push as a pair — will be split across teams
    newGroups[loseIdx].push(losers)
  }

  return sortedCourts.map((courtNum, i) => {
    const groups = newGroups[i] // e.g. [[A, B], [C, D]]
    // First player of each pair → team1, second → team2 (splits former teammates)
    const team1 = groups.map(g => g[0]).filter(Boolean).slice(0, 2)
    const team2 = groups.map(g => g[1]).filter(Boolean).slice(0, 2)
    return { court_number: courtNum, team1, team2 }
  })
}
