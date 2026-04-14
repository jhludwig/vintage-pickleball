const ALGORITHMS = [
  { key: 'randomMode', label: 'Random', icon: '🎲', tooltip: 'Randomly assign players to courts' },
  { key: 'rankPriority', label: 'Rank', icon: '📊', tooltip: 'Group players by skill rating so higher-ranked players share courts' },
  { key: 'socialPriority', label: 'Social', icon: '👥', tooltip: 'Minimize repeat court-sharings — maximize variety in who plays together' },
  { key: 'riverMode', label: 'River', icon: '🌊', tooltip: 'Winners move up a court, losers move down — based on last round results' },
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
  function handleGender(key) {
    onOptionChange('genderPriority', false)
    onOptionChange('mixedDoubles', false)
    if (key) onOptionChange(key, true)
  }

  const noGenderOption = !options.genderPriority && !options.mixedDoubles

  return (
    <div className="bg-stone-50 border-b border-stone-200 px-3 py-2 flex items-center gap-2 flex-wrap">
      {canWrite && !isCommitted && (
        <div className="flex gap-1.5 flex-wrap shrink-0">
          {ALGORITHMS.map(alg => (
            <button
              key={alg.key}
              onClick={() => onSuggest(alg.key)}
              title={alg.tooltip}
              className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              {alg.icon} {alg.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 flex items-center gap-2 flex-wrap justify-center">
        <Checkbox
          label="Member Priority"
          checked={!!options.memberPriority}
          onChange={e => onOptionChange('memberPriority', e.target.checked)}
        />

        <Checkbox
          label="Rotation"
          checked={!!options.rotationPriority}
          onChange={e => onOptionChange('rotationPriority', e.target.checked)}
        />

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
