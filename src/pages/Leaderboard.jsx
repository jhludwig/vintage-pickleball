import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { currentSeasonRange } from '../lib/season'
import { fullName } from '../lib/playerName'
import Spinner from '../components/Spinner'

export default function Leaderboard() {
  const [rows, setRows] = useState(null)
  const [seasonLabel, setSeasonLabel] = useState('')
  const [threshold, setThreshold] = useState(1)

  useEffect(() => {
    async function load() {
      const { start, end, label } = currentSeasonRange()
      setSeasonLabel(label)

      try {
        const { data: events, error: evErr } = await supabase
          .from('events')
          .select('id')
          .gte('date', start)
          .lte('date', end)

        if (evErr) throw evErr

        const eventIds = (events ?? []).map(e => e.id)
        if (eventIds.length === 0) { setRows([]); return }

        const { data: rounds, error: rdErr } = await supabase
          .from('rounds')
          .select('id')
          .in('event_id', eventIds)
          .eq('is_committed', true)

        if (rdErr) throw rdErr

        const roundIds = (rounds ?? []).map(r => r.id)
        if (roundIds.length === 0) { setRows([]); return }

        const [{ data: assignments, error: asnErr }, { data: results, error: resErr }] = await Promise.all([
          supabase
            .from('court_assignments')
            .select('round_id, court_number, player_id, team, players(id, first_name, last_name, player_type)')
            .in('round_id', roundIds),
          supabase
            .from('court_results')
            .select('round_id, court_number, winning_team')
            .in('round_id', roundIds),
        ])

        if (asnErr) throw asnErr
        if (resErr) throw resErr

        // Compute games played and player map
        const gamesPlayed = {}
        const playerMap = {}

        for (const a of (assignments ?? [])) {
          if (!a.players) continue
          if (a.players.player_type === 'pro') continue
          gamesPlayed[a.player_id] = (gamesPlayed[a.player_id] ?? 0) + 1
          playerMap[a.player_id] = a.players
        }

        // Build a lookup for winning assignments: "roundId:courtNum:team" -> [playerIds]
        const winKey = (roundId, courtNumber, team) => `${roundId}:${courtNumber}:${team}`
        const winnersByKey = {}
        for (const a of (assignments ?? [])) {
          const k = winKey(a.round_id, a.court_number, a.team)
          if (!winnersByKey[k]) winnersByKey[k] = []
          winnersByKey[k].push(a.player_id)
        }

        // Compute wins
        const wins = {}
        for (const result of (results ?? [])) {
          const k = winKey(result.round_id, result.court_number, result.winning_team)
          for (const pid of (winnersByKey[k] ?? [])) {
            wins[pid] = (wins[pid] ?? 0) + 1
          }
        }

        // Median filter
        const gameCounts = Object.values(gamesPlayed).sort((a, b) => a - b)
        const median = gameCounts[Math.floor(gameCounts.length / 2)] ?? 1
        const minGames = Math.max(1, Math.floor(median / 2))
        setThreshold(minGames)

        // Build and sort rows
        const built = Object.keys(gamesPlayed)
          .filter(pid => gamesPlayed[pid] >= minGames)
          .map(pid => ({
            player: playerMap[pid],
            games: gamesPlayed[pid],
            wins: wins[pid] ?? 0,
            winRate: (wins[pid] ?? 0) / gamesPlayed[pid],
          }))
          .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins)

        setRows(built)
      } catch (err) {
        console.error('Failed to load leaderboard:', err)
        setRows([])
      }
    }

    load()
  }, [])

  const medals = ['🥇', '🥈', '🥉']

  if (rows === null) return <Spinner />

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-4">
      <h2 className="text-xl font-bold text-stone-800 mb-0.5">{seasonLabel} Leaderboard</h2>
      <p className="text-xs text-stone-400 mb-4">Min. {threshold} {threshold === 1 ? 'game' : 'games'} to qualify</p>

      {rows.length === 0 ? (
        <div className="text-center text-stone-400 py-12">No results yet for the current season.</div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 text-xs text-stone-400 uppercase tracking-wide">
                <th className="text-left px-4 py-2 w-8">#</th>
                <th className="text-left px-4 py-2">Player</th>
                <th className="text-right px-3 py-2">Games</th>
                <th className="text-right px-3 py-2">Wins</th>
                <th className="text-right px-4 py-2">Win%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((row, i) => (
                <tr key={row.player.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3 text-stone-400 text-xs">
                    {medals[i] ?? i + 1}
                  </td>
                  <td className="px-4 py-3 font-medium text-stone-800">
                    {fullName(row.player)}
                  </td>
                  <td className="px-3 py-3 text-right text-stone-500">{row.games}</td>
                  <td className="px-3 py-3 text-right text-emerald-600 font-semibold">{row.wins}</td>
                  <td className="px-4 py-3 text-right text-stone-700">
                    {Math.round(row.winRate * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
