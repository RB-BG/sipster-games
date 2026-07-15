// Copyright © 2026 Kingsen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import Coaster from '@/components/Coaster'
import RulesExplainer from '@/components/RulesExplainer'
import type { RuleConfig } from '@/engine/types'
import { useStrings } from '@/store/localeStore'

const TOGGLE_KEYS = ['bluffen'] as const

interface RulesEditorProps {
  rules: RuleConfig
  /** Alleen-lezen weergave (guests in de lobby). */
  disabled?: boolean
  onChange: (patch: Partial<RuleConfig>) => void
  /** Toggles die in deze modus geen zin hebben. */
  hideKeys?: readonly (typeof TOGGLE_KEYS)[number][]
  /** Kleine voetnoot onder de toggles. */
  note?: string
}

/** Stepper voor een numerieke regel. */
function Stepper({
  label,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  disabled?: boolean
  onChange: (value: number) => void
}) {
  return (
    <div className="flex items-center justify-between text-ivory">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled || value <= min}
          onClick={() => onChange(value - 1)}
          className="size-8 rounded-lg bg-secondary text-secondary-foreground disabled:opacity-40"
        >
          −
        </button>
        <span className="w-6 text-center font-semibold">{value}</span>
        <button
          type="button"
          disabled={disabled || value >= max}
          onClick={() => onChange(value + 1)}
          className="size-8 rounded-lg bg-secondary text-secondary-foreground disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  )
}

/** De regelset-instellingen, gedeeld door de P2P-lobby en de hotseat-setup. */
export default function RulesEditor({ rules, disabled, onChange, hideKeys, note }: RulesEditorProps) {
  const strings = useStrings()
  return (
    <Coaster className="flex flex-col gap-3">
      <h2 className="text-sm text-muted-foreground">{strings.rulesTitle}</h2>

      <Stepper
        label={strings.ruleLabels.standaardSlokken}
        value={rules.standaardSlokken}
        min={1}
        max={6}
        disabled={disabled}
        onChange={(v) => onChange({ standaardSlokken: v })}
      />
      <Stepper
        label={strings.ruleLabels.busLengte}
        value={rules.busLengte}
        min={2}
        max={8}
        disabled={disabled}
        onChange={(v) => onChange({ busLengte: v })}
      />

      {TOGGLE_KEYS.filter((key) => !hideKeys?.includes(key)).map((key) => (
        <label key={key} className="flex items-center justify-between text-ivory">
          <span>{strings.ruleLabels[key]}</span>
          <input
            type="checkbox"
            checked={rules[key]}
            disabled={disabled}
            onChange={(e) => onChange({ [key]: e.target.checked })}
            className="size-5 accent-cyan"
          />
        </label>
      ))}

      {note && <p className="text-xs text-muted-foreground">{note}</p>}

      <details className="text-sm text-muted-foreground">
        <summary className="cursor-pointer">{strings.rulesExplainTitle}</summary>
        <div className="mt-2">
          <RulesExplainer />
        </div>
      </details>
    </Coaster>
  )
}
