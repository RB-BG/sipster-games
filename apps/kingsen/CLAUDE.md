# Kingsen: project-configuratie

Webbased versie van het kaart-borrelspel Kingsen ("kings cup / ring of fire"). P2P multiplayer, 2.5D-speelkaarten, mobile-first, meertalige UI (NL + EN). Geforkt van de architectuur van het zusterspel Bussen; alleen het spel en de branding verschillen, de app-structuur is gelijk.

## Plan & voortgang

Kingsen kent één speelronde: de cirkel van 52 kaarten wordt kloksgewijs afgegaan, elke rang triggert een actie, en de 4e koning eindigt het potje. Zie `docs/plan.md` voor de chunk-indeling. Werk per feature op een eigen branch en rond volledig af (lint/build/test groen + commit + merge naar main met `--no-ff`) voor je aan het volgende begint.

**De spelregels in `docs/kingsen-regels.md` zijn de bron van waarheid voor de engine.** Wijk daar niet stiekem van af omdat een andere kings-cup-variant het anders doet.

## Git-regels

- Committen en pushen mag alleen naar déze repo (sipster-games). Nooit naar andere repositories.
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
- `src/net/` importeert engine + protocol. React-lagen (`store/`, `screens/`, `cards/`, `components/`) worden nooit door engine/net geïmporteerd.
- Host is authoritative: intents in, validate -> reduce -> broadcast volledige GameState. Uitkomsten (de geschudde deck) komen van crypto.getRandomValues op de host; mulberry32 is alleen voor animatie-seeds.
- Transport zit achter het `Transport`-interface zodat PeerJS later verwisselbaar is.

## Patronen & valkuilen

- **viewState-freeze**: beide stores exposen naast de echte state een `viewState` die één animatie achterloopt; de UI rendert altijd viewState zodat chips/overlays de kaart-uitslag niet verklappen. Effecten hangen aan viewState-wissels en vuren daardoor precies op het reveal-moment, in hotseat én multiplayer.
- **Pending-input** (koning: cup vullen; rang 5: nieuwe regel typen) blokkeert de volgende flip tot de actieve speler het afhandelt, exact zoals `pendingGive` de piramide in bussen blokkeert.
- **Claude-preview-beperking**: de preview-browser draait in een verborgen tab waar requestAnimationFrame 0 frames vuurt. Framer-motion-animaties en screenshots werken daar niet; het spelverloop hangt bewust op setTimeout en is er wél testbaar. Animaties alleen op een echt device beoordelen.
- Dev-speeltuinen: `/?debug` (engine bespelen zonder UI) en `/?cards` (kaart-animatie met instelbare uitkomst).

## Code & stijl

- Stack: React 19, TypeScript, Vite 8, Tailwind 4, shadcn (base-nova), zustand, framer-motion, PeerJS. Speelkaarten zijn 2.5D CSS-3D-flips in `src/cards/` (geen WebGL); de uitkomst blijft host-authoritative, de flip-animatie is puur cosmetisch en landt altijd op de juiste kaart.
- Huisstijl "Koningspaars": diep violet/indigo met goud + karmijnrood accenten. De theme-tokens dragen nog de fork-namen (`night`/`cyan`/`magenta`) maar de royale waarden.
- Leesbaarheid boven slimmigheid; comments alleen voor niet-voor-de-hand-liggende WHY.
- Alle UI-teksten in `src/i18n/strings.ts`. `nl` is de bron van waarheid; `type Strings = typeof nl` dwingt af dat elke taal (nu ook `en`) dezelfde keys en functie-signaturen heeft. Een nieuwe tekst voeg je in álle talen toe (anders faalt de build). Componenten lezen via `useStrings()` uit `store/localeStore`; buiten React (bv. `netStore`) via `useLocaleStore.getState().strings`. Nooit direct uit `nl`/`en` importeren in de UI, anders wisselt de taal niet live.
- Geen em dashes in gegenereerde teksten; gebruik komma, dubbele punt of haakjes.
- Nieuwe packages alleen als ze in het plan staan; anders eerst vragen.
