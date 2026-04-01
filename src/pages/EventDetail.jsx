import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Spinner from '../components/Spinner'

function roundStatus(round) {
  if (!round.is_committed) return { label: 'Draft', color: 'text-gray-400' }
  if (round.hasResults) return { label: 'Results recorded', color: 'text-green-600' }
  return { label: 'Committed', color: 'text-blue-500' }
}

export default function EventDetail() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const session = useAuth()
  const [event, setEvent] = useState(null)
  const [rounds, setRounds] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [{ data: ev }, { data: rds }, { data: results }] = await Promise.all([
      supabase.from('events').select('*').eq('id', eventId).single(),
      supabase.from('rounds').select('*').eq('event_id', eventId).order('round_number'),
      supabase.from('court_results').select('round_id'),
    ])
    const resultRoundIds = new Set((results ?? []).map(r => r.round_id))
    setEvent(ev)
    setRounds((rds ?? []).map(r => ({ ...r, hasResults: resultRoundIds.has(r.id) })))
    setLoading(false)
  }, [eventId])

  useEffect(() => { load() }, [load])

  async function addRound() {
    const nextNum = rounds.length + 1
    const { data: round, error } = await supabase
      .from('rounds')
      .insert({ event_id: eventId, round_number: nextNum })
      .select()
      .single()
    if (error) { alert(`Failed to add round: ${error.message}`); return }
    // Create 8 inactive court rows
    const { error: courtsError } = await supabase.from('active_courts').insert(
      Array.from({ length: 8 }, (_, i) => ({ round_id: round.id, court_number: i + 1, is_active: false }))
    )
    if (courtsError) { console.error('Failed to create courts:', courtsError) }
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
  if (!event) return <div className="p-4 text-gray-500">Event not found</div>

  return (
    <div>
      <div className="px-4 py-3 border-b">
        <button onClick={() => navigate('/events')} className="text-sm text-blue-500 mb-1">← Events</button>
        <h2 className="text-lg font-bold">{event.name}</h2>
        <p className="text-sm text-gray-500">{event.date}</p>
      </div>

      <div className="p-4">
        {session && (
          <button
            onClick={addRound}
            className="mb-4 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + Add Round
          </button>
        )}
        <ul className="divide-y divide-gray-100 border rounded-lg overflow-hidden">
          {rounds.map(r => {
            const status = roundStatus(r)
            return (
              <li
                key={r.id}
                onClick={() => navigate(`/events/${eventId}/rounds/${r.id}`)}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer"
              >
                <div>
                  <div className="font-medium">Round {r.round_number}</div>
                  <div className={`text-xs ${status.color}`}>{status.label}</div>
                </div>
                {session && (
                  <button
                    onClick={e => deleteRound(e, r.id)}
                    className="text-red-400 hover:text-red-600 text-sm px-2"
                  >
                    Delete
                  </button>
                )}
              </li>
            )
          })}
          {rounds.length === 0 && (
            <li className="px-4 py-8 text-center text-gray-400 text-sm">No rounds yet</li>
          )}
        </ul>
      </div>
    </div>
  )
}
