import Coaster from '@/components/Coaster'
import type { RuleConfig } from '@/engine/types'
import { strings } from '@/i18n/strings'

const TOGGLE_KEYS = [
  'tempo',
  'omgekeerdeMex',
  'ridder',
  'dubbeleRidder',
  'afslaan',
  'tiebreakHoogsteVerliest',
] as const

interface RulesEditorProps {
  rules: RuleConfig
  /** Alleen-lezen weergave (guests in de lobby). */
  disabled?: boolean
  onChange: (patch: Partial<RuleConfig>) => void
  /** Toggles die in deze modus geen zin hebben (bv. afslaan bij hotseat). */
  hideKeys?: readonly (typeof TOGGLE_KEYS)[number][]
  /** Kleine voetnoot onder de toggles. */
  note?: string
}

/** De regelset-instellingen, gedeeld door de P2P-lobby en de hotseat-setup. */
export default function RulesEditor({ rules, disabled, onChange, hideKeys, note }: RulesEditorProps) {
  return (
    <Coaster className="flex flex-col gap-3">
      <h2 className="text-sm text-muted-foreground">{strings.rulesTitle}</h2>

      <div className="flex items-center justify-between text-ivory">
        <span>{strings.ruleLabels.standaardSlokken}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={disabled || rules.standaardSlokken <= 1}
            onClick={() => onChange({ standaardSlokken: rules.standaardSlokken - 1 })}
            className="size-8 rounded-lg bg-secondary text-secondary-foreground disabled:opacity-40"
          >
            −
          </button>
          <span className="w-6 text-center font-semibold">{rules.standaardSlokken}</span>
          <button
            type="button"
            disabled={disabled || rules.standaardSlokken >= 6}
            onClick={() => onChange({ standaardSlokken: rules.standaardSlokken + 1 })}
            className="size-8 rounded-lg bg-secondary text-secondary-foreground disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>

      {TOGGLE_KEYS.filter((key) => !hideKeys?.includes(key)).map((key) => (
        <label key={key} className="flex items-center justify-between text-ivory">
          <span>{strings.ruleLabels[key]}</span>
          <input
            type="checkbox"
            checked={rules[key]}
            disabled={disabled}
            onChange={(e) => onChange({ [key]: e.target.checked })}
            className="size-5 accent-amber-warm"
          />
        </label>
      ))}

      {note && <p className="text-xs text-muted-foreground">{note}</p>}

      <details className="text-sm text-muted-foreground">
        <summary className="cursor-pointer">{strings.rulesExplainTitle}</summary>
        <dl className="mt-2 flex flex-col gap-2">
          {strings.rulesExplain.map(([title, text]) => (
            <div key={title}>
              <dt className="font-semibold text-ivory">{title}</dt>
              <dd>{text}</dd>
            </div>
          ))}
        </dl>
      </details>
    </Coaster>
  )
}
