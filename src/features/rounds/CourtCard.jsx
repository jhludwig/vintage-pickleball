export default function CourtCard({ courtNumber, isActive, team1, team2, winningTeam, onToggleActive, onPlayerClick, onSetWinner, isCommitted, canWrite }) {
  return (
    <div className={`border rounded-lg overflow-hidden ${isActive ? 'border-blue-300' : 'border-gray-200 opacity-50'}`}>
      <div className={`flex items-center justify-between px-2 py-1 text-xs font-semibold ${isActive ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
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
            <div key={team} className={`flex-1 p-1.5 ${team === 1 ? 'bg-blue-50 border-r border-blue-100' : 'bg-orange-50'}`}>
              <div className={`text-xs font-semibold mb-1 ${team === 1 ? 'text-blue-500' : 'text-orange-400'}`}>
                Team {team}
                {isCommitted && canWrite && (
                  <button
                    onClick={() => onSetWinner(courtNumber, team)}
                    className={`ml-1 px-1 rounded text-xs ${winningTeam === team ? 'bg-yellow-400 text-white' : 'text-gray-300 hover:text-yellow-400'}`}
                  >
                    🏆
                  </button>
                )}
              </div>
              {players.map(p => (
                <div
                  key={p.id}
                  onClick={() => canWrite && !isCommitted && onPlayerClick(p)}
                  className={`text-xs truncate py-0.5 ${canWrite && !isCommitted ? 'cursor-pointer hover:text-blue-600' : ''}`}
                >
                  {p.name}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
