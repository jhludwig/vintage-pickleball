import { useState } from 'react'
import Modal from '../../components/Modal'
import { DAYS } from './schedules'

export default function ScheduleModal({ onSave, onClose }) {
  const [name, setName] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState('2') // Tuesday default
  const [seasonStart, setSeasonStart] = useState('11-01')
  const [seasonEnd, setSeasonEnd] = useState('05-31')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    const mmddPattern = /^\d{2}-\d{2}$/
    if (!mmddPattern.test(seasonStart) || !mmddPattern.test(seasonEnd)) {
      alert('Season start and end must be in MM-DD format (e.g. 11-01)')
      return
    }
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        day_of_week: Number(dayOfWeek),
        season_start: seasonStart,
        season_end: seasonEnd,
      })
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'

  return (
    <Modal title="Add Schedule" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Name</label>
          <input
            className={inputClass}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Tuesday Morning Choose-Up"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Day of Week</label>
          <select
            className={inputClass}
            value={dayOfWeek}
            onChange={e => setDayOfWeek(e.target.value)}
          >
            {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Season Start (MM-DD)</label>
            <input
              className={inputClass}
              value={seasonStart}
              onChange={e => setSeasonStart(e.target.value)}
              placeholder="11-01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Season End (MM-DD)</label>
            <input
              className={inputClass}
              value={seasonEnd}
              onChange={e => setSeasonEnd(e.target.value)}
              placeholder="05-31"
            />
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Add Schedule'}
        </button>
      </div>
    </Modal>
  )
}
