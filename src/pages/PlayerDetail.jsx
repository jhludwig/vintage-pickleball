import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useRankings } from '../hooks/useRankings'
import { fullName } from '../lib/playerName'
import { currentSeasonRange } from '../lib/season'
import PlayerModal from '../features/players/PlayerModal'
import Spinner from '../components/Spinner'

export default function PlayerDetail() {
  const { playerId } = useParams()
  const navigate = useNavigate()
  const session = useAuth()
  const { showRankings } = useRankings()
  const [player, setPlayer] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)

  const season = currentSeasonRange()

  const load = useCallback(async () => {
    try {
      const [
        { data: playerData, error: playerError },
        { data: participations, error: partError },
        { data: assignments, error: asnError },
      ] = await Promise.all([
        supabase.from('players').select('*').eq('id', playerId).single(),
        supabase
          .from('round_participants')
          .select('round_id, rounds(event_id, events(date))')
          .eq('player_id', playerId),
        supabase
          .from('court_assignments')
          .select('round_id, court_number, team, rounds(event_id, events(date))')
          .eq('player_id', playerId),
      ])
      if (playerError) console.error('Failed to load player:', playerError)
      if (partError) console.error('Failed to load participations:', partError)
      if (asnError) console.error('Failed to load assignments:', asnError)

      const inSeason = date => date >= season.start && date <= season.end

      const seasonParticipations = (participations ?? []).filter(
        p => p.rounds?.events?.date && inSeason(p.rounds.events.date)
      )
      const seasonAssignments = (assignments ?? []).filter(
        a => a.rounds?.events?.date && inSeason(a.rounds.events.date)
      )

      const eventsAttended = new Set(seasonParticipations.map(p => p.rounds.event_id)).size
      const gamesPlayed = seasonAssignments.length

      let wins = 0
      if (seasonAssignments.length > 0) {
        const roundIds = [...new Set(seasonAssignments.map(a => a.round_id))]
        const { data: results } = await supabase
          .from('court_results')
          .select('round_id, court_number, winning_team')
          .in('round_id', roundIds)

        const resultMap = {}
        for (const r of (results ?? [])) {
          resultMap[`${r.round_id}:${r.court_number}`] = r.winning_team
        }

        wins = seasonAssignments.filter(a =>
          resultMap[`${a.round_id}:${a.court_number}`] === a.team
        ).length
      }

      const winRate = gamesPlayed > 0 ? `${Math.round((wins / gamesPlayed) * 100)}%` : '—'

      setPlayer(playerData)
      setStats({ eventsAttended, gamesPlayed, wins, winRate })
    } finally {
      setLoading(false)
    }
  }, [playerId, season.start, season.end])

  useEffect(() => { load() }, [load])

  async function handleSave(form) {
    const { id, created_at, ...fields } = form
    const { error } = await supabase.from('players').update(fields).eq('id', id)
    if (error) { alert(`Failed to save: ${error.message}`); return }
    setShowEdit(false)
    load()
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('players').delete().eq('id', id)
    if (error) { alert(`Failed to delete: ${error.message}`); return }
    navigate('/players')
  }

  if (loading) return <Spinner />
  if (!player) return <div className="p-4 text-stone-500">Player not found</div>

  return (
    <div className="max-w-lg mx-auto">
      <div className="px-4 pt-4 pb-3">
        <button
          onClick={() => navigate('/players')}
          className="text-sm text-emerald-600 hover:text-emerald-700 mb-2 inline-flex items-center gap-1"
        >
          ← Players
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-stone-800">{fullName(player)}</h2>
            <p className="text-sm text-stone-400 mt-0.5 capitalize">
              {player.player_type}{showRankings && player.ranking ? ` · ${player.ranking}` : ''}
            </p>
          </div>
          {session && (
            <button
              onClick={() => setShowEdit(true)}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium mt-1"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-2">
          {season.label}
        </div>
        <div className="bg-white border border-stone-200 rounded-xl shadow-sm p-4 grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-stone-800">{stats.eventsAttended}</div>
            <div className="text-xs text-stone-400 mt-0.5">Events</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-stone-800">{stats.gamesPlayed}</div>
            <div className="text-xs text-stone-400 mt-0.5">Games</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-stone-800">{stats.wins}</div>
            <div className="text-xs text-stone-400 mt-0.5">Wins</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-stone-800">{stats.winRate}</div>
            <div className="text-xs text-stone-400 mt-0.5">Win Rate</div>
          </div>
        </div>
      </div>

      {showEdit && (
        <PlayerModal
          player={player}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  )
}
