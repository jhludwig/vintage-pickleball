import { useState } from 'react'

const COLS = [
  { key: 'name', label: 'Name' },
  { key: 'player_type', label: 'Type' },
  { key: 'gender', label: 'Gender' },
  { key: 'ranking', label: 'Ranking' },
  { key: 'plays_pickleball', label: 'Active' },
]

function sortPlayers(players, col, dir) {
  return [...players].sort((a, b) => {
    let av = a[col], bv = b[col]
    if (col === 'ranking') {
      av = parseFloat(av) || -1
      bv = parseFloat(bv) || -1
      return dir === 'asc' ? av - bv : bv - av
    }
    if (col === 'plays_pickleball') {
      av = av ? 1 : 0; bv = bv ? 1 : 0
      return dir === 'asc' ? av - bv : bv - av
    }
    av = String(av).toLowerCase(); bv = String(bv).toLowerCase()
    return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
  })
}

export default function PlayerTable({ players, onRowClick }) {
  const [sortCol, setSortCol] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  function handleSort(col) {
    if (col === sortCol) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const sorted = sortPlayers(players, sortCol, sortDir)
  const arrow = sortDir === 'asc' ? '↑' : '↓'

  return (
    <div className="mx-4 mt-3 bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200">
              {COLS.map(c => (
                <th
                  key={c.key}
                  onClick={() => handleSort(c.key)}
                  className="px-3 py-2.5 text-left font-semibold text-stone-500 text-xs uppercase tracking-wide cursor-pointer select-none whitespace-nowrap hover:text-stone-700 transition-colors"
                >
                  {c.label} {sortCol === c.key ? <span className="text-emerald-500">{arrow}</span> : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {sorted.map(p => (
              <tr
                key={p.id}
                onClick={() => onRowClick(p)}
                className="hover:bg-stone-50 cursor-pointer transition-colors"
              >
                <td className="px-3 py-2.5 font-medium text-stone-800">{p.name}</td>
                <td className="px-3 py-2.5 capitalize text-stone-600">{p.player_type}</td>
                <td className="px-3 py-2.5 text-stone-600">{p.gender}</td>
                <td className="px-3 py-2.5 text-stone-600">{p.ranking}</td>
                <td className="px-3 py-2.5 text-emerald-500">{p.plays_pickleball ? '✓' : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
