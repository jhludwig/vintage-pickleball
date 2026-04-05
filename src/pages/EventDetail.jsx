import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { fullName } from '../lib/playerName'
import Spinner from '../components/Spinner'

function roundStatus(round) {
  if (!round.is_committed) return { label: 'Draft', className: 'bg-stone-100 text-stone-400' }
  if (round.hasResults) return { label: 'Results recorded', className: 'bg-emerald-50 text-emerald-600' }
  return { label: 'Committed', className: 'bg-blue-50 text-blue-500' }
}

export default function EventDetail() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const session = useAuth()
  const [event, setEvent] = useState(null)
  const [rounds, setRounds] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [{ data: ev, error: evError }, { data: rds, error: rdsError }] = await Promise.all([
      supabase.from('events').select('*').eq('id', eventId).single(),
      supabase.from('rounds').select('*').eq('event_id', eventId).order('round_number'),
    ])
    if (evError) { console.error('Failed to load event:', evError) }
    if (rdsError) { console.error('Failed to load rounds:', rdsError) }

    const roundIds = (rds ?? []).map(r => r.id)
    let resultRoundIds = new Set()
    let computedStats = null

    if (roundIds.length > 0) {
      const [
        { data: results },
        { data: participants },
        { data: allResults },
        { data: allAssignments },
      ] = await Promise.all([
        supabase.from('court_results').select('round_id').in('round_id', roundIds),
        supabase.from('round_participants').select('player_id, players(id, first_name, last_name, player_type)').in('round_id', roundIds),
        supabase.from('court_results').select('round_id, court_number, winning_team').in('round_id', roundIds),
        supabase.from('court_assignments').select('round_id, court_number, player_id, team, players(id, first_name, last_name)').in('round_id', roundIds),
      ])

      resultRoundIds = new Set((results ?? []).map(r => r.round_id))

      // Unique players and guests across all rounds
      const seenPlayers = new Map() // player_id -> player object
      for (const row of (participants ?? [])) {
        if (row.players && !seenPlayers.has(row.player_id)) {
          seenPlayers.set(row.player_id, row.players)
        }
      }
      const totalPlayers = seenPlayers.size
      const totalGuests = [...seenPlayers.values()].filter(p => p.player_type === 'guest').length

      // Win counts per player
      const winCounts = {}
      for (const result of (allResults ?? [])) {
        const courtPlayers = (allAssignments ?? []).filter(
          a => a.round_id === result.round_id && a.court_number === result.court_number && a.team === result.winning_team
        )
        for (const a of courtPlayers) {
          if (a.players) {
            winCounts[a.player_id] = (winCounts[a.player_id] ?? 0) + 1
          }
        }
      }
      const maxWins = Math.max(0, ...Object.values(winCounts))
      const topWinners = maxWins > 0
        ? Object.entries(winCounts)
            .filter(([, count]) => count === maxWins)
            .map(([pid]) => {
              const asn = (allAssignments ?? []).find(a => a.player_id === pid && a.players)
              return asn ? { ...asn.players, wins: maxWins } : null
            })
            .filter(Boolean)
        : []

      computedStats = { totalPlayers, totalGuests, topWinners, maxWins }
    }

    setEvent(ev)
    setRounds((rds ?? []).map(r => ({ ...r, hasResults: resultRoundIds.has(r.id) })))
    setStats(computedStats)
    setLoading(false)
  }, [eventId])

  useEffect(() => { load() }, [load])

  async function addRound() {
    const nextNum = rounds.length > 0 ? Math.max(...rounds.map(r => r.round_number)) + 1 : 1
    const { data: round, error } = await supabase
      .from('rounds')
      .insert({ event_id: eventId, round_number: nextNum })
      .select()
      .single()
    if (error) { alert(`Failed to add round: ${error.message}`); return }
    const { error: courtsError } = await supabase.from('active_courts').insert(
      Array.from({ length: 8 }, (_, i) => ({ round_id: round.id, court_number: i + 1, is_active: true }))
    )
    if (courtsError) { console.error('Failed to create courts:', courtsError) }

    // Copy participants from the most recent prior round
    if (rounds.length > 0) {
      const prevRound = rounds.reduce((a, b) => a.round_number > b.round_number ? a : b)
      const { data: prevParticipants } = await supabase
        .from('round_participants')
        .select('player_id')
        .eq('round_id', prevRound.id)
      if (prevParticipants && prevParticipants.length > 0) {
        await supabase.from('round_participants').insert(
          prevParticipants.map(p => ({ round_id: round.id, player_id: p.player_id }))
        )
      }
    }

    load()
  }

  async function deleteRound(e, id) {
    e.stopPropagation()
    if (!confirm('Delete this round?')) return
    const { error } = await supabase.from('rounds').delete().eq('id', id)
    if (error) { alert(`Failed to delete: ${error.message}`); return }
    load()
  }

  if (loading) return <Spinner />
  if (!event) return <div className="p-4 text-stone-500">Event not found</div>

  return (
    <div className="max-w-lg mx-auto">
      <div className="px-4 pt-4 pb-3">
        <button onClick={() => navigate('/events')} className="text-sm text-emerald-600 hover:text-emerald-700 mb-2 inline-flex items-center gap-1">
          ← Events
        </button>
        <h2 className="text-xl font-bold text-stone-800">{event.name}</h2>
        <p className="text-sm text-stone-400">{event.date}</p>
      </div>

      {stats && rounds.length > 0 && (
        <div className="px-4 pb-3">
          <div className="bg-white border border-stone-200 rounded-xl shadow-sm p-4 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-stone-800">{rounds.length}</div>
              <div className="text-xs text-stone-400 mt-0.5">Rounds</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-stone-800">{stats.totalPlayers}</div>
              <div className="text-xs text-stone-400 mt-0.5">Players</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-stone-800">{stats.totalGuests}</div>
              <div className="text-xs text-stone-400 mt-0.5">Guests</div>
            </div>
          </div>
          {stats.topWinners.length > 0 && (
            <div className="mt-3 bg-white border border-stone-200 rounded-xl shadow-sm p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-2">
                Most Wins ({stats.maxWins})
              </div>
              <div className="flex flex-wrap gap-2">
                {stats.topWinners.map(p => (
                  <span key={p.id} className="text-sm px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 font-medium">
                    {fullName(p)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="px-4 pb-4">
        {session && (
          <button
            onClick={addRound}
            className="mb-3 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            + Add Round
          </button>
        )}
        <ul className="divide-y divide-stone-100 bg-white rounded-xl shadow-sm overflow-hidden border border-stone-200">
          {rounds.map(r => {
            const status = roundStatus(r)
            return (
              <li
                key={r.id}
                onClick={() => navigate(`/events/${eventId}/rounds/${r.id}`)}
                className="flex items-center justify-between px-4 py-3.5 hover:bg-stone-50 cursor-pointer transition-colors"
              >
                <div>
                  <div className="font-semibold text-stone-800">Round {r.round_number}</div>
                  <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${status.className}`}>
                    {status.label}
                  </span>
                </div>
                {session && (
                  <button
                    onClick={e => deleteRound(e, r.id)}
                    className="text-stone-300 hover:text-red-500 text-sm px-2 transition-colors"
                  >
                    ✕
                  </button>
                )}
              </li>
            )
          })}
          {rounds.length === 0 && (
            <li className="px-4 py-10 text-center text-stone-400 text-sm">No rounds yet</li>
          )}
        </ul>
      </div>
    </div>
  )
}
