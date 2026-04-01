const CHECKBOXES = [
  { key: 'memberPriority', label: 'Member Priority' },
  { key: 'genderPriority', label: 'Gender Priority' },
  { key: 'rankPriority', label: 'Rank Priority' },
  { key: 'socialPriority', label: 'Social Priority' },
  { key: 'mixedPriority', label: 'Mixed Priority' },
  { key: 'riverMode', label: 'River Mode' },
]

export default function AlgorithmBar({ options, onOptionChange, onSuggest, onCommit, isCommitted, canWrite }) {
  return (
    <div className="bg-blue-50 border-b border-blue-100 px-3 py-2 flex items-center gap-2 flex-wrap">
      {canWrite && (
        <button
          onClick={onSuggest}
          className="bg-blue-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium shrink-0"
        >
          ✨ Suggest
        </button>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 flex-1 justify-center">
        {CHECKBOXES.map(cb => (
          <label key={cb.key} className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={!!options[cb.key]}
              onChange={e => onOptionChange(cb.key, e.target.checked)}
            />
            {cb.label}
          </label>
        ))}
      </div>
      {canWrite && !isCommitted && (
        <>
          <div className="w-px h-6 bg-blue-200 shrink-0" />
          <button
            onClick={onCommit}
            className="bg-green-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium shrink-0"
          >
            Commit Round
          </button>
        </>
      )}
    </div>
  )
}
