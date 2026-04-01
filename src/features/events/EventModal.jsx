import { useState } from 'react'
import Modal from '../../components/Modal'

export default function EventModal({ onSave, onClose }) {
  const today = new Date().toISOString().split('T')[0]
  const [name, setName] = useState('Chooseup')
  const [date, setDate] = useState(today)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({ name, date })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Add Event" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Add Event'}
        </button>
      </div>
    </Modal>
  )
}
