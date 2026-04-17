import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './useAuth'

const RankingsContext = createContext(true)

export function RankingsProvider({ children }) {
  const session = useAuth()
  const [showRankings, setShowRankings] = useState(!!session)

  // Sync with session: force-show on login, force-hide on logout
  useEffect(() => {
    setShowRankings(!!session)
  }, [!!session]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleRankings() {
    if (session) setShowRankings(v => !v)
  }

  return (
    <RankingsContext.Provider value={{ showRankings, toggleRankings }}>
      {children}
    </RankingsContext.Provider>
  )
}

export function useRankings() {
  return useContext(RankingsContext)
}
