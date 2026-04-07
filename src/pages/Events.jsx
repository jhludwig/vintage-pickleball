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
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)

  const loadEvents = useCallback(async () => {
    const [{ data: evData, error: evError }, { data: tmplData, error: tmplError }] = await Promise.all([
      supabase.from('events').select('*').order('date', { ascending: false }),
      supabase.from('event_templates').select('*').order('created_at'),
    ])
    if (evError) console.error('Failed to load events:', evError)
    if (tmplError) console.error('Failed to load templates:', tmplError)

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
    const today = new Date().toISOString().split('T')[0]
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

  async function handleToggleTemplate(id, isActive) {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, is_active: isActive } : t))
    const { error } = await supabase
      .from('event_templates').update({ is_active: isActive }).eq('id', id)
    if (error) console.error('Failed to update schedule:', error)
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
