import CourtCard from './CourtCard'

export default function CourtGrid({ courts, draftAssignments, committedAssignments, results, onToggleActive, onPlayerClick, onSetWinner, isCommitted, canWrite }) {
  return (
    <div className="flex-1 p-2 overflow-y-auto">
      <div className="text-xs font-bold uppercase text-gray-400 mb-2">Courts</div>
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
            />
          )
        })}
      </div>
    </div>
  )
}
