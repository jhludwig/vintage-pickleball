import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { suggest } from '../features/rounds/algorithms'
import AlgorithmBar from '../features/rounds/AlgorithmBar'
import ParticipantPanel from '../features/rounds/ParticipantPanel'
import CourtGrid from '../features/rounds/CourtGrid'
import Spinner from '../components/Spinner'

export default function RoundDetail() {
  const { eventId, roundId } = useParams()
  const navigate = useNavigate()
  const session = useAuth()
  const canWrite = !!session

  const [round, setRound] = useState(null)
  const [event, setEvent] = useState(null)
  const [allPlayers, setAllPlayers] = useState([])
  const [courts, setCourts] = useState([])
  const [participants, setParticipants] = useState(new Set())
  const [committedAssignments, setCommittedAssignments] = useState([])
  const [results, setResults] = useState([])
  const [draftAssignments, setDraftAssignments] = useState([])
  const [options, setOptions] = useState({})
  const [swapTarget, setSwapTarget] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [
      { data: rd },
      { data: ev },
      { data: players },
      { data: cts },
      { data: parts },
      { data: assignments },
      { data: res },
    ] = await Promise.all([
      supabase.from('rounds').select('*').eq('id', roundId).single(),
      supabase.from('events').select('*').eq('id', eventId).single(),
      supabase.from('players').select('*').eq('plays_pickleball', true).order('name'),
      supabase.from('active_courts').select('*').eq('round_id', roundId).order('court_number'),
      supabase.from('round_participants').select('player_id').eq('round_id', roundId),
      supabase.from('court_assignments').select('*, players(*)').eq('round_id', roundId),
      supabase.from('court_results').select('*').eq('round_id', roundId),
    ])

    setRound(rd)
    setEvent(ev)
    setAllPlayers(players ?? [])
    setCourts(cts ?? [])
    setParticipants(new Set((parts ?? []).map(p => p.player_id)))
    setResults(res ?? [])

    // Build committed assignments from DB
    const committed = []
    for (let i = 1; i <= 8; i++) {
      const courtPlayers = (assignments ?? []).filter(a => a.court_number === i)
      if (courtPlayers.length > 0) {
        committed.push({
          court_number: i,
          team1: courtPlayers.filter(a => a.team === 1).map(a => a.players),
          team2: courtPlayers.filter(a => a.team === 2).map(a => a.players),
        })
      }
    }
    setCommittedAssignments(committed)
    setLoading(false)
  }, [roundId, eventId])

  useEffect(() => { load() }, [load])

  async function handleParticipantChange(newSet) {
    setParticipants(newSet)
    if (!canWrite) return
    // Sync to DB: delete all then reinsert
    await supabase.from('round_participants').delete().eq('round_id', roundId)
    if (newSet.size > 0) {
      await supabase.from('round_participants').insert(
        [...newSet].map(pid => ({ round_id: roundId, player_id: pid }))
      )
    }
  }

  async function handleToggleActive(courtNumber, isActive) {
    setCourts(cs => cs.map(c => c.court_number === courtNumber ? { ...c, is_active: isActive } : c))
    if (!canWrite) return
    await supabase.from('active_courts')
      .update({ is_active: isActive })
      .eq('round_id', roundId)
      .eq('court_number', courtNumber)
  }

  function handleSuggest() {
    const activeCourts = courts.filter(c => c.is_active).map(c => c.court_number)
    const participatingPlayers = allPlayers.filter(p => participants.has(p.id))
    const draft = suggest({ participants: participatingPlayers, activeCourts, options })
    setDraftAssignments(draft)
    setSwapTarget(null)
  }

  function handlePlayerClick(player) {
    if (round?.is_committed) return
    if (!swapTarget) {
      setSwapTarget(player)
      return
    }
    if (swapTarget.id === player.id) {
      setSwapTarget(null)
      return
    }
    // Swap the two players in draftAssignments
    setDraftAssignments(prev => prev.map(court => ({
      ...court,
      team1: court.team1.map(p => p.id === swapTarget.id ? player : p.id === player.id ? swapTarget : p),
      team2: court.team2.map(p => p.id === swapTarget.id ? player : p.id === player.id ? swapTarget : p),
    })))
    setSwapTarget(null)
  }

  async function handleCommit() {
    if (!confirm('Commit this round? Assignments will be saved.')) return
    // Save all draft assignments to DB
    const rows = draftAssignments.flatMap(court => [
      ...court.team1.map(p => ({ round_id: roundId, court_number: court.court_number, player_id: p.id, team: 1 })),
      ...court.team2.map(p => ({ round_id: roundId, court_number: court.court_number, player_id: p.id, team: 2 })),
    ])
    const { error: delError } = await supabase.from('court_assignments').delete().eq('round_id', roundId)
    if (delError) { alert(`Failed to commit: ${delError.message}`); return }
    if (rows.length > 0) {
      const { error: insError } = await supabase.from('court_assignments').insert(rows)
      if (insError) { alert(`Failed to commit: ${insError.message}`); return }
    }
    const { error: upError } = await supabase.from('rounds').update({ is_committed: true }).eq('id', roundId)
    if (upError) { alert(`Failed to commit: ${upError.message}`); return }
    load()
  }

  async function handleSetWinner(courtNumber, team) {
    const existing = results.find(r => r.court_number === courtNumber)
    if (existing) {
      const { error } = await supabase.from('court_results')
        .update({ winning_team: team })
        .eq('round_id', roundId)
        .eq('court_number', courtNumber)
      if (error) { alert(`Failed to record winner: ${error.message}`); return }
    } else {
      const { error } = await supabase.from('court_results')
        .insert({ round_id: roundId, court_number: courtNumber, winning_team: team })
      if (error) { alert(`Failed to record winner: ${error.message}`); return }
    }
    load()
  }

  if (loading) return <Spinner />

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="px-4 py-2 border-b flex items-center gap-2">
        <button onClick={() => navigate(`/events/${eventId}`)} className="text-sm text-blue-500">← {event?.name}</button>
        <span className="text-sm font-medium text-gray-600">/ Round {round?.round_number}</span>
      </div>

      <AlgorithmBar
        options={options}
        onOptionChange={(key, val) => setOptions(o => ({ ...o, [key]: val }))}
        onSuggest={handleSuggest}
        onCommit={handleCommit}
        isCommitted={round?.is_committed}
        canWrite={canWrite}
      />

      <div className="flex flex-1 overflow-hidden">
        <ParticipantPanel
          players={allPlayers}
          selected={participants}
          onChange={handleParticipantChange}
        />
        <CourtGrid
          courts={courts}
          draftAssignments={draftAssignments}
          committedAssignments={committedAssignments}
          results={results}
          onToggleActive={handleToggleActive}
          onPlayerClick={handlePlayerClick}
          onSetWinner={handleSetWinner}
          isCommitted={round?.is_committed}
          canWrite={canWrite}
        />
      </div>

      {swapTarget && (
        <div className="fixed bottom-16 left-0 right-0 bg-yellow-50 border-t border-yellow-200 px-4 py-2 text-sm text-yellow-800 text-center">
          Tap another player to swap with <strong>{swapTarget.name}</strong>. Tap again to cancel.
        </div>
      )}
    </div>
  )
}
