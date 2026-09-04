# sipster-games: monorepo-configuratie

Monorepo voor de Sipster borrelspellen. npm workspaces + Turborepo. Elke app is een
losstaande build met een eigen Vercel-site en een eigen Capacitor-app (eigen appId,
domein en release); gedeelde, spel-agnostische code leeft in `packages/core`.

Elke app heeft een eigen `apps/<naam>/CLAUDE.md` met spel-specifieke details; **lees die
ook** als je aan één app werkt. Dit bestand beschrijft wat voor de hele repo geldt.

## Apps & packages
- `apps/mexxen` — Mexxen (dobbelspel), appId `nl.mexxen.app`, domein `mex.sipster.games`.
- `apps/bussen` — Bussen (kaartspel, ride the bus), appId `games.sipster.bussen`, domein `bus.sipster.games`.
- `apps/kingsen` — Kingsen (kaartspel, kings cup), appId `games.sipster.kingsen`, domein `king.sipster.games`.
- `apps/yaniv` — Yaniv (kaartspel uit de Yaniv/Yousef-familie), appId `games.sipster.yaniv`, domein `yaniv.sipster.games`. Geforkt van kingsen; eigen engine (zie `apps/yaniv/docs/plan.md`).
- `packages/core` — `@sipster/core`, de echt gedeelde laag (zie hieronder).

## Commando's
- Root (via Turborepo, alle workspaces): `npm run dev` / `npm run build` / `npm run test` / `npm run lint`.
- Gericht per app: voeg `-w @sipster/<naam>` toe, bv. `npm run build -w @sipster/kingsen`.
- Draai na codewijzigingen altijd minstens `lint`, `test` en `build` van de geraakte app.

## Gedeelde architectuur (geldt voor alle drie de apps)
De apps delen dezelfde gelaagde, host-authoritative opzet (bussen en kingsen zijn uit
mexxen geforkt):
- `src/engine/` en `src/protocol/` zijn **puur**: geen React-, DOM- of transport-imports.
  Alle spellogica leeft hier en is vitest-gedekt.
- `src/net/` importeert engine + protocol. De React-lagen (`store/`, `screens/`, `cards/` of
  `dice/`, `components/`) worden nooit door engine/net geïmporteerd.
- **Host is authoritative**: intents in, `validate -> reduce -> broadcast` van de volledige
  GameState. Uitkomsten (geschudde deck / dobbelworp) komen van `crypto.getRandomValues` op de
  host; `mulberry32` is alleen voor animatie-seeds.
- **viewState-freeze**: de stores exposen naast de echte state een `viewState` die één animatie
  achterloopt; de UI rendert altijd viewState zodat overlays de uitslag niet verklappen.
- Transport zit achter het `Transport`-interface zodat PeerJS verwisselbaar blijft.

## `@sipster/core`: wat er in zit, en waar de grens ligt
Core levert de spel-agnostische bouwstenen; apps gebruiken **dunne re-export-adapters**
(bv. `apps/*/src/components/Coaster.tsx` is één `export`-regel) zodat call-sites niet wijzigen.

In core: `utils` (`cn`), `seededRng` (`mulberry32`), `sound` (WebAudio-synth via
`configureSound(muteKey)` + neutrale toon-namen), `haptics`, `storage` (`createStorage`),
`useWakeLock`, `Coaster`, `effects/DrinkShots`, `localeStore` (`createLocaleStore`-factory),
en de geparameteriseerde componenten `QrShare` (QR-kleuren/kader via props), `LocaleSwitch`
(actieve-tab-accent via prop) en `RulesExplainer` ([titel, tekst]-paren via props).
Daarnaast `cards/*` (types, rng, deck, display, dealAnim, `Card`): de spel-agnostische
kaartlaag die bussen en kingsen delen; beide apps hebben dunne re-export-adapters in
`engine/` en `cards/`. In `cards/assets/faces/` staan de 52 kaartillustraties (rang +
suit). Het zijn **alfamaskers, geen gekleurde plaatjes**: `Card.tsx` zet ze als
`mask-image` op `.card-art` en de app kleurt ze via `currentColor` op `.card-red` /
`.card-black`. Zo houdt elk spel zijn eigen kaartkleuren met één gedeelde assetset.

**Bewust per app gebleven** (niet naar core forceren):
- `protocol/messages.ts`, `net/transport.ts`, `net/peerTransport.ts`, de stores,
  `useGameAdapter`, `RulesEditor` en de screens: die zijn gekoppeld aan de per-app
  protocol-typen, thema-tokens of i18n-shape. De transport-laag generiek maken
  (`HostTransport<TEvent>` e.d.) is de uitgestelde "fase 3" uit
  `apps/bussen/docs/monorepo-migratie.md`: hoger risico en alleen op twee echte
  toestellen te verifiëren, dus niet blind doen.
- De spelregels: heel `engine/` op de gedeelde kaart-primitieven na, en `dice/`
  (mexxen): spel-specifiek.

Kortom: de veilig deelbare laag zit al in core. Zet er alleen iets bij als het echt
spel-agnostisch is én zonder per-app koppeling (of na expliciete parameterisatie), en verifieer
daarna alle drie de apps groen.

## Een nieuwe app forken: naam-checklist
Bij het forken van een app (kopie van een bestaande `apps/<naam>`) draagt veel code nog de
namen van het bronspel. Loop deze na, anders krijg je subtiele bugs (bv. P2P-roomcodes die
botsen omdat twee apps dezelfde PeerJS-prefix claimen):
- `package.json` `name`, `capacitor.config.ts` (appId + appName), `index.html` (titel/meta/
  canonical), `public/manifest.webmanifest`, `favicon.svg`.
- **Namespaces (anders botsen apps op dezelfde origin/broker):** `net/peerTransport.ts`
  `PEER_PREFIX`, `store/localeStore.ts` locale-sleutel, `lib/sound.ts` `configureSound`
  mute-sleutel, `lib/storage.ts` profiel-/regels-sleutels.
- Thema-tokens in `src/index.css` (`:root` + `@theme inline`), `src/i18n/strings.ts`
  (`appName` + alle teksten), copyright-headers, `README.md`, eigen `CLAUDE.md` + `docs/`.
- Root `README.md` en dit bestand bijwerken met de nieuwe app.

## Git-regels (alle apps)
- Committen en pushen mag alleen naar déze repo (`sipster-games`). Nooit naar andere repositories.
- Geen directe commits op `main`; werk op feature branches en merge met `--no-ff`.
- Nooit force pushen zonder te vragen. Nooit bestanden verwijderen zonder bevestiging.
- Conventional commits met emoji: ✨ feat, 🐛 fix, 📝 docs, ♻️ refactor, ✅ test, 🔧 chore.
- Atomair committen: één logische wijziging per commit.

## Code & stijl
- Stack: React 19, TypeScript, Vite 8, Tailwind 4, shadcn (base-nova), zustand, framer-motion, PeerJS.
- Leesbaarheid boven slimmigheid; comments alleen voor niet-voor-de-hand-liggende WHY.
- Alle UI-teksten in `src/i18n/strings.ts`. `nl` is de bron van waarheid; `type Strings = typeof nl`
  dwingt af dat elke taal dezelfde keys/signaturen heeft. Nieuwe tekst voeg je in álle talen toe.
- Geen em dashes in gegenereerde teksten; gebruik komma, dubbele punt of haakjes.
- **Claude-preview-beperking**: de preview-browser draait in een verborgen tab waar
  requestAnimationFrame 0 frames vuurt. Framer-motion-animaties, WebGL/WebRTC en screenshots
  werken daar niet betrouwbaar; het spelverloop hangt bewust op setTimeout en is er wél testbaar.
  P2P en animaties alleen op een echt device beoordelen. Dev-speeltuinen: `/?debug` (engine) en
  `/?cards` of `/?dice` (animatie met instelbare uitkomst).
