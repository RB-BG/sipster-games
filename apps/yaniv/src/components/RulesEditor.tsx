// Copyright © 2026 Yaniv. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import Coaster from '@/components/Coaster'
import RulesExplainer from '@/components/RulesExplainer'
import type { RuleConfig } from '@/engine/types'
import { cn } from '@/lib/utils'
import { useStrings } from '@/store/localeStore'

interface RulesEditorProps {
  rules: RuleConfig
  /** Alleen-lezen weergave (guests in de lobby). */
  disabled?: boolean
  onChange: (patch: Partial<RuleConfig>) => void
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

/** Aan/uit-schakelaar voor een booleaanse huisregel. */
function Toggle({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string
  value: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between text-ivory">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={cn(
          'flex h-7 w-12 items-center rounded-full p-0.5 transition-colors disabled:opacity-40',
          value ? 'bg-primary' : 'bg-secondary',
        )}
      >
        <span
          className={cn(
            'size-6 rounded-full bg-ivory transition-transform',
            value && 'translate-x-5',
          )}
        />
      </button>
    </div>
  )
}

/** De regelset-instellingen, gedeeld door de P2P-lobby en de hotseat-setup. */
export default function RulesEditor({ rules, disabled, onChange }: RulesEditorProps) {
  const strings = useStrings()
  return (
    <Coaster className="flex flex-col gap-3">
      <h2 className="text-sm text-muted-foreground">{strings.rulesTitle}</h2>

      <Stepper
        label={strings.ruleLabels.handSize}
        value={rules.handSize}
        min={2}
        max={7}
        disabled={disabled}
        onChange={(v) => onChange({ handSize: v })}
      />

      <Stepper
        label={strings.ruleLabels.yousefMax}
        value={rules.yousefMax}
        min={3}
        max={10}
        disabled={disabled}
        onChange={(v) => onChange({ yousefMax: v })}
      />

      <Stepper
        label={strings.ruleLabels.bakThreshold}
        value={rules.bakThreshold}
        min={10}
        max={60}
        disabled={disabled}
        onChange={(v) => onChange({ bakThreshold: v })}
      />

      <Toggle
        label={strings.ruleLabels.jokerWildcard}
        value={rules.jokerWildcard}
        disabled={disabled}
        onChange={(v) => onChange({ jokerWildcard: v })}
      />

      <Toggle
        label={strings.ruleLabels.assafEveryoneScores}
        value={rules.assafEveryoneScores}
        disabled={disabled}
        onChange={(v) => onChange({ assafEveryoneScores: v })}
      />

      <details className="text-sm text-muted-foreground">
        <summary className="cursor-pointer">{strings.rulesExplainTitle}</summary>
        <div className="mt-2">
          <RulesExplainer />
        </div>
      </details>
    </Coaster>
  )
}
