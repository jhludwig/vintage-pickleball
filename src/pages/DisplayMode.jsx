import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fullName } from '../lib/playerName'

export default function DisplayMode() {
  const { eventId, roundId } = useParams()
  const [data, setData] = useState(null)

  async function load() {
    const [
      { data: rd },
      { data: ev },
      { data: assignments },
      { data: results },
    ] = await Promise.all([
      supabase.from('rounds').select('*').eq('id', roundId).single(),
      supabase.from('events').select('*').eq('id', eventId).single(),
      supabase.from('court_assignments').select('*, players(*)').eq('round_id', roundId),
      supabase.from('court_results').select('*').eq('round_id', roundId),
    ])

    const courts = []
    for (let i = 1; i <= 8; i++) {
      const courtPlayers = (assignments ?? []).filter(a => a.court_number === i)
      if (courtPlayers.length > 0) {
        courts.push({
          court_number: i,
          team1: courtPlayers.filter(a => a.team === 1).map(a => a.players),
          team2: courtPlayers.filter(a => a.team === 2).map(a => a.players),
        })
      }
    }

    setData({ round: rd, event: ev, courts, results: results ?? [] })
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [roundId, eventId])

  if (!data) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center">
        <div className="text-stone-400 text-lg">Loading...</div>
      </div>
    )
  }

  const { round, event, courts, results } = data

  function getWinner(courtNumber) {
    return results.find(r => r.court_number === courtNumber)?.winning_team ?? null
  }

  const gridClass = courts.length <= 2
    ? 'grid-cols-2'
    : courts.length === 3
    ? 'grid-cols-3'
    : 'grid-cols-2 lg:grid-cols-4'

  return (
    <div className="min-h-screen bg-stone-900 text-white flex flex-col p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between px-2 shrink-0">
        <span className="text-lg font-bold text-stone-100">Vintage Club Pickleball</span>
        <span className="text-stone-300 text-sm">
          {event?.name} · Round {round?.round_number}
        </span>
        <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          LIVE
        </span>
      </div>

      {/* Court grid */}
      <div className={`grid gap-4 flex-1 ${gridClass}`}>
        {courts.map(court => {
          const winner = getWinner(court.court_number)
          return (
            <div key={court.court_number} className="bg-stone-800 rounded-xl overflow-hidden flex flex-col">
              <div className="bg-emerald-700 px-4 py-2">
                <span className="text-sm font-bold uppercase tracking-widest text-emerald-100">
                  Court {court.court_number}
                </span>
              </div>
              <div className="flex flex-col flex-1 divide-y divide-stone-700">
                {[1, 2].map(teamNum => {
                  const players = teamNum === 1 ? court.team1 : court.team2
                  const isWinner = winner === teamNum
                  return (
                    <div key={teamNum} className={`px-4 py-3 flex-1 ${isWinner ? 'bg-amber-900/30' : ''}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-stone-400 font-semibold uppercase tracking-wide">
                          Team {teamNum}
                        </span>
                        {isWinner && <span className="text-sm">🏆</span>}
                      </div>
                      {players.map(p => (
                        <div key={p.id} className="text-base text-stone-100 leading-snug">
                          {fullName(p)}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
