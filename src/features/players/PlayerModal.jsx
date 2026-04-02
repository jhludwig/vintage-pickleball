import { useState } from 'react'
import Modal from '../../components/Modal'

const EMPTY = { name: '', gender: '', ranking: '', player_type: 'member', plays_pickleball: true }

export default function PlayerModal({ player, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(player ?? EMPTY)
  const [saving, setSaving] = useState(false)
  const isEdit = !!player

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await onSave(form)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete ${player.name}?`)) return
    await onDelete(player.id)
  }

  const inputClass = 'w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
  const labelClass = 'block text-sm font-medium text-stone-700 mb-1'

  return (
    <Modal title={isEdit ? 'Edit Player' : 'Add Player'} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className={labelClass}>Name</label>
          <input
            className={inputClass}
            value={form.name}
            onChange={e => set('name', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Type</label>
            <select className={inputClass} value={form.player_type} onChange={e => set('player_type', e.target.value)}>
              <option value="member">Member</option>
              <option value="guest">Guest</option>
              <option value="pro">Pro</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Gender</label>
            <select className={inputClass} value={form.gender} onChange={e => set('gender', e.target.value)}>
              <option value="">—</option>
              <option value="M">M</option>
              <option value="F">F</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>Ranking</label>
          <input
            className={inputClass}
            value={form.ranking}
            onChange={e => set('ranking', e.target.value)}
            placeholder="e.g. 3.5"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form.plays_pickleball}
            onChange={e => set('plays_pickleball', e.target.checked)}
            className="accent-emerald-600"
          />
          Plays pickleball
        </label>
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {isEdit && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 rounded-lg text-sm font-medium text-red-500 border border-red-200 hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
