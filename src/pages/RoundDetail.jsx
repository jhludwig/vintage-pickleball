import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useRankings } from '../hooks/useRankings'
import { suggest, resolveBlocks } from '../features/rounds/algorithms'
import { fullName } from '../lib/playerName'
import AlgorithmBar from '../features/rounds/AlgorithmBar'
import ParticipantPanel from '../features/rounds/ParticipantPanel'
import CourtGrid from '../features/rounds/CourtGrid'
import Spinner from '../components/Spinner'

export default function RoundDetail() {
  const { eventId, roundId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const session = useAuth()
  const canWrite = !!session
  const { showRankings } = useRankings()

  const [round, setRound] = useState(null)
  const [event, setEvent] = useState(null)
  const [allPlayers, setAllPlayers] = useState([])
  const [courts, setCourts] = useState([])
  const [participants, setParticipants] = useState(new Set())
  const [committedAssignments, setCommittedAssignments] = useState([])
  const [results, setResults] = useState([])
  const [draftAssignments, setDraftAssignments] = useState(location.state?.draftAssignments ?? [])
  const [options, setOptions] = useState({})
  const [swapTarget, setSwapTarget] = useState(null)
  const [suggestKey, setSuggestKey] = useState(0)
  const [flashedIds, setFlashedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [priorRounds, setPriorRounds] = useState([])
  const [priorRoundResult, setPriorRoundResult] = useState(null)
  const [sittingOutCounts, setSittingOutCounts] = useState({})
  const [allBlocks, setAllBlocks] = useState([])
  const [violations, setViolations] = useState([])

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
      { data: blocksData },
    ] = await Promise.all([
      supabase.from('rounds').select('*').eq('id', roundId).single(),
      supabase.from('events').select('*').eq('id', eventId).single(),
      supabase.from('players').select('*').eq('plays_pickleball', true).order('last_name').order('first_name'),
      supabase.from('active_courts').select('*').eq('round_id', roundId).order('court_number'),
      supabase.from('round_participants').select('player_id').eq('round_id', roundId),
      supabase.from('court_assignments').select('*, players(*)').eq('round_id', roundId),
      supabase.from('court_results').select('*').eq('round_id', roundId),
      supabase.from('rounds').select('id, round_number').eq('event_id', eventId).eq('is_committed', true).neq('id', roundId).order('round_number'),
      supabase.from('player_blocks').select('player_id_a, player_id_b'),
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
      const [{ data: priorAsn }, { data: priorParts }] = await Promise.all([
        supabase
          .from('court_assignments')
          .select('round_id, court_number, player_id, team, players(*)')
          .in('round_id', priorRoundIds),
        supabase
          .from('round_participants')
          .select('round_id, player_id')
          .in('round_id', priorRoundIds),
      ])

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

      // Compute sitting-out counts for rotation priority
      const counts = {}
      for (const roundId of priorRoundIds) {
        const roundParts = (priorParts ?? []).filter(p => p.round_id === roundId)
        const roundAssigned = new Set(
          (priorAsn ?? []).filter(a => a.round_id === roundId).map(a => a.player_id)
        )
        for (const p of roundParts) {
          if (!roundAssigned.has(p.player_id)) {
            counts[p.player_id] = (counts[p.player_id] ?? 0) + 1
          }
        }
      }
      setSittingOutCounts(counts)
    } else {
      setPriorRounds([])
      setPriorRoundResult(null)
      setSittingOutCounts({})
    }

    setAllBlocks(blocksData ?? [])
    setLoading(false)
  }, [roundId, eventId])

  useEffect(() => { load() }, [load])

  // When roundId changes (navigating to a new round from a completed one), React reuses
  // this component instance, so useState() doesn't reinitialize. Sync draftAssignments
  // from navigation state explicitly.
  useEffect(() => {
    setDraftAssignments(location.state?.draftAssignments ?? [])
    setSuggestKey(k => k + 1)
    setViolations([])
  }, [roundId]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveParticipantsTimer = useRef(null)
  const pendingParticipants = useRef(null)

  function handleParticipantChange(newSet) {
    setParticipants(newSet)
    if (!canWrite) return
    pendingParticipants.current = newSet
    clearTimeout(saveParticipantsTimer.current)
    saveParticipantsTimer.current = setTimeout(async () => {
      const toSave = pendingParticipants.current
      const { error: delError } = await supabase.from('round_participants').delete().eq('round_id', roundId)
      if (delError) { alert(`Failed to update participants: ${delError.message}`); return }
      if (toSave.size > 0) {
        const { error: insError } = await supabase.from('round_participants').insert(
          [...toSave].map(pid => ({ round_id: roundId, player_id: pid }))
        )
        if (insError) { alert(`Failed to update participants: ${insError.message}`); return }
      }
    }, 400)
  }

  async function handleToggleActive(courtNumber, isActive) {
    setCourts(cs => cs.map(c => c.court_number === courtNumber ? { ...c, is_active: isActive } : c))
    if (!canWrite) return
    await supabase.from('active_courts')
      .update({ is_active: isActive })
      .eq('round_id', roundId)
      .eq('court_number', courtNumber)
  }

  function handleSuggest(algorithmKey) {
    const activeCourts = courts.filter(c => c.is_active).map(c => c.court_number)
    const participatingPlayers = allPlayers.filter(p => participants.has(p.id))
    const mergedOptions = {
      memberPriority: options.memberPriority,
      rotationPriority: options.rotationPriority,
      genderPriority: options.genderPriority,
      mixedDoubles: options.mixedDoubles,
      [algorithmKey]: true,
    }
    const draft = suggest({ participants: participatingPlayers, activeCourts, options: mergedOptions, priorRounds, priorRoundResult, sittingOutCounts })

    if (options.honorBlocks && allBlocks.length > 0) {
      const participantIds = new Set(participatingPlayers.map(p => p.id))
      const blockPairs = new Set(
        allBlocks
          .filter(b => participantIds.has(b.player_id_a) && participantIds.has(b.player_id_b))
          .map(b => `${b.player_id_a}|${b.player_id_b}`)
      )
      const { courts: resolved, violations: newViolations } = resolveBlocks(draft, blockPairs)
      setDraftAssignments(resolved)
      setViolations(newViolations)
    } else {
      setDraftAssignments(draft)
      setViolations([])
    }

    setSwapTarget(null)
    setSuggestKey(k => k + 1)
  }

  function handlePlayerClick(player) {
    if (round?.is_committed) return

    if (player.player_type === 'pro') {
      const alreadyAssigned = draftAssignments.some(
        c => c.team1.some(p => p.id === player.id) || c.team2.some(p => p.id === player.id)
      )
      if (!alreadyAssigned) {
        // Pro is in holding pen — auto-assign to first underfull court
        setSwapTarget(null)
        setDraftAssignments(prev => {
          const target = prev.find(c => c.team1.length + c.team2.length < 4)
          if (!target) return prev
          return prev.map(c => {
            if (c.court_number !== target.court_number) return c
            if (c.team1.length <= c.team2.length) {
              return { ...c, team1: [...c.team1, player] }
            }
            return { ...c, team2: [...c.team2, player] }
          })
        })
        return
      }
      // Pro is already on a court — fall through to normal swap behavior
    }

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
    setFlashedIds(new Set([swapTarget.id, player.id]))
    setTimeout(() => setFlashedIds(new Set()), 700)
    setSwapTarget(null)
    setViolations([])
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

  async function handleNextRound(algorithm) {
    const { data: existingRounds } = await supabase
      .from('rounds').select('round_number').eq('event_id', eventId)
    const nextNum = existingRounds && existingRounds.length > 0
      ? Math.max(...existingRounds.map(r => r.round_number)) + 1
      : round.round_number + 1

    const { data: newRound, error: roundErr } = await supabase
      .from('rounds').insert({ event_id: eventId, round_number: nextNum }).select().single()
    if (roundErr) { alert(`Failed to create round: ${roundErr.message}`); return }

    const { error: courtsErr } = await supabase.from('active_courts').insert(
      courts.map(c => ({ round_id: newRound.id, court_number: c.court_number, is_active: c.is_active }))
    )
    if (courtsErr) { alert(`Failed to create courts: ${courtsErr.message}`); return }

    if (participants.size > 0) {
      const { error: partsErr } = await supabase.from('round_participants').insert(
        [...participants].map(pid => ({ round_id: newRound.id, player_id: pid }))
      )
      if (partsErr) { alert(`Failed to copy participants: ${partsErr.message}`); return }
    }

    // Build current round's result for river mode
    const currentRoundResult = {}
    for (const result of results) {
      const court = committedAssignments.find(c => c.court_number === result.court_number)
      if (court) {
        currentRoundResult[result.court_number] = {
          winners: result.winning_team === 1 ? court.team1 : court.team2,
          losers: result.winning_team === 1 ? court.team2 : court.team1,
        }
      }
    }

    // Include current round in social history
    const currentRoundAsn = {
      assignments: committedAssignments.map(c => ({
        court_number: c.court_number,
        players: [...c.team1, ...c.team2].map(p => p.id),
      })),
    }

    const activeCourts = courts.filter(c => c.is_active).map(c => c.court_number)
    const participatingPlayers = allPlayers.filter(p => participants.has(p.id))

    let nextOptions = {}
    let riverResult = null
    if (algorithm === 'river') {
      nextOptions = { riverMode: true }
      riverResult = currentRoundResult
    } else if (algorithm === 'random') {
      nextOptions = { randomMode: true }
    } else if (algorithm === 'social') {
      nextOptions = { socialPriority: true }
    } else if (algorithm === 'rankPriority') {
      nextOptions = { rankPriority: true }
    }

    const draft = suggest({
      participants: participatingPlayers,
      activeCourts,
      options: nextOptions,
      priorRounds: [...priorRounds, currentRoundAsn],
      priorRoundResult: riverResult,
      sittingOutCounts,
    })

    navigate(`/events/${eventId}/rounds/${newRound.id}`, { state: { draftAssignments: draft } })
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
        {round?.is_committed && (
          <a
            href={`#/events/${eventId}/rounds/${roundId}/display`}
            target="_blank"
            rel="noreferrer"
            className="ml-auto text-xs text-stone-400 hover:text-emerald-600 transition-colors"
          >
            📺 Display
          </a>
        )}
      </div>

      <AlgorithmBar
        options={options}
        onOptionChange={(key, val) => setOptions(o => ({ ...o, [key]: val }))}
        onSuggest={handleSuggest}
        onCommit={handleCommit}
        isCommitted={round?.is_committed}
        canWrite={canWrite}
      />

      {round?.is_committed && canWrite && committedAssignments.length > 0 && results.length >= committedAssignments.length && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 flex items-center gap-3 shrink-0 flex-wrap">
          <span className="text-sm text-emerald-800 font-medium">Round complete! Start next round:</span>
          <div className="flex gap-2">
            <button onClick={() => handleNextRound('river')} title="Winners move up a court, losers move down — based on last round results" className="text-xs bg-white border border-emerald-300 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors">🌊 River</button>
            <button onClick={() => handleNextRound('random')} title="Randomly assign players to courts" className="text-xs bg-white border border-emerald-300 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors">🎲 Random</button>
            <button onClick={() => handleNextRound('social')} title="Minimize repeat court-sharings — maximize variety in who plays together" className="text-xs bg-white border border-emerald-300 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors">👥 Social</button>
            <button onClick={() => handleNextRound('rankPriority')} title="Group players by skill rating so higher-ranked players share courts" className="text-xs bg-white border border-emerald-300 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors">📊 Rank</button>
          </div>
        </div>
      )}

      {swapTarget && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800 text-center shrink-0">
          Tap another player to swap with <strong>{fullName(swapTarget)}</strong>. Tap same player to cancel.
        </div>
      )}

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
          suggestKey={suggestKey}
          flashedIds={flashedIds}
          swapTargetId={swapTarget?.id ?? null}
          violations={options.honorBlocks ? violations : []}
        />
      </div>

    </div>
  )
}
