import CourtCard from './CourtCard'
import { fullName } from '../../lib/playerName'

export default function CourtGrid({ courts, draftAssignments, committedAssignments, results, onToggleActive, onPlayerClick, onSetWinner, isCommitted, canWrite, showRankings, holdingPen, suggestKey, flashedIds, swapTargetId }) {
  return (
    <div className="flex-1 p-2 overflow-y-auto">
      <div className="text-xs font-bold uppercase text-stone-400 mb-2">Courts</div>
      <div className="grid grid-cols-2 gap-2">
        {courts.map(court => {
          const assignments = isCommitted ? committedAssignments : draftAssignments
          const courtAssignments = assignments.find(a => a.court_number === court.court_number) ?? { team1: [], team2: [] }
          const result = results.find(r => r.court_number === court.court_number)
          return (
            <CourtCard
              key={court.court_number}
              courtNumber={court.court_number}
              isActive={court.is_active}
              team1={courtAssignments.team1}
              team2={courtAssignments.team2}
              winningTeam={result?.winning_team ?? null}
              onToggleActive={onToggleActive}
              onPlayerClick={onPlayerClick}
              onSetWinner={onSetWinner}
              isCommitted={isCommitted}
              canWrite={canWrite}
              showRankings={showRankings}
              suggestKey={suggestKey}
              flashedIds={flashedIds}
              swapTargetId={swapTargetId}
            />
          )
        })}
      </div>

      {holdingPen.length > 0 && (
        <div className="mt-3 border border-amber-200 rounded-xl overflow-hidden">
          <div className="bg-amber-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700">
            Holding Pen
          </div>
          <div className="bg-white px-3 py-2 flex flex-wrap gap-2">
            {holdingPen.map(p => (
              <div
                key={p.id}
                onClick={() => !isCommitted && canWrite && onPlayerClick(p)}
                className={`text-xs px-2 py-1 rounded-lg border border-amber-200 bg-amber-50/60 ${!isCommitted && canWrite ? 'cursor-pointer hover:bg-amber-100 hover:border-amber-300 hover:text-amber-800' : 'text-stone-600'}`}
              >
                {fullName(p)}
                {showRankings && p.ranking ? <span className="text-stone-400 ml-1">{p.ranking}</span> : ''}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
