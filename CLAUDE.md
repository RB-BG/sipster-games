# Mexxen: project-configuratie

Webbased versie van het borrelspel mexen (Utrechtse variant). P2P multiplayer, 2.5D-dobbelstenen, mobile-first, Nederlandse UI.

## Plan & voortgang

Het oorspronkelijke 8-chunk-plan (`docs/plan.md`) is volledig afgerond en daarna doorontwikkeld: 2.5D CSS-dice i.p.v. WebGL, game-feel-effecten, einde-potje-flow, regels in hotseat en huisregel-aanpassingen uit de veldtest. Werk per feature op een eigen branch en rond volledig af (lint/build/test groen + commit + merge naar main) voor je aan het volgende begint.

**De spelregels in `docs/mexxen-regels.md` zijn de bron van waarheid voor de engine**, inclusief Rubens huisregels die afwijken van de oorspronkelijke bijbel-PDF (32 beëindigt de beurt direct behalve met afslaan aan; een gedwongen vroeg einde van de eerste speler zet het worpen-maximum, ook zonder tempo-toggle). Niet "terugfixen" naar de PDF.

## Git-regels

- Committen en pushen mag alleen naar déze repo (mexxen). Nooit naar andere repositories.
- Geen directe commits op `main`; werk op feature branches en merge met `--no-ff`.
- Nooit force pushen zonder te vragen. Nooit bestanden verwijderen zonder bevestiging.
- Conventional commits met emoji: ✨ feat, 🐛 fix, 📝 docs, ♻️ refactor, ✅ test, 🔧 chore.
- Atomair committen: één logische wijziging per commit.

## Commando's

- `npm run dev`: dev-server
- `npm run build`: typecheck + productie-build
- `npm run lint`: ESLint (altijd draaien na codewijzigingen)
- `npm run test`: vitest (engine-tests, node environment)

## Architectuur (niet onderhandelbaar)

- `src/engine/` en `src/protocol/` zijn puur: geen React-, DOM- of transport-imports. Alle spellogica leeft hier en is vitest-gedekt.
- `src/net/` importeert engine + protocol. React-lagen (`store/`, `screens/`, `dice/`, `components/`) worden nooit door engine/net geïmporteerd.
- Host is authoritative: intents in, validate -> reduce -> broadcast volledige GameState. Uitkomsten komen van crypto.getRandomValues op de host; mulberry32 is alleen voor animatie-seeds.
- Transport zit achter het `Transport`-interface zodat PeerJS later verwisselbaar is.

## Patronen & valkuilen

- **viewState-freeze**: beide stores exposen naast de echte state een `viewState` die één animatie achterloopt; de UI rendert altijd viewState zodat chips/overlays de worp-uitslag niet verklappen. Effecten (drink-shots, ridder-pop) hangen aan viewState-wissels (sipsLog-lengte, ridderId) en vuren daardoor precies op het reveal-moment, in hotseat én multiplayer.
- **Kamp-worp**: alleen een roll met `single: true` (tiebreak) toont één losse steen; elke gewone worp toont de gecombineerde score van beide stenen, ook met een vastliggende 1/2.
- **Claude-preview-beperking**: de preview-browser draait in een verborgen tab waar requestAnimationFrame 0 frames vuurt. Framer-motion-animaties, WebGL en screenshots werken daar niet; het spelverloop hangt bewust op setTimeout en is er wél testbaar. Animaties alleen op een echt device beoordelen; DOM-polling via preview_eval is de manier om effecten te verifiëren.
- Dev-speeltuinen: `/?debug` (engine bespelen zonder UI) en `/?dice` (dice-animatie met instelbare uitkomst).

## Code & stijl

- Stack: React 19, TypeScript, Vite 8, Tailwind 4, shadcn (base-nova), zustand, framer-motion, PeerJS. Dobbelstenen zijn 2.5D CSS-3D-kubussen in `src/dice/` (geen WebGL); de uitkomst blijft host-authoritative, de tuimel-animatie is puur cosmetisch en landt altijd op de juiste waarde.
- Leesbaarheid boven slimmigheid; comments alleen voor niet-voor-de-hand-liggende WHY.
- Alle UI-teksten in `src/i18n/strings.ts`, Nederlands.
- Geen em dashes in gegenereerde teksten; gebruik komma, dubbele punt of haakjes.
- Nieuwe packages alleen als ze in het plan staan; anders eerst vragen.
