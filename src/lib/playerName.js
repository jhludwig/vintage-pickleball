export function fullName(player) {
  return `${player.first_name} ${player.last_name}`.trim()
}

export function ratingTierClass(ranking) {
  const r = parseFloat(ranking)
  if (isNaN(r) || r < 2.5) return 'border-l-stone-300'
  if (r >= 5.5) return 'border-l-purple-500'
  if (r >= 4.5) return 'border-l-blue-500'
  if (r >= 3.5) return 'border-l-emerald-500'
  return 'border-l-amber-400'
}
