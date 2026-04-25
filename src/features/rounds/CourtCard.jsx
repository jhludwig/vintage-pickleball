import { fullName, ratingTierClass } from '../../lib/playerName'
import { useRankings } from '../../hooks/useRankings'

export default function CourtCard({ courtNumber, isActive, team1, team2, winningTeam, onToggleActive, onPlayerClick, onSetWinner, isCommitted, canWrite, suggestKey, flashedIds, swapTargetId, violations = [] }) {
  const { showRankings } = useRankings()
  const violatingIds = new Set(violations.flatMap(v => [v.playerA.id, v.playerB.id]))
  return (
    <div className={`rounded-xl overflow-hidden border transition-all ${isActive ? 'border-emerald-300 shadow-sm' : 'border-stone-200 opacity-50'}`}>
      <div className={`flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold ${isActive ? 'bg-gradient-to-r from-emerald-700 to-emerald-500 text-white' : 'bg-stone-100 text-stone-400'}`}>
        <div className="flex items-center gap-1.5">
          <span>Court {courtNumber}</span>
          {violations.length > 0 && (
            <span className="bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded text-xs font-semibold">
              ⚠ Block conflict
            </span>
          )}
        </div>
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
        <div className="flex flex-col">
          {[{ team: 1, players: team1 }, { team: 2, players: team2 }].map(({ team, players }, teamIdx) => (
            <div key={team} className={`p-2 ${team === 1 ? 'bg-blue-50 border-b border-blue-100' : 'bg-orange-50'}`}>
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
              {players.map((p, playerIdx) => {
                const index = teamIdx * 2 + playerIdx
                const isFlashing = flashedIds?.has(p.id)
                const isSwapTarget = swapTargetId === p.id
                return (
                  <div
                    key={p.id + '-' + suggestKey}
                    style={isFlashing ? undefined : { animationDelay: `${index * 80}ms` }}
                    onClick={() => canWrite && !isCommitted && onPlayerClick(p)}
                    className={[
                      'text-xs truncate py-0.5 px-2 rounded-md border border-l-4 mb-0.5',
                      isFlashing ? 'animate-flash-gold' : 'animate-fade-in-up',
                      violatingIds.has(p.id)
                        ? 'bg-amber-50 border-amber-300 text-amber-800'
                        : team === 1 ? 'bg-white/70 border-blue-100' : 'bg-white/70 border-orange-100',
                      !violatingIds.has(p.id) && showRankings ? ratingTierClass(p.ranking) : '',
                      isSwapTarget ? 'ring-2 ring-amber-400 ring-offset-1' : '',
                      canWrite && !isCommitted ? 'cursor-pointer hover:bg-white hover:text-emerald-700' : 'text-stone-700',
                    ].filter(Boolean).join(' ')}
                  >
                    {fullName(p)}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
