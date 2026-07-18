// Copyright © 2026 Sipster. PolyForm Noncommercial License 1.0.0 (see LICENSE).

/** De regel-uitleg als definitielijst; de app levert [titel, tekst]-paren uit zijn strings. */
export default function RulesExplainer({ entries }: { entries: ReadonlyArray<readonly string[]> }) {
  return (
    <dl className="flex flex-col gap-2">
      {entries.map(([title, text]) => (
        <div key={title}>
          <dt className="font-semibold text-ivory">{title}</dt>
          <dd>{text}</dd>
        </div>
      ))}
    </dl>
  )
}
