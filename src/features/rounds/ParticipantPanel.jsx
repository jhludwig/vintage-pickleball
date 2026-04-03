import { fullName } from '../../lib/playerName'

export default function ParticipantPanel({ players, selected, onChange }) {
  const sorted = [...players].sort((a, b) => a.last_name.localeCompare(b.last_name))

  return (
    <div className="w-36 shrink-0 border-r border-stone-200 bg-white p-2 overflow-y-auto">
      <div className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-2 px-1">Participants</div>
      <div className="space-y-0.5">
        {sorted.map(p => (
          <label key={p.id} className="flex items-center gap-2 cursor-pointer px-1 py-1 rounded-lg hover:bg-stone-50 transition-colors">
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
              {p.player_type === 'guest' ? <span className="text-stone-400"> G</span> : null}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
