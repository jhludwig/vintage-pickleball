import { useState } from 'react'
import { fullName, ratingTierClass } from '../../lib/playerName'

const EMPTY_GUEST = { first_name: '', last_name: '', gender: '', ranking: '' }

function AddGuestModal({ onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_GUEST)
  const [saving, setSaving] = useState(false)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    if (!form.first_name.trim() && !form.last_name.trim()) return
    setSaving(true)
    try {
      await onSave(form)
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full border border-stone-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-xs p-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-stone-800 text-sm">Add Guest</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xl leading-none">&times;</button>
        </div>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">First Name</label>
              <input className={inputClass} value={form.first_name} onChange={e => set('first_name', e.target.value)} autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Last Name</label>
              <input className={inputClass} value={form.last_name} onChange={e => set('last_name', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Gender</label>
              <select className={inputClass} value={form.gender} onChange={e => set('gender', e.target.value)}>
                <option value="">—</option>
                <option value="M">M</option>
                <option value="F">F</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Ranking</label>
              <input className={inputClass} value={form.ranking} onChange={e => set('ranking', e.target.value)} placeholder="e.g. 3.5" />
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full mt-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Adding…' : 'Add to Round'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ParticipantPanel({ players, selected, onChange, canWrite, onAddGuest }) {
  const [showAddGuest, setShowAddGuest] = useState(false)
  const sorted = [...players].sort((a, b) => a.last_name.localeCompare(b.last_name))

  async function handleSaveGuest(form) {
    await onAddGuest(form)
    setShowAddGuest(false)
  }

  return (
    <div className="w-36 shrink-0 border-r border-stone-200 bg-white flex flex-col overflow-hidden">
      <div className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-2 px-3 pt-2">Participants</div>
      <div className="flex-1 overflow-y-auto px-1 space-y-0.5">
        {sorted.map(p => (
          <label key={p.id} className={`flex items-center gap-2 cursor-pointer px-1 py-1 rounded-lg hover:bg-stone-50 transition-colors border-l-4 ${ratingTierClass(p.ranking)}`}>
            <input
              type="checkbox"
              checked={selected.has(p.id)}
              onChange={e => {
                const next = new Set(selected)
                e.target.checked ? next.add(p.id) : next.delete(p.id)
                onChange(next)
              }}
              className="accent-emerald-600"
            />
            <span className="text-xs truncate text-stone-700">
              {fullName(p)}
              {p.ranking ? <span className="text-stone-400"> {p.ranking}</span> : ''}
              {p.player_type === 'guest' ? <span className="text-amber-500"> G</span> : null}
            </span>
          </label>
        ))}
      </div>
      {canWrite && (
        <div className="p-2 border-t border-stone-100">
          <button
            onClick={() => setShowAddGuest(true)}
            className="w-full text-xs text-emerald-600 hover:text-emerald-700 font-medium py-1 rounded-lg hover:bg-emerald-50 transition-colors"
          >
            + Add Guest
          </button>
        </div>
      )}
      {showAddGuest && (
        <AddGuestModal onSave={handleSaveGuest} onClose={() => setShowAddGuest(false)} />
      )}
    </div>
  )
}
