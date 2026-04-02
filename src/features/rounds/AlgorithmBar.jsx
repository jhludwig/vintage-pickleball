const EXCLUSIVE = [
  { key: 'rankPriority', label: 'Ranking' },
  { key: 'socialPriority', label: 'Social' },
  { key: 'mixedPriority', label: 'Mixed' },
  { key: 'riverMode', label: 'River' },
]

export default function AlgorithmBar({ options, onOptionChange, onSuggest, onCommit, isCommitted, canWrite }) {
  function handleExclusive(key, checked) {
    EXCLUSIVE.forEach(cb => onOptionChange(cb.key, false))
    if (checked) onOptionChange(key, true)
  }

  return (
    <div className="bg-stone-50 border-b border-stone-200 px-3 py-2 flex items-center gap-2 flex-wrap">
      {canWrite && (
        <button
          onClick={onSuggest}
          className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shrink-0"
        >
          ✨ Suggest
        </button>
      )}
      <div className="flex items-center gap-3 flex-1 justify-center flex-wrap">
        <label className="flex items-center gap-1.5 text-xs text-stone-600 cursor-pointer">
          <input
            type="checkbox"
            checked={!!options.memberPriority}
            onChange={e => onOptionChange('memberPriority', e.target.checked)}
            className="accent-emerald-600"
          />
          Member Priority
        </label>

        <div className="w-px h-4 bg-stone-300 shrink-0" />

        {EXCLUSIVE.map(cb => (
          <label key={cb.key} className="flex items-center gap-1.5 text-xs text-stone-600 cursor-pointer">
            <input
              type="checkbox"
              checked={!!options[cb.key]}
              onChange={e => handleExclusive(cb.key, e.target.checked)}
              className="accent-emerald-600"
            />
            {cb.label}
          </label>
        ))}

        <div className="w-px h-4 bg-stone-300 shrink-0" />

        <label className="flex items-center gap-1.5 text-xs text-stone-600 cursor-pointer">
          <input
            type="checkbox"
            checked={!!options.genderPriority}
            onChange={e => onOptionChange('genderPriority', e.target.checked)}
            className="accent-emerald-600"
          />
          Gender Sorting
        </label>
      </div>

      {canWrite && !isCommitted && (
        <>
          <div className="w-px h-6 bg-stone-300 shrink-0" />
          <button
            onClick={onCommit}
            className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shrink-0"
          >
            Commit Round
          </button>
        </>
      )}
    </div>
  )
}
