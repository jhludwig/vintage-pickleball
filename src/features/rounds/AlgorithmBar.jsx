const EXCLUSIVE = [
  { key: 'randomMode', label: 'Random' },
  { key: 'rankPriority', label: 'Ranking' },
  { key: 'socialPriority', label: 'Social' },
  { key: 'mixedPriority', label: 'Mixed' },
  { key: 'riverMode', label: 'River' },
]

const GENDER_OPTIONS = [
  { key: 'genderPriority', label: 'Single Gender' },
  { key: 'mixedDoubles', label: 'Mixed Doubles' },
  { key: null, label: 'Any Gender' },
]

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-stone-600 cursor-pointer whitespace-nowrap">
      <input type="checkbox" checked={checked} onChange={onChange} className="accent-emerald-600" />
      {label}
    </label>
  )
}

export default function AlgorithmBar({ options, onOptionChange, onSuggest, onCommit, isCommitted, canWrite }) {
  function handleExclusive(key, checked) {
    EXCLUSIVE.forEach(cb => onOptionChange(cb.key, false))
    if (checked) onOptionChange(key, true)
  }

  function handleGender(key) {
    onOptionChange('genderPriority', false)
    onOptionChange('mixedDoubles', false)
    if (key) onOptionChange(key, true)
  }

  const noGenderOption = !options.genderPriority && !options.mixedDoubles

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

      <div className="flex-1 flex items-center gap-2 flex-wrap justify-center">
        <Checkbox
          label="Member Priority"
          checked={!!options.memberPriority}
          onChange={e => onOptionChange('memberPriority', e.target.checked)}
        />

        {/* Mutually exclusive ordering group */}
        <div className="flex items-center gap-2 flex-wrap bg-stone-100 border border-stone-300 rounded-lg px-2 py-1">
          {EXCLUSIVE.map(cb => (
            <Checkbox
              key={cb.key}
              label={cb.label}
              checked={!!options[cb.key]}
              onChange={e => handleExclusive(cb.key, e.target.checked)}
            />
          ))}
        </div>

        {/* Mutually exclusive gender group */}
        <div className="flex items-center gap-2 flex-wrap bg-stone-100 border border-stone-300 rounded-lg px-2 py-1">
          {GENDER_OPTIONS.map(opt => (
            <Checkbox
              key={opt.key ?? '__any__'}
              label={opt.label}
              checked={opt.key === null ? noGenderOption : !!options[opt.key]}
              onChange={() => handleGender(opt.key)}
            />
          ))}
        </div>
      </div>

      {canWrite && !isCommitted && (
        <button
          onClick={onCommit}
          className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shrink-0"
        >
          Commit Round
        </button>
      )}
    </div>
  )
}
