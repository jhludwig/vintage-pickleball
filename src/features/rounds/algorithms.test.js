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

  it('uses snake-draft team assignment: 1st & 4th vs 2nd & 3rd', () => {
    // Ranked order: p1(4.5) > p2(4.0) > p3(3.5) > p4(3.0)
    const players = [
      makePlayer('p1', 'P1', 'member', '4.5'),
      makePlayer('p2', 'P2', 'member', '4.0'),
      makePlayer('p3', 'P3', 'member', '3.5'),
      makePlayer('p4', 'P4', 'member', '3.0'),
    ]
    const result = suggest({ participants: players, activeCourts: [1], options: { rankPriority: true } })
    const court = result[0]
    const team1Ids = court.team1.map(p => p.id).sort()
    const team2Ids = court.team2.map(p => p.id).sort()
    expect(team1Ids).toEqual(['p1', 'p4'])
    expect(team2Ids).toEqual(['p2', 'p3'])
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

describe('suggest — gender priority', () => {
  it('groups same-gender players on the same court when pools are clean', () => {
    const males = Array.from({ length: 4 }, (_, i) => makePlayer(`m${i}`, `M${i}`, 'member', '3.5', 'M'))
    const females = Array.from({ length: 4 }, (_, i) => makePlayer(`f${i}`, `F${i}`, 'member', '3.5', 'F'))
    const result = suggest({
      participants: [...males, ...females],
      activeCourts: [1, 2],
      options: { genderPriority: true },
    })
    // Each court should have all-male or all-female
    result.forEach(court => {
      const courtPlayers = [...court.team1, ...court.team2]
      const genders = new Set(courtPlayers.map(p => p.gender))
      expect(genders.size).toBe(1)
    })
  })

  it('respects gender priority when combined with random mode', () => {
    const males = Array.from({ length: 12 }, (_, i) => makePlayer(`m${i}`, `M${i}`, 'member', '3.5', 'M'))
    const females = Array.from({ length: 12 }, (_, i) => makePlayer(`f${i}`, `F${i}`, 'member', '3.5', 'F'))
    const result = suggest({
      participants: [...males, ...females],
      activeCourts: [1, 2, 3, 4, 5, 6],
      options: { randomMode: true, genderPriority: true },
    })
    result.forEach(court => {
      const courtPlayers = [...court.team1, ...court.team2]
      const genders = new Set(courtPlayers.map(p => p.gender))
      expect(genders.size).toBe(1)
    })
  })
})

describe('suggest — social priority', () => {
  it('avoids pairing players who played together in a prior round', () => {
    // 8 players: prior round had p0+p1+p2+p3 on court 1, p4+p5+p6+p7 on court 2
    const players = Array.from({ length: 8 }, (_, i) => makePlayer(`p${i}`, `P${i}`, 'member', '3.5'))
    const priorRounds = [
      {
        assignments: [
          { court_number: 1, players: ['p0', 'p1', 'p2', 'p3'] },
          { court_number: 2, players: ['p4', 'p5', 'p6', 'p7'] },
        ],
      },
    ]
    const result = suggest({
      participants: players,
      activeCourts: [1, 2],
      options: { socialPriority: true },
      priorRounds,
    })
    // Each court should mix players from different prior groups
    result.forEach(court => {
      const courtIds = [...court.team1, ...court.team2].map(p => p.id)
      const fromGroup1 = courtIds.filter(id => ['p0','p1','p2','p3'].includes(id))
      const fromGroup2 = courtIds.filter(id => ['p4','p5','p6','p7'].includes(id))
      // Both groups should be represented on each court (no purely same-group court)
      expect(fromGroup1.length).toBeGreaterThan(0)
      expect(fromGroup2.length).toBeGreaterThan(0)
    })
  })
})

describe('suggest — mixed doubles', () => {
  it('places one male and one female on each team', () => {
    const males = Array.from({ length: 4 }, (_, i) => makePlayer(`m${i}`, `M${i}`, 'member', '3.5', 'M'))
    const females = Array.from({ length: 4 }, (_, i) => makePlayer(`f${i}`, `F${i}`, 'member', '3.5', 'F'))
    const result = suggest({
      participants: [...males, ...females],
      activeCourts: [1, 2],
      options: { mixedDoubles: true },
    })
    result.forEach(court => {
      expect(court.team1.map(p => p.gender).sort()).toEqual(['F', 'M'])
      expect(court.team2.map(p => p.gender).sort()).toEqual(['F', 'M'])
    })
  })
})

describe('suggest — rotationPriority', () => {
  it('assigns sitters before non-sitters even when sitters appear last in input', () => {
    // Sitters are at the END of participants — without rotation they'd be cut off
    const fresh1 = makePlayer('f1', 'Fresh1', 'member', '3.5')
    const fresh2 = makePlayer('f2', 'Fresh2', 'member', '3.5')
    const extra1 = makePlayer('e1', 'Extra1', 'member', '3.5')
    const extra2 = makePlayer('e2', 'Extra2', 'member', '3.5')
    const sitter1 = makePlayer('s1', 'Sitter1', 'member', '3.5')
    const sitter2 = makePlayer('s2', 'Sitter2', 'member', '3.5')

    // 6 players, 4 slots — without rotation, s1/s2 at the end would be cut
    const sittingOutCounts = { s1: 1, s2: 1 }
    const result = suggest({
      participants: [fresh1, fresh2, extra1, extra2, sitter1, sitter2],
      activeCourts: [1],
      options: { rotationPriority: true },
      sittingOutCounts,
    })
    const assigned = allPlayers(result).map(p => p.id)
    expect(assigned).toContain('s1')
    expect(assigned).toContain('s2')
  })

  it('prioritizes player with higher sit-out count', () => {
    // sitterA (2 rounds) and sitterB (1 round) sit out; 3 fresh players
    // 5 players, 4 slots — sitterA must appear; sitterB likely appears too
    // Place sitters at end to ensure the sort is doing the work
    const fresh0 = makePlayer('f0', 'F0', 'member', '3.5')
    const fresh1 = makePlayer('f1', 'F1', 'member', '3.5')
    const fresh2 = makePlayer('f2', 'F2', 'member', '3.5')
    const sitterA = makePlayer('a', 'A', 'member', '3.5')
    const sitterB = makePlayer('b', 'B', 'member', '3.5')

    const sittingOutCounts = { a: 2, b: 1 }
    const result = suggest({
      participants: [fresh0, fresh1, fresh2, sitterA, sitterB],
      activeCourts: [1],
      options: { rotationPriority: true },
      sittingOutCounts,
    })
    const assigned = allPlayers(result).map(p => p.id)
    // Both sitters must be assigned (only 5 players, 4 slots, 2 sitters → both fit)
    expect(assigned).toContain('a')
    expect(assigned).toContain('b')
    // The one excluded player must be a fresh player, not a sitter
    const excluded = ['f0', 'f1', 'f2', 'a', 'b'].filter(id => !assigned.includes(id))
    expect(excluded).toHaveLength(1)
    expect(['f0', 'f1', 'f2']).toContain(excluded[0])
  })

  it('has no effect when sittingOutCounts is empty', () => {
    const players = Array.from({ length: 4 }, (_, i) => makePlayer(`p${i}`, `P${i}`, 'member', '3.5'))
    const result = suggest({
      participants: players,
      activeCourts: [1],
      options: { rotationPriority: true },
      sittingOutCounts: {},
    })
    expect(allPlayers(result)).toHaveLength(4)
  })

  it('works with randomMode: sitters at end of shuffle still get assigned', () => {
    // 6 players, 4 slots, sitters would be at worst position if not for rotation
    const fresh = Array.from({ length: 4 }, (_, i) => makePlayer(`f${i}`, `F${i}`, 'member', '3.5'))
    const sitter1 = makePlayer('s1', 'S1', 'member', '3.5')
    const sitter2 = makePlayer('s2', 'S2', 'member', '3.5')
    const sittingOutCounts = { s1: 1, s2: 1 }

    // Run 10 times to account for shuffle randomness — sitters must always appear
    for (let i = 0; i < 10; i++) {
      const result = suggest({
        participants: [...fresh, sitter1, sitter2],
        activeCourts: [1],
        options: { rotationPriority: true, randomMode: true },
        sittingOutCounts,
      })
      const assigned = allPlayers(result).map(p => p.id)
      expect(assigned).toContain('s1')
      expect(assigned).toContain('s2')
    }
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

  it('splits former teammates across teams', () => {
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
    const court1 = result.find(c => c.court_number === 1)
    const court2 = result.find(c => c.court_number === 2)
    const c1t1 = court1.team1.map(p => p.id)
    const c1t2 = court1.team2.map(p => p.id)
    // c1w1 & c1w2 were teammates — must not both be on the same team
    expect(c1t1.includes('c1w1') && c1t1.includes('c1w2')).toBe(false)
    expect(c1t2.includes('c1w1') && c1t2.includes('c1w2')).toBe(false)
    // c2w1 & c2w2 were teammates — must not both be on the same team
    expect(c1t1.includes('c2w1') && c1t1.includes('c2w2')).toBe(false)
    expect(c1t2.includes('c2w1') && c1t2.includes('c2w2')).toBe(false)
    const c2t1 = court2.team1.map(p => p.id)
    const c2t2 = court2.team2.map(p => p.id)
    expect(c2t1.includes('c1l1') && c2t1.includes('c1l2')).toBe(false)
    expect(c2t2.includes('c1l1') && c2t2.includes('c1l2')).toBe(false)
    expect(c2t1.includes('c2l1') && c2t1.includes('c2l2')).toBe(false)
    expect(c2t2.includes('c2l1') && c2t2.includes('c2l2')).toBe(false)
  })
})
