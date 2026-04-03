import { fullName } from '../../lib/playerName'

export default function CourtCard({ courtNumber, isActive, team1, team2, winningTeam, onToggleActive, onPlayerClick, onSetWinner, isCommitted, canWrite }) {
  return (
    <div className={`rounded-xl overflow-hidden border transition-all ${isActive ? 'border-emerald-300 shadow-sm' : 'border-stone-200 opacity-50'}`}>
      <div className={`flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold ${isActive ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-400'}`}>
        <span>Court {courtNumber}</span>
        {canWrite && (
          <label className="flex items-center gap-1 font-normal cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={e => onToggleActive(courtNumber, e.target.checked)}
              className="accent-white"
            />
            Active
          </label>
        )}
      </div>
      {isActive && (
        <div className="flex">
          {[{ team: 1, players: team1 }, { team: 2, players: team2 }].map(({ team, players }) => (
            <div key={team} className={`flex-1 p-2 ${team === 1 ? 'bg-blue-50 border-r border-blue-100' : 'bg-orange-50'}`}>
              <div className={`text-xs font-semibold mb-1.5 flex items-center gap-1 ${team === 1 ? 'text-blue-500' : 'text-orange-400'}`}>
                Team {team}
                {isCommitted && canWrite && (
                  <button
                    onClick={() => onSetWinner(courtNumber, team)}
                    className={`ml-0.5 px-1 rounded text-xs transition-colors ${winningTeam === team ? 'bg-amber-400 text-white' : 'text-stone-300 hover:text-amber-400'}`}
                  >
                    🏆
                  </button>
                )}
              </div>
              {players.map(p => (
                <div
                  key={p.id}
                  onClick={() => canWrite && !isCommitted && onPlayerClick(p)}
                  className={`text-xs truncate py-0.5 rounded px-0.5 ${canWrite && !isCommitted ? 'cursor-pointer hover:bg-white/60 hover:text-emerald-700' : 'text-stone-700'}`}
                >
                  {fullName(p)}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
