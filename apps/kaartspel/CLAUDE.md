# Kaartspel (werknaam): project-configuratie

Webbased versie van het kaart-borrelspel *Yousef* (uit de Yaniv-familie: hand van 5 kaarten, laag houden, "Yousef" roepen bij handwaarde < 5). P2P multiplayer, 2.5D-speelkaarten, mobile-first, meertalige UI (NL + EN). Geforkt van de architectuur van het zusterspel Kingsen; alleen het spel en de branding verschillen, de app-structuur is gelijk.

**`kaartspel` is een werknaam.** Definitieve branding (naam, domein, appId `games.sipster.kaartspel`, kleurthema) volgt in de polish-chunk. Het thema draagt nu nog de kingsen-waarden ("Koningspaars").

## Plan & voortgang

Yousef speelt in beurten: afleggen (los/set/straat), één kaart trekken, en "Yousef" roepen bij een lage hand. Punten stapelen cumulatief; boven de 30 trek je een bak. Zie `docs/plan.md` voor de chunk-indeling en voortgang. Werk per feature op een eigen branch en rond volledig af (lint/build/test groen + commit + merge naar main met `--no-ff`) voor je aan het volgende begint.

**De spelregels in `docs/kaartspel-regels.md` zijn de bron van waarheid voor de engine.** Wijk daar niet stiekem van af omdat een andere Yaniv/Yousef-variant het anders doet.

> **Scaffold-status.** De engine is nu nog een kingsen-kloon (cirkel van 52 kaarten). De Yousef-engine wordt in chunk 2 gebouwd; tot dan draait de app als tijdelijke kloon onder de nieuwe naam en namespaces.

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

- **Unieke namespaces**: `PEER_PREFIX` (`kaartspel-`), locale-sleutel (`kaartspel.locale`), sound mute-sleutel (`kaartspel.muted`), storage-sleutels (`kaartspel.profile`/`kaartspel.rules`). Wijzig deze nooit terug naar een gedeelde waarde, anders botsen de apps op dezelfde PeerJS-broker/origin.
- **viewState-freeze**: de stores exposen naast de echte state een `viewState` die één animatie achterloopt; de UI rendert altijd viewState zodat chips/overlays de kaart-uitslag niet verklappen.
- **Hotseat-privacy**: bij één telefoon hoort een afscherm-scherm tussen de beurten ("geef de telefoon door"), zodat de volgende speler de hand van de vorige niet ziet.
- **Claude-preview-beperking**: de preview-browser draait in een verborgen tab waar requestAnimationFrame 0 frames vuurt. Framer-motion-animaties en screenshots werken daar niet; het spelverloop hangt bewust op setTimeout en is er wél testbaar. Animaties alleen op een echt device beoordelen.
- Dev-speeltuinen: `/?debug` (engine bespelen zonder UI) en `/?cards` (kaart-animatie met instelbare uitkomst).

## Code & stijl

- Stack: React 19, TypeScript, Vite 8, Tailwind 4, shadcn (base-nova), zustand, framer-motion, PeerJS. Speelkaarten zijn 2.5D CSS-3D-flips in `src/cards/` (geen WebGL); de uitkomst blijft host-authoritative, de flip-animatie is puur cosmetisch en landt altijd op de juiste kaart.
- Leesbaarheid boven slimmigheid; comments alleen voor niet-voor-de-hand-liggende WHY.
- Alle UI-teksten in `src/i18n/strings.ts`. `nl` is de bron van waarheid; `type Strings = typeof nl` dwingt af dat elke taal (nu ook `en`) dezelfde keys en functie-signaturen heeft. Een nieuwe tekst voeg je in álle talen toe (anders faalt de build). Componenten lezen via `useStrings()` uit `store/localeStore`; buiten React (bv. `netStore`) via `useLocaleStore.getState().strings`. Nooit direct uit `nl`/`en` importeren in de UI, anders wisselt de taal niet live.
- Geen em dashes in gegenereerde teksten; gebruik komma, dubbele punt of haakjes.
- Nieuwe packages alleen als ze in het plan staan; anders eerst vragen.
