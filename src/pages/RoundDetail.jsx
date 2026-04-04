import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { suggest } from '../features/rounds/algorithms'
import { fullName } from '../lib/playerName'
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
  const [priorRounds, setPriorRounds] = useState([])
  const [priorRoundResult, setPriorRoundResult] = useState(null)

  const load = useCallback(async () => {
    const [
      { data: rd },
      { data: ev },
      { data: players },
      { data: cts },
      { data: parts },
      { data: assignments },
      { data: res },
      { data: priorRoundRows },
    ] = await Promise.all([
      supabase.from('rounds').select('*').eq('id', roundId).single(),
      supabase.from('events').select('*').eq('id', eventId).single(),
      supabase.from('players').select('*').eq('plays_pickleball', true).order('last_name').order('first_name'),
      supabase.from('active_courts').select('*').eq('round_id', roundId).order('court_number'),
      supabase.from('round_participants').select('player_id').eq('round_id', roundId),
      supabase.from('court_assignments').select('*, players(*)').eq('round_id', roundId),
      supabase.from('court_results').select('*').eq('round_id', roundId),
      supabase.from('rounds').select('id, round_number').eq('event_id', eventId).eq('is_committed', true).neq('id', roundId).order('round_number'),
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

    // Build prior rounds data for social priority and river mode
    const priorRoundIds = (priorRoundRows ?? []).map(r => r.id)
    if (priorRoundIds.length > 0) {
      const { data: priorAsn } = await supabase
        .from('court_assignments')
        .select('round_id, court_number, player_id, team, players(*)')
        .in('round_id', priorRoundIds)

      // priorRounds: shape for social priority - player IDs per court
      const built = priorRoundIds.map(rid => {
        const roundAsn = (priorAsn ?? []).filter(a => a.round_id === rid)
        const courtNums = [...new Set(roundAsn.map(a => a.court_number))].sort((a, b) => a - b)
        return {
          assignments: courtNums.map(cn => ({
            court_number: cn,
            players: roundAsn.filter(a => a.court_number === cn).map(a => a.player_id),
          })),
        }
      })
      setPriorRounds(built)

      // priorRoundResult: most recent committed round with results, for river mode
      const latestId = priorRoundIds[priorRoundIds.length - 1]
      const { data: prevResults } = await supabase
        .from('court_results').select('*').eq('round_id', latestId)
      if (prevResults && prevResults.length > 0) {
        const latestAsn = (priorAsn ?? []).filter(a => a.round_id === latestId)
        const resultMap = {}
        for (const result of prevResults) {
          const courtPlayers = latestAsn.filter(a => a.court_number === result.court_number)
          resultMap[result.court_number] = {
            winners: courtPlayers.filter(a => a.team === result.winning_team).map(a => a.players),
            losers: courtPlayers.filter(a => a.team !== result.winning_team).map(a => a.players),
          }
        }
        setPriorRoundResult(resultMap)
      } else {
        setPriorRoundResult(null)
      }
    } else {
      setPriorRounds([])
      setPriorRoundResult(null)
    }

    setLoading(false)
  }, [roundId, eventId])

  useEffect(() => { load() }, [load])

  async function handleParticipantChange(newSet) {
    setParticipants(newSet)
    if (!canWrite) return
    const { error: delError } = await supabase.from('round_participants').delete().eq('round_id', roundId)
    if (delError) { alert(`Failed to update participants: ${delError.message}`); return }
    if (newSet.size > 0) {
      const { error: insError } = await supabase.from('round_participants').insert(
        [...newSet].map(pid => ({ round_id: roundId, player_id: pid }))
      )
      if (insError) { alert(`Failed to update participants: ${insError.message}`); return }
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
    const draft = suggest({ participants: participatingPlayers, activeCourts, options, priorRounds, priorRoundResult })
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


  async function handleAddGuest({ first_name, last_name, gender, ranking }) {
    const { data: player, error: insError } = await supabase
      .from('players')
      .insert({ first_name, last_name, gender: gender || null, ranking: ranking || '', player_type: 'guest', plays_pickleball: true })
      .select()
      .single()
    if (insError) { alert(`Failed to add guest: ${insError.message}`); return }
    // Add to round participants
    const { error: partError } = await supabase
      .from('round_participants')
      .insert({ round_id: roundId, player_id: player.id })
    if (partError) { alert(`Failed to add guest to round: ${partError.message}`); return }
    // Update local state immediately — no need to reload
    setAllPlayers(prev => [...prev, player])
    setParticipants(prev => new Set([...prev, player.id]))
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

  const activeAssignments = round?.is_committed ? committedAssignments : draftAssignments
  const assignedIds = new Set(activeAssignments.flatMap(c => [...c.team1, ...c.team2].map(p => p.id)))
  const holdingPen = activeAssignments.length > 0
    ? allPlayers.filter(p => participants.has(p.id) && !assignedIds.has(p.id))
    : []

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="px-4 py-2 border-b border-stone-200 bg-white flex items-center gap-2">
        <button onClick={() => navigate(`/events/${eventId}`)} className="text-sm text-emerald-600 hover:text-emerald-700 transition-colors">← {event?.name}</button>
        <span className="text-sm text-stone-400">/</span>
        <span className="text-sm font-semibold text-stone-700">Round {round?.round_number}</span>
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
          canWrite={canWrite}
          onAddGuest={handleAddGuest}
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
          holdingPen={holdingPen}
        />
      </div>

      {swapTarget && (
        <div className="fixed bottom-16 left-0 right-0 bg-amber-50 border-t border-amber-200 px-4 py-2.5 text-sm text-amber-800 text-center">
          Tap another player to swap with <strong>{fullName(swapTarget)}</strong>. Tap same player to cancel.
        </div>
      )}
    </div>
  )
}
