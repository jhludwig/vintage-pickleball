import { useEffect, useState } from 'react'
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

  useEffect(() => { loadPlayers() }, [])

  async function loadPlayers() {
    const { data } = await supabase.from('players').select('*').order('name')
    setPlayers(data ?? [])
    setLoading(false)
  }

  async function handleSave(form) {
    if (form.id) {
      await supabase.from('players').update(form).eq('id', form.id)
    } else {
      await supabase.from('players').insert(form)
    }
    setModal(null)
    loadPlayers()
  }

  async function handleDelete(id) {
    await supabase.from('players').delete().eq('id', id)
    setModal(null)
    loadPlayers()
  }

  if (loading) return <Spinner />

  return (
    <div>
      {session && (
        <div className="p-4 pb-0 flex justify-end">
          <button
            onClick={() => setModal('add')}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
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
