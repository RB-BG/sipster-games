# Plan: Mexxen, webbased dobbelspel

## Context

Ruben wil het borrelspel mexen (Utrechtse variant, regels uit de "mexxen bijbel" PDF) als webgame bouwen: 3D-dobbelstenen met physics-animatie, een lobby met uitnodigingslink, en P2P-verbindingen tussen spelers. Primaire use-case: spelers zitten fysiek aan dezelfde tafel, ieder op eigen telefoon; de app vervangt de dobbelstenen en doet de score- en slokkenadministratie. Remote spelen is een toekomstwens, dus de netwerklaag krijgt een abstractie zodat die later uit te bouwen is.

Dit plan wordt in agile chunks uitgevoerd door AI-sessies. Elke chunk is zelfstandig demobaar en eindigt met groene lint/build/test en een conventional commit met emoji.

## Vastgelegde beslissingen (gegrild en akkoord)

1. **Speelcontext**: fysiek aan tafel eerst, remote later. Zelfde sync-laag voor beide.
2. **Netwerk**: echt P2P via PeerJS (publieke PeerServer voor signaling), host-authoritative ster-topologie. Dun `Transport`-interface zodat PeerJS later verwisselbaar is voor een realtime-dienst.
3. **Regels**: basis als MVP; daarna als lobby-toggles: eerste bepaalt tempo, omgekeerde mex, ridder (+ dubbele ridder, als drink-teller, ceremonie blijft fysiek), afslaan (digitale knop, host-volgorde arbitreert). Gemeenschappelijke mex buiten scope (fysieke situatie).
4. **3D dice**: @react-three/fiber + drei + rapier. Physics is cosmetisch; host-RNG (crypto.getRandomValues) bepaalt de uitkomst, animatie wordt gestuurd via face-remap. Iedereen ziet dezelfde worp live (gedeelde animSeed).
5. **Shake-to-roll**: DeviceMotion API (iOS: requestPermission achter knop), tap-to-roll altijd als fallback.
6. **Stijl**: kroeg/borrel-sfeer: donker houten tafel, warme kleuren, bierviltje-UI, ivoren dice met zwarte ogen. UI in het Nederlands.
7. **Slokken**: de app telt slokken per speler (verliezer × mex-multiplier, straffen, ridder-slokken) met een log.
8. **Repo**: nieuwe repo `C:\Github\mexxen` (Ruben maakt de GitHub-repo aan en koppelt Vercel). Het project krijgt een eigen CLAUDE.md die commit-permissie voor die repo regelt. Stack identiek aan funmaxxing/personal-website template: React 19, TypeScript 6, Vite 8, npm, Tailwind 4 via @tailwindcss/vite, shadcn (base-nova/neutral), ESLint flat config zonder Prettier, scripts `dev`/`build` (`tsc -b && vite build`)/`lint`/`preview`, tsconfig-drieluik, alias `@/*`, vercel.json (framework=vite, SPA rewrites).

## Architectuur

Laagregel die alles bepaalt: **`engine/` en `protocol/` importeren niets buiten zichzelf** (pure functies, vitest-testbaar zonder jsdom). `net/` importeert engine+protocol. React-lagen (`store/`, `screens/`, `game3d/`, `components/`) importeren alles, maar worden nooit door engine/net geïmporteerd.

```
src/
  engine/      types, score, validate, reducer, sips, rng (injectable RollSource), *.test.ts
  protocol/    messages.ts: Intent & GameEvent discriminated unions
  net/         transport.ts (interface), peerTransport.ts, hostLoop.ts, guestClient.ts, reconnect.ts
  store/       gameStore.ts + uiStore.ts (zustand)
  game3d/      DiceScene, Die, Table, steering.ts, faceMap.ts
  screens/     HomeScreen, LobbyScreen, GameScreen, ResultsScreen
  components/  ui/ (shadcn), Coaster, PlayerChip, ScoreBoard, AfslaanButton, QrShare
  hooks/       useShakeToRoll, useWakeLock, useIsHost, useMyPlayer
  i18n/        strings.ts (alle NL-teksten, geen i18n-lib)
  lib/         utils.ts (cn), storage.ts, seededRng.ts (mulberry32, alleen voor animaties)
```

**Host game-loop**: intent binnen -> `validateIntent` (pure) -> bij ROLL: waarden + animSeed van RollSource -> `reduce(state, action)` (pure, retourneert nieuwe state + te broadcasten events) -> broadcast. De host is zelf ook speler en stuurt intents door dezelfde loop (loopback), dus één codepad.

**Protocol**: host broadcast na elke mutatie de **volledige GameState** (klein object, < 5 KB). Geen delta's: elimineert desync en maakt reconnect triviaal (`REQUEST_SYNC` -> één `STATE`). `ROLL_EVENT { rollId, values, animSeed }` is het enige transiente event, puur voor de gelijktijdige animatie.

**Dice-steering** (riskantste stuk, vroeg valideren): client ontvangt ROLL_EVENT -> seeded impuls uit mulberry32(animSeed) -> headless pre-simulatie met vaste timestep tot settle -> lees welke face boven ligt -> remap de visuele mesh-rotatie binnen de RigidBody zodat de authoritative waarde boven eindigt -> speel dezelfde sim realtime af. Vangnet (verplicht): na settle bovenface checken, bij afwijking in ~150 ms naar de juiste oriëntatie slerpen; 3 s timeout forceert settle. Vastgehouden dice (verse 1/2 of hold) zijn kinematic bodies en doen niet mee.

**State machine** (kern basisregels in de reducer):
- Beurt: max 3 worpen; nieuwe 1/2 wordt `onTable` + `vers: 'fresh'`; een fresh 1/2 die een worp overleeft wordt `'stale'` en MOET de volgende worp mee. 21 = mex: beurt locked, mexCount++. 31: eerst slokken uitdelen (`GIVE_SIPS_31`), dan gratis herworp (geen worpverbruik, geen vers-veroudering). Vrijwillig blijven staan kan niet met pending31 of een stale 1/2.
- Ronde-einde: uniek laagste verliest, slokken = standaard (default 2) × max(1, mexCount). Gelijkspel -> tiebreak-fase: één die per gebonden speler, vooraf ingestelde hoogste/laagste-regel, opnieuw gelijk = multiplier ×2. Verliezer begint volgende ronde.
- Rulesets haken chirurgisch in: tempo zet `maxThrows` op de worpen van speler 1; omgekeerde mex geeft bij 65 een flip-keuze (telt NIET mee in mexCount); ridder muteert `ridderId` bij 1+1 en logt slokken bij elk honderdtal; afslaan arbitreert puur op verwerkingsvolgorde bij de host (geen client-timestamps) met de 2/4/8-straffenmatrix.

## Chunks

| # | Chunk | Grootte | Demo/acceptatie |
|---|-------|---------|-----------------|
| 1 | **Scaffold + deploy**: repo, template-config 1-op-1 uit funmaxxing overnemen, vitest opzetten, kroeg-thematokens in index.css, HomeScreen-placeholder | S | Live Vercel-URL, mobiel gestyled, lint/build/test groen |
| 2 | **Pure engine + tests**: engine/ compleet voor basisregels + protocol-types; vitest-suite (score-ranking, vers-lifecycle, 31-flow, mex, tiebreak, slokkenformule) | M | ~40+ groene tests; `?debug`-pagina om een potje door de reducer te klikken |
| 3 | **3D dice op kroegtafel**: R3F + rapier scene, seeded worp, pre-sim + face-remap + slerp-vangnet, tap = hold/pickup, frameloop demand | M | Speeltuinpagina: ingestelde waarde komt altijd boven; zelfde seed = identieke animatie |
| 4 | **Pass-the-phone basisspel**: engine + 3D + zustand samen, hotseat-modus, NL HUD, ResultsScreen, tiebreak-flow. **Go/no-go voor engine en dice-UX vóór netwerkwerk** | M | Compleet potje met 3+ spelers op één telefoon incl. mex, 31, verse 1/2, tiebreak, slokken |
| 5 | **P2P lobby**: Transport-interface + peerTransport (roomcode -> peer-id `mexxen-ABCD`), lobby met QR + share-link (`?room=` autofill), presence, regel-toggles (host-only), reconnect-basis, wake lock host | M | Twee telefoons: QR scannen, elkaar zien joinen/leaven; overleeft korte schermvergrendeling |
| 6 | **Multiplayer basisspel**: volledige hostLoop + guestClient, ROLL_EVENT-sync op alle toestellen, input-gating, REQUEST_SYNC-reconnect midden in beurt, ERROR-toasts, disconnect-afhandeling | L | 3 telefoons spelen een ronde; iedereen ziet elke worp live; app killen en terugkomen werkt |
| 7 | **Extra rulesets**: tempo, omgekeerde mex, ridder (+ dubbele ridder, badge + auto-slokken), afslaan (knop + PICKUP_DIE-preventie + 2/4/8-straffen); alles vitest-gedekt; regels-uitleg in lobby | M | Per toggle een scenario op 2 telefoons; onterecht afslaan geeft juiste straf |
| 8 | **Polish**: shake-to-roll (iOS-permissieflow), geluid + haptics, reconnect-hardening, bundle-optimalisatie (lazy-load game3d/, manualChunks voor three/rapier), micro-interacties, slokken-historiek, PWA-manifest/OG-tags | M | Schudden werkt op iPhone én Android; scherm blijft aan; lobby laadt < 2 s op 4G |

## Packages (bovenop template-baseline, goedgekeurd via dit plan)

Dependencies: `three` (+ devDep `@types/three`), `@react-three/fiber` (v9), `@react-three/drei`, `@react-three/rapier`, `peerjs`, `qrcode.react`, `zustand` (boven Context: transport-callbacks muteren state buiten React; selectors voorkomen tree-brede re-renders naast een actieve Canvas).
DevDependencies: `vitest` (engine-tests in node-environment).
Bewust niet: react-router (screen-switch via store), i18n-lib, state-sync-libs.

## Risico's

- **Publieke PeerServer**: transport-interface maakt swap één bestand; retry met nieuwe roomcode bij id-collision; bestaande WebRTC-verbindingen overleven signaling-downtime.
- **iOS Safari**: DeviceMotion-permissie achter expliciete knop; wake lock re-acquire op visibilitychange; datachannels pauzeren op achtergrond -> altijd REQUEST_SYNC bij terugkeer (gratis dankzij full-snapshot protocol). Vanaf chunk 5 elke chunk op echte iPhone testen.
- **Rapier wasm ~1.5 MB**: lazy-load game3d/, kale scene, physics pauzeren bij idle.
- **Replay-nondeterminisme**: slerp-vangnet garandeert correctheid; determinisme is alleen cosmetisch. Blijkt replay fragiel in chunk 3, degradeer naar post-settle-slerp.
- **Host-telefoon weg = spel weg**: wake lock vanaf lobby, nette "tafel gesloten"-melding; host-migratie bewust future work (full-snapshot maakt het later haalbaar).

## Verificatie per chunk

1. `npm run lint`, `npm run build`, `npm test` groen (non-negotiable: linter na elke wijziging).
2. Chunk-demo uitvoeren zoals in de tabel; vanaf chunk 5 op minimaal twee fysieke telefoons (iPhone + Android).
3. Vercel preview-deploy checken op mobiel.
4. Conventional commit met emoji per logische wijziging; nooit direct op main pushen zonder afspraak in de nieuwe repo-CLAUDE.md.

## Voorbereiding door Ruben (eenmalig, vóór chunk 1)

- GitHub-repo `mexxen` aanmaken en clonen naar `C:\Github\mexxen`.
- Vercel-project koppelen aan die repo.
- Akkoord dat de nieuwe repo een eigen CLAUDE.md krijgt met commit-permissie (de huidige regel staat alleen `claude-pm-project` toe).
