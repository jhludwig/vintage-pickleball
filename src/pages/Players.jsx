import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import PlayerTable from '../features/players/PlayerTable'
import PlayerModal from '../features/players/PlayerModal'
import Spinner from '../components/Spinner'

export default function Players() {
  const session = useAuth()
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'add' | player object

  const loadPlayers = useCallback(async () => {
    const { data, error } = await supabase.from('players').select('*').order('last_name').order('first_name')
    if (error) { console.error('Failed to load players:', error) }
    setPlayers(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadPlayers() }, [loadPlayers])

  async function handleSave(form) {
    const { id, created_at, ...fields } = form
    let error
    if (id) {
      ({ error } = await supabase.from('players').update(fields).eq('id', id))
    } else {
      ({ error } = await supabase.from('players').insert(fields))
    }
    if (error) { alert(`Failed to save: ${error.message}`); return }
    setModal(null)
    loadPlayers()
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('players').delete().eq('id', id)
    if (error) { alert(`Failed to delete: ${error.message}`); return }
    setModal(null)
    loadPlayers()
  }

  if (loading) return <Spinner />

  return (
    <div className="max-w-lg mx-auto pb-4">
      {session && (
        <div className="px-4 pt-4 flex justify-end">
          <button
            onClick={() => setModal('add')}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            + Add Player
          </button>
        </div>
      )}
      <PlayerTable players={players} onRowClick={p => session && setModal(p)} />
      {modal && (
        <PlayerModal
          player={modal === 'add' ? null : modal}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
