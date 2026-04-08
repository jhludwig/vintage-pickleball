import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import EventModal from '../features/events/EventModal'
import ScheduleModal from '../features/events/ScheduleModal'
import { getNextOccurrence, DAYS } from '../features/events/schedules'
import Spinner from '../components/Spinner'

export default function Events() {
  const session = useAuth()
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [eventIdsWithScores, setEventIdsWithScores] = useState(new Set())
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)

  const loadEvents = useCallback(async () => {
    const [
      { data: evData, error: evError },
      { data: tmplData, error: tmplError },
      { data: roundData },
      { data: resultData },
    ] = await Promise.all([
      supabase.from('events').select('*').order('date', { ascending: false }),
      supabase.from('event_templates').select('*').order('created_at'),
      supabase.from('rounds').select('id, event_id'),
      supabase.from('court_results').select('round_id'),
    ])
    if (evError) console.error('Failed to load events:', evError)
    if (tmplError) console.error('Failed to load templates:', tmplError)

    const roundsWithResults = new Set((resultData ?? []).map(r => r.round_id))
    const withScores = new Set(
      (roundData ?? []).filter(r => roundsWithResults.has(r.id)).map(r => r.event_id)
    )
    setEventIdsWithScores(withScores)

    const activeTemplates = (tmplData ?? []).filter(t => t.is_active)

    if (session && activeTemplates.length > 0) {
      await generateMissingEvents(activeTemplates)
      const { data: refreshed } = await supabase
        .from('events').select('*').order('date', { ascending: false })
      setEvents(refreshed ?? [])
    } else {
      setEvents(evData ?? [])
    }

    setTemplates(tmplData ?? [])
    setLoading(false)
  }, [session])

  useEffect(() => { loadEvents() }, [loadEvents])

  async function generateMissingEvents(activeTemplates) {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const templateIds = activeTemplates.map(t => t.id)

    const { data: existing } = await supabase
      .from('events')
      .select('template_id, date')
      .in('template_id', templateIds)

    for (const template of activeTemplates) {
      const nextDate = getNextOccurrence(template, today)
      if (!nextDate) continue

      const alreadyExists = (existing ?? []).some(
        e => e.template_id === template.id && e.date === nextDate
      )
      if (alreadyExists) continue

      const { error } = await supabase.from('events').insert({
        name: template.name,
        date: nextDate,
        template_id: template.id,
      })
      if (error) console.error('Failed to generate event:', error)
    }
  }

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

  async function handleSaveSchedule(form) {
    const { error } = await supabase.from('event_templates').insert(form)
    if (error) { alert(`Failed to save schedule: ${error.message}`); return }
    setShowScheduleModal(false)
    loadEvents()
  }

  async function handleDeleteTemplate(id) {
    if (!confirm('Delete this recurring schedule?')) return
    const { error } = await supabase.from('event_templates').delete().eq('id', id)
    if (error) { alert(`Failed to delete schedule: ${error.message}`); return }
    setTemplates(prev => prev.filter(t => t.id !== id))
  }

  async function handleToggleTemplate(id, isActive) {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, is_active: isActive } : t))
    const { error } = await supabase
      .from('event_templates').update({ is_active: isActive }).eq('id', id)
    if (error) {
      console.error('Failed to update schedule:', error)
      setTemplates(prev => prev.map(t => t.id === id ? { ...t, is_active: !isActive } : t))
    }
  }

  if (loading) return <Spinner />

  const upcomingEvents = events.filter(e => !eventIdsWithScores.has(e.id))
  const pastEvents = events.filter(e => eventIdsWithScores.has(e.id))

  function EventList({ items, emptyText }) {
    return (
      <ul className="divide-y divide-stone-100 bg-white rounded-xl shadow-sm overflow-hidden border border-stone-200">
        {items.map(ev => (
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
        {items.length === 0 && (
          <li className="px-4 py-6 text-center text-stone-400 text-sm">{emptyText}</li>
        )}
      </ul>
    )
  }

  return (
    <div className="max-w-lg mx-auto pb-6">
      <div className="px-4 pt-4 flex justify-end">
        {session && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            + Add Event
          </button>
        )}
      </div>

      <div className="px-4 mt-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-2">Upcoming Events</div>
        <EventList items={upcomingEvents} emptyText="No upcoming events" />
      </div>

      {pastEvents.length > 0 && (
        <div className="px-4 mt-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-2">Past Events</div>
          <EventList items={pastEvents} emptyText="" />
        </div>
      )}

      {session && (
        <div className="px-4 mt-6 pb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              Recurring Schedules
            </span>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
            >
              + Add Schedule
            </button>
          </div>
          {templates.length === 0 ? (
            <p className="text-xs text-stone-400 py-2">No recurring schedules</p>
          ) : (
            <ul className="divide-y divide-stone-100 bg-white rounded-xl shadow-sm overflow-hidden border border-stone-200">
              {templates.map(t => (
                <li key={t.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-stone-800">{t.name}</div>
                    <div className="text-xs text-stone-400 mt-0.5">
                      {DAYS[t.day_of_week]} · {t.season_start} – {t.season_end}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={t.is_active}
                        onChange={e => handleToggleTemplate(t.id, e.target.checked)}
                        className="accent-emerald-600"
                      />
                      <span className="text-xs text-stone-500">
                        {t.is_active ? 'Active' : 'Paused'}
                      </span>
                    </label>
                    <button
                      onClick={() => handleDeleteTemplate(t.id)}
                      className="text-stone-300 hover:text-red-500 text-sm transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {showModal && <EventModal onSave={handleSave} onClose={() => setShowModal(false)} />}
      {showScheduleModal && (
        <ScheduleModal onSave={handleSaveSchedule} onClose={() => setShowScheduleModal(false)} />
      )}
    </div>
  )
}
