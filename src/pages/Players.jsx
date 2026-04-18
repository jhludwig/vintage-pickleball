import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import PlayerTable from '../features/players/PlayerTable'
import PlayerModal from '../features/players/PlayerModal'
import Spinner from '../components/Spinner'

export default function Players() {
  const session = useAuth()
  const navigate = useNavigate()
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'add'
  const [showInactive, setShowInactive] = useState(false)

  const loadPlayers = useCallback(async () => {
    const { data, error } = await supabase.from('players').select('*').order('last_name').order('first_name')
    if (error) { console.error('Failed to load players:', error) }
    setPlayers(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadPlayers() }, [loadPlayers])

  async function handleSave(form) {
    const { id, created_at, ...fields } = form
    const { error } = await supabase.from('players').insert(fields)
    if (error) { alert(`Failed to save: ${error.message}`); return }
    setModal(null)
    loadPlayers()
  }

  async function handleToggleActive(player) {
    const { error } = await supabase
      .from('players')
      .update({ plays_pickleball: !player.plays_pickleball })
      .eq('id', player.id)
    if (error) { alert(`Failed to update player: ${error.message}`); return }
    loadPlayers()
  }

  if (loading) return <Spinner />

  const active = players.filter(p => p.plays_pickleball)
  const inactive = players.filter(p => !p.plays_pickleball)

  return (
    <div className="max-w-lg mx-auto pb-4">
      {/* Active Players */}
      <div className="px-4 pt-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-stone-700">Active Players</h2>
        {session && (
          <button
            onClick={() => setModal('add')}
            className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            + Add Player
          </button>
        )}
      </div>
      <PlayerTable
        players={active}
        onRowClick={p => navigate(`/players/${p.id}`)}
        onToggleActive={session ? handleToggleActive : null}
        toggleLabel="Set Inactive"
        toggleClass="border-stone-200 text-stone-400 hover:border-stone-400 hover:text-stone-600"
      />

      {/* Inactive Vintage Members */}
      <div className="px-4 mt-6">
        <button
          onClick={() => setShowInactive(v => !v)}
          className="flex items-center gap-1.5 text-sm font-semibold text-stone-500 hover:text-stone-700 transition-colors"
        >
          <span className={`transition-transform text-xs ${showInactive ? 'rotate-90' : ''}`}>▶</span>
          Inactive Vintage Members
          <span className="text-xs font-normal text-stone-400">({inactive.length})</span>
        </button>
      </div>
      {showInactive && (
        <PlayerTable
          players={inactive}
          onRowClick={p => navigate(`/players/${p.id}`)}
          onToggleActive={session ? handleToggleActive : null}
          toggleLabel="Set Active"
          toggleClass="border-emerald-200 text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50"
        />
      )}

      {modal && (
        <PlayerModal
          player={null}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
