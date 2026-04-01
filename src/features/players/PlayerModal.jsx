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
    await onSave(form)
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm(`Delete ${player.name}?`)) return
    await onDelete(player.id)
  }

  return (
    <Modal title={isEdit ? 'Edit Player' : 'Add Player'} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={form.name}
            onChange={e => set('name', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.player_type}
              onChange={e => set('player_type', e.target.value)}
            >
              <option value="member">Member</option>
              <option value="guest">Guest</option>
              <option value="pro">Pro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.gender}
              onChange={e => set('gender', e.target.value)}
            >
              <option value="">—</option>
              <option value="M">M</option>
              <option value="F">F</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ranking</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={form.ranking}
            onChange={e => set('ranking', e.target.value)}
            placeholder="e.g. 3.5"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.plays_pickleball}
            onChange={e => set('plays_pickleball', e.target.checked)}
          />
          Plays pickleball
        </label>
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-blue-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {isEdit && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 rounded-lg text-sm font-medium text-red-500 border border-red-200 hover:bg-red-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
