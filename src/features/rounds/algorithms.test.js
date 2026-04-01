import { describe, it, expect } from 'vitest'
import { parseRank, suggest } from './algorithms'

// Helpers
function makePlayer(id, name, player_type, ranking, gender = 'M') {
  return { id, name, player_type, ranking, gender, plays_pickleball: true }
}

function allPlayers(assignments) {
  return assignments.flatMap(c => [...c.team1, ...c.team2])
}

describe('parseRank', () => {
  it('parses DUPR float strings', () => {
    expect(parseRank('3.5')).toBe(3.5)
    expect(parseRank('4.0')).toBe(4.0)
    expect(parseRank('2.75')).toBe(2.75)
  })
  it('returns -1 for non-numeric rankings', () => {
    expect(parseRank('')).toBe(-1)
    expect(parseRank('abc')).toBe(-1)
    expect(parseRank('N/A')).toBe(-1)
  })
})

describe('suggest — base behavior', () => {
  it('assigns 4 players per active court', () => {
    const players = Array.from({ length: 8 }, (_, i) => makePlayer(`p${i}`, `P${i}`, 'member', '3.5'))
    const result = suggest({ participants: players, activeCourts: [1, 2], options: {} })
    expect(result).toHaveLength(2)
    result.forEach(c => expect(c.team1.length + c.team2.length).toBe(4))
  })

  it('uses correct court numbers', () => {
    const players = Array.from({ length: 4 }, (_, i) => makePlayer(`p${i}`, `P${i}`, 'member', '3.5'))
    const result = suggest({ participants: players, activeCourts: [3], options: {} })
    expect(result[0].court_number).toBe(3)
  })

  it('excludes pros from algorithm', () => {
    const pro = makePlayer('pro1', 'Pro', 'pro', '5.0')
    const members = Array.from({ length: 4 }, (_, i) => makePlayer(`p${i}`, `P${i}`, 'member', '3.5'))
    const result = suggest({ participants: [pro, ...members], activeCourts: [1], options: {} })
    const assigned = allPlayers(result)
    expect(assigned.find(p => p.id === 'pro1')).toBeUndefined()
  })

  it('does not assign more players than court slots', () => {
    const players = Array.from({ length: 12 }, (_, i) => makePlayer(`p${i}`, `P${i}`, 'member', '3.5'))
    const result = suggest({ participants: players, activeCourts: [1, 2], options: {} }) // 8 slots
    expect(allPlayers(result)).toHaveLength(8)
  })
})

describe('suggest — rank priority', () => {
  it('assigns highest-ranked players to court 1', () => {
    const players = [
      makePlayer('p1', 'P1', 'member', '2.0'),
      makePlayer('p2', 'P2', 'member', '4.5'),
      makePlayer('p3', 'P3', 'member', '3.0'),
      makePlayer('p4', 'P4', 'member', '4.0'),
      makePlayer('p5', 'P5', 'member', '3.5'),
      makePlayer('p6', 'P6', 'member', '2.5'),
      makePlayer('p7', 'P7', 'member', '2.9'),
      makePlayer('p8', 'P8', 'member', '1.5'),
    ]
    const result = suggest({ participants: players, activeCourts: [1, 2], options: { rankPriority: true } })
    const court1 = allPlayers(result.filter(c => c.court_number === 1))
    const court1Ranks = court1.map(p => parseRank(p.ranking))
    const court2 = allPlayers(result.filter(c => c.court_number === 2))
    const court2Ranks = court2.map(p => parseRank(p.ranking))
    expect(Math.min(...court1Ranks)).toBeGreaterThan(Math.max(...court2Ranks))
  })
})

describe('suggest — member priority', () => {
  it('fills courts with members before guests', () => {
    const members = Array.from({ length: 6 }, (_, i) => makePlayer(`m${i}`, `M${i}`, 'member', '3.5'))
    const guests = Array.from({ length: 4 }, (_, i) => makePlayer(`g${i}`, `G${i}`, 'guest', '3.5'))
    const result = suggest({
      participants: [...guests, ...members], // guests listed first to prove ordering works
      activeCourts: [1, 2], // 8 slots
      options: { memberPriority: true },
    })
    const assigned = allPlayers(result)
    const assignedMembers = assigned.filter(p => p.player_type === 'member')
    const assignedGuests = assigned.filter(p => p.player_type === 'guest')
    expect(assignedMembers).toHaveLength(6)
    expect(assignedGuests).toHaveLength(2) // only 2 slots left
  })
})

describe('suggest — mixed priority', () => {
  it('keeps top-ranked players on lower-numbered courts', () => {
    // 12 players across 3 courts, top players should be on courts 1-3 top tier
    const players = Array.from({ length: 12 }, (_, i) =>
      makePlayer(`p${i}`, `P${i}`, 'member', String(5 - i * 0.25))
    )
    const result = suggest({ participants: players, activeCourts: [1, 2, 3], options: { mixedPriority: true } })
    const court1Players = allPlayers(result.filter(c => c.court_number === 1))
    const court3Players = allPlayers(result.filter(c => c.court_number === 3))
    const court1AvgRank = court1Players.reduce((s, p) => s + parseRank(p.ranking), 0) / court1Players.length
    const court3AvgRank = court3Players.reduce((s, p) => s + parseRank(p.ranking), 0) / court3Players.length
    expect(court1AvgRank).toBeGreaterThan(court3AvgRank)
  })
})

describe('suggest — river mode', () => {
  it('keeps court 1 winners on court 1', () => {
    const w1 = makePlayer('w1', 'W1', 'member', '4.5')
    const w2 = makePlayer('w2', 'W2', 'member', '4.0')
    const l1 = makePlayer('l1', 'L1', 'member', '3.5')
    const l2 = makePlayer('l2', 'L2', 'member', '3.0')
    const priorRoundResult = {
      1: { winners: [w1, w2], losers: [l1, l2] },
    }
    const result = suggest({
      participants: [w1, w2, l1, l2],
      activeCourts: [1],
      options: { riverMode: true },
      priorRoundResult,
    })
    const court1 = allPlayers(result.filter(c => c.court_number === 1))
    expect(court1.map(p => p.id).sort()).toEqual(['w1', 'w2', 'l1', 'l2'].sort())
  })

  it('moves winners up and losers down across courts', () => {
    const c1w1 = makePlayer('c1w1', 'C1W1', 'member', '4.5')
    const c1w2 = makePlayer('c1w2', 'C1W2', 'member', '4.0')
    const c1l1 = makePlayer('c1l1', 'C1L1', 'member', '3.5')
    const c1l2 = makePlayer('c1l2', 'C1L2', 'member', '3.0')
    const c2w1 = makePlayer('c2w1', 'C2W1', 'member', '3.0')
    const c2w2 = makePlayer('c2w2', 'C2W2', 'member', '2.5')
    const c2l1 = makePlayer('c2l1', 'C2L1', 'member', '2.0')
    const c2l2 = makePlayer('c2l2', 'C2L2', 'member', '1.5')
    const priorRoundResult = {
      1: { winners: [c1w1, c1w2], losers: [c1l1, c1l2] },
      2: { winners: [c2w1, c2w2], losers: [c2l1, c2l2] },
    }
    const result = suggest({
      participants: [c1w1, c1w2, c1l1, c1l2, c2w1, c2w2, c2l1, c2l2],
      activeCourts: [1, 2],
      options: { riverMode: true },
      priorRoundResult,
    })
    // Court 1 winners stay on court 1, court 2 winners move to court 1
    const court1Ids = allPlayers(result.filter(c => c.court_number === 1)).map(p => p.id).sort()
    expect(court1Ids).toEqual(['c1w1', 'c1w2', 'c2w1', 'c2w2'].sort())
    // Court 1 losers move to court 2, court 2 losers stay on court 2
    const court2Ids = allPlayers(result.filter(c => c.court_number === 2)).map(p => p.id).sort()
    expect(court2Ids).toEqual(['c1l1', 'c1l2', 'c2l1', 'c2l2'].sort())
  })
})
