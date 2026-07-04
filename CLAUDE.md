# Mexxen: project-configuratie

Webbased versie van het borrelspel mexen (Utrechtse variant). P2P multiplayer, 3D-dobbelstenen, mobile-first, Nederlandse UI.

## Plan & voortgang

Het volledige goedgekeurde plan staat in `C:\Users\RubenBaggen\.claude\plans\ik-wil-een-webbased-jiggly-hamming.md`. De spelregels staan in `docs/mexxen-regels.md`. Werk altijd chunk voor chunk; rond een chunk volledig af (lint/build/test groen + commit) voor je aan de volgende begint.

- [x] Chunk 1: Scaffold + deploy pipeline
- [ ] Chunk 2: Pure game engine + tests
- [ ] Chunk 3: 3D dobbelstenen op de kroegtafel
- [ ] Chunk 4: Pass-the-phone basisspel (go/no-go)
- [ ] Chunk 5: P2P lobby
- [ ] Chunk 6: Multiplayer basisspel
- [ ] Chunk 7: Extra rulesets (tempo, omgekeerde mex, ridder, afslaan)
- [ ] Chunk 8: Polish (shake-to-roll, geluid, PWA)

## Git-regels

- Committen en pushen mag alleen naar déze repo (mexxen). Nooit naar andere repositories.
- Na de initiële scaffold: geen directe commits op `main`; werk op feature branches (`chunk-N-korte-naam`).
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
- `src/net/` importeert engine + protocol. React-lagen (`store/`, `screens/`, `game3d/`, `components/`) worden nooit door engine/net geïmporteerd.
- Host is authoritative: intents in, validate -> reduce -> broadcast volledige GameState. Uitkomsten komen van crypto.getRandomValues op de host; mulberry32 is alleen voor animatie-seeds.
- Transport zit achter het `Transport`-interface zodat PeerJS later verwisselbaar is.

## Code & stijl

- Stack: React 19, TypeScript, Vite 8, Tailwind 4, shadcn (base-nova), zustand, R3F + rapier, PeerJS.
- Leesbaarheid boven slimmigheid; comments alleen voor niet-voor-de-hand-liggende WHY.
- Alle UI-teksten in `src/i18n/strings.ts`, Nederlands.
- Geen em dashes in gegenereerde teksten; gebruik komma, dubbele punt of haakjes.
- Nieuwe packages alleen als ze in het plan staan; anders eerst vragen.
