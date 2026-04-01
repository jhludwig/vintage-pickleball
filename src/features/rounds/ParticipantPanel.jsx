export default function ParticipantPanel({ players, selected, onChange }) {
  // players: all plays_pickleball players; selected: Set of player ids
  const sorted = [...players].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="w-36 shrink-0 border-r border-gray-200 p-2 overflow-y-auto">
      <div className="text-xs font-bold uppercase text-gray-400 mb-2">Participants</div>
      <div className="space-y-1">
        {sorted.map(p => (
          <label key={p.id} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.has(p.id)}
              onChange={e => {
                const next = new Set(selected)
                e.target.checked ? next.add(p.id) : next.delete(p.id)
                onChange(next)
              }}
            />
            <span className="text-xs truncate">
              {p.name}
              {p.ranking ? ` (${p.ranking})` : ''}
              {p.player_type === 'guest' ? <span className="text-gray-400"> G</span> : null}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
