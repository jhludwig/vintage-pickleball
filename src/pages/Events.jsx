import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import EventModal from '../features/events/EventModal'
import Spinner from '../components/Spinner'

export default function Events() {
  const session = useAuth()
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const loadEvents = useCallback(async () => {
    const { data, error } = await supabase.from('events').select('*').order('date', { ascending: false })
    if (error) { console.error('Failed to load events:', error) }
    setEvents(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadEvents() }, [loadEvents])

  async function handleSave(form) {
    const { error } = await supabase.from('events').insert(form)
    if (error) { alert(`Failed to save: ${error.message}`); return }
    setShowModal(false)
    loadEvents()
  }

  async function handleDelete(e, id) {
    e.stopPropagation()
    if (!confirm('Delete this event?')) return
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (error) { alert(`Failed to delete: ${error.message}`); return }
    loadEvents()
  }

  if (loading) return <Spinner />

  return (
    <div className="max-w-lg mx-auto">
      {session && (
        <div className="px-4 pt-4 flex justify-end">
          <button
            onClick={() => setShowModal(true)}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            + Add Event
          </button>
        </div>
      )}
      <ul className="divide-y divide-stone-100 mt-3 mx-4 bg-white rounded-xl shadow-sm overflow-hidden border border-stone-200">
        {events.map(ev => (
          <li
            key={ev.id}
            onClick={() => navigate(`/events/${ev.id}`)}
            className="flex items-center justify-between px-4 py-3.5 hover:bg-stone-50 cursor-pointer transition-colors"
          >
            <div>
              <div className="font-semibold text-stone-800">{ev.name}</div>
              <div className="text-sm text-stone-400 mt-0.5">{ev.date}</div>
            </div>
            {session && (
              <button
                onClick={e => handleDelete(e, ev.id)}
                className="text-stone-300 hover:text-red-500 text-sm px-2 transition-colors"
              >
                ✕
              </button>
            )}
          </li>
        ))}
        {events.length === 0 && (
          <li className="px-4 py-10 text-center text-stone-400 text-sm">No events yet</li>
        )}
      </ul>
      {showModal && <EventModal onSave={handleSave} onClose={() => setShowModal(false)} />}
    </div>
  )
}
