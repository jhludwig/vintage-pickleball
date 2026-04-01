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
    <div>
      {session && (
        <div className="p-4 pb-0 flex justify-end">
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + Add Event
          </button>
        </div>
      )}
      <ul className="divide-y divide-gray-100 mt-2">
        {events.map(ev => (
          <li
            key={ev.id}
            onClick={() => navigate(`/events/${ev.id}`)}
            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer"
          >
            <div>
              <div className="font-medium text-gray-800">{ev.name}</div>
              <div className="text-sm text-gray-500">{ev.date}</div>
            </div>
            {session && (
              <button
                onClick={e => handleDelete(e, ev.id)}
                className="text-red-400 hover:text-red-600 text-sm px-2"
              >
                Delete
              </button>
            )}
          </li>
        ))}
        {events.length === 0 && (
          <li className="px-4 py-8 text-center text-gray-400 text-sm">No events yet</li>
        )}
      </ul>
      {showModal && <EventModal onSave={handleSave} onClose={() => setShowModal(false)} />}
    </div>
  )
}
