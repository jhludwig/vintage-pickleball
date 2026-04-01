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
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-100 text-left">
            {COLS.map(c => (
              <th
                key={c.key}
                onClick={() => handleSort(c.key)}
                className="px-3 py-2 font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap"
              >
                {c.label} {sortCol === c.key ? arrow : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(p => (
            <tr
              key={p.id}
              onClick={() => onRowClick(p)}
              className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
            >
              <td className="px-3 py-2">{p.name}</td>
              <td className="px-3 py-2 capitalize">{p.player_type}</td>
              <td className="px-3 py-2">{p.gender}</td>
              <td className="px-3 py-2">{p.ranking}</td>
              <td className="px-3 py-2">{p.plays_pickleball ? '✓' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
