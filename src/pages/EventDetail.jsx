import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
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
    if (roundIds.length > 0) {
      const { data: results, error: resError } = await supabase
        .from('court_results')
        .select('round_id')
        .in('round_id', roundIds)
      if (resError) { console.error('Failed to load results:', resError) }
      resultRoundIds = new Set((results ?? []).map(r => r.round_id))
    }

    setEvent(ev)
    setRounds((rds ?? []).map(r => ({ ...r, hasResults: resultRoundIds.has(r.id) })))
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
