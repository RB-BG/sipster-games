import { strings } from '@/i18n/strings'

/** De regel-uitleg als definitielijst; gedeeld door de RulesEditor en de RulesScreen. */
export default function RulesExplainer() {
  return (
    <dl className="flex flex-col gap-2">
      {strings.rulesExplain.map(([title, text]) => (
        <div key={title}>
          <dt className="font-semibold text-ivory">{title}</dt>
          <dd>{text}</dd>
        </div>
      ))}
    </dl>
  )
}
