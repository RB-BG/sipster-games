# Monorepo-migratie: mexxen + bussen → `sipster-games`

> Status: grotendeels uitgevoerd in `sipster-games`. Beschrijft hoe we mexxen en bussen
> samenbrengen in één monorepo met een gedeelde `core`, zonder de deployments te koppelen.

## Voortgang
- **Fase 0 + 1 — gedaan.** Monorepo met npm workspaces + Turborepo; mexxen en bussen via
  `git subtree` geïmporteerd mét historie; LF-normalisatie; workspace-namen `@sipster/mexxen`
  en `@sipster/bussen`; één root-lockfile. `turbo run test lint build` groen voor beide apps.
- **Fase 2 — gedaan.** `@sipster/core` levert `cn`, `mulberry32`, `useWakeLock`, `Coaster` en
  de WebAudio-/haptiek-engine (neutrale namen + `configureSound(muteKey)`). Apps gebruiken
  dunne re-export-adapters, dus geen call-site is gewijzigd.
- **Fase 3 — deels gedaan, bewust afgekapt.** `localeStore` is een `createLocaleStore`-factory
  in `core` geworden (per-app `locales` + namespace via adapter). De rest van fase 3
  (`transport`/`peerTransport`/`hostLoop`/stores/`useGameAdapter` generiek) is **niet** gedaan:
  die raakt de P2P-netcode, die niet zonder echt device / twee toestellen te verifiëren is, voor
  beperkte extra DRY-winst. Bewust per app gelaten (zie het risico-argument hieronder).
- **Vercel** — per-app `vercel.json` met expliciete `buildCommand`/`outputDirectory` + `turbo-ignore`.
  Dashboard: per project Root Directory op `apps/<naam>` zetten (handmatig).
- **Capacitor** — `apps/bussen/android` gegenereerd (appId `games.sipster.bussen`); mexxen had al een `android/`.
- **Nog te doen (handmatig):** Vercel-projecten op de nieuwe repo met de juiste Root Directory +
  domeinen; daarna de losse `mexxen`- en `bussen`-repo's archiveren.

## Context
`mexxen` en `bussen` zijn twee bijna identieke projecten (zelfde stack, zelfde gelaagde
architectuur; bussen is uit mexxen geforkt). De gedeelde, spel-agnostische laag staat nu
dubbel. Doel: die laag DRY maken in één repo, **zonder de deployments samen te voegen** —
elke app blijft een eigen Vercel-site en een eigen Capacitor-app met eigen appId, domein en
release. Een gegronde vergelijking van beide repo's onderbouwt onderstaande indeling.

Belangrijke feiten uit die vergelijking (bepalen de aanpak):
- **Minder is echt deelbaar dan het lijkt.** De "gedeelde" `hostLoop`/stores/`useGameAdapter`/
  `protocol` delen alleen een *patroon*; hun body is spel-gekoppeld via de anim-DTO-, `Intent`-,
  `GameEvent`- en engine-typenamen. Verbatim deelbaar zijn alleen bladermodules.
- **Regeleindes verschillen**: mexxen is CRLF, bussen LF. Zonder normalisatie toont elke merge
  100% wijziging. Eerst normaliseren.
- **`@/`-alias** wijst per app naar de eigen `./src` (in `vite.config.ts`, `vitest.config.ts`,
  `tsconfig*.json`). App-interne code blijft dus werken zolang elke app zijn eigen `src/` +
  eigen config houdt; alleen code die naar `packages/core` verhuist, moet zijn imports aanpassen.
- **Config is vrijwel identiek**: `package.json` (alleen `name` verschilt), `vite.config.ts`,
  `vitest.config.ts`, alle `tsconfig*.json`, `eslint.config.js`, `vercel.json`, `components.json`
  zijn byte-identiek. App-specifiek: `capacitor.config.ts` (appId/appName), de theme-tokens in
  `src/index.css` (`:root` + `@theme inline`), `android/` (bestaat bij mexxen, nog niet bij
  bussen) en `public/`-assets.

## Doel-eindstructuur
```
sipster-games/
  package.json            # workspaces: ["apps/*", "packages/*"]; naam @sipster/root, private
  turbo.json              # build/test/lint pipelines
  tsconfig.base.json      # gedeelde compilerOptions (strict, jsx, moduleResolution bundler)
  eslint.config.js        # gehoist (identiek in beide apps)
  .gitattributes          # * text=auto eol=lf  (kill CRLF/LF-split)
  packages/
    core/                 # @sipster/core: de echt gedeelde laag (zie fasen)
  apps/
    mexxen/               # eigen src/(engine, dice, screens, i18n, branding), index.css-tokens,
                          # capacitor.config.ts (nl.mexxen.app), android/, public/, vite/tsconfig
    bussen/               # idem, eigen appId games.sipster.bussen, eigen tokens, eigen android/
```
Aanbeveling: **nieuwe repo `sipster-games`** (schoonste eindplaatje; beide oude repo's
archiveren). Alternatief: bussen promoveren tot monorepo (bespaart één Vercel-herkoppeling,
maar root herschikken + naam dekt de lading niet). **Tooling: npm workspaces + Turborepo**
(je gebruikt al npm; Turborepo geeft caching en de Vercel "ignored build step" via `turbo-ignore`).

## Deel-inventaris (drie tiers)
| Tier | Bestanden | Actie |
|---|---|---|
| **A. Verbatim → core** | `lib/utils.ts`, `lib/seededRng.ts` (+test), `hooks/useWakeLock.ts`, `components/Coaster.tsx` | Verplaatsen zoals ze zijn (intra-imports worden relatief). |
| **B. Alleen gedreven op een gebrande constante/token → core na parameteriseren** | `lib/storage.ts`, `lib/sound.ts`, `lib/haptics.ts` (mute-key + dice-vs-card exportnamen), `store/localeStore.ts` (`LOCALE_KEY`), `net/peerTransport.ts` (`PEER_PREFIX`), `components/{LocaleSwitch,QrShare,effects/DrinkShots}.tsx` (theme-token-classes) | Naar core met de constante/naam als parameter/prop; app levert de waarde. Neutrale API-namen kiezen (bv. `playPrimary` i.p.v. `playRoll`/`playDeal`). |
| **C. Alleen een gedeeld patroon, blijft per-app** | `protocol/messages.ts`, `net/transport.ts`, `net/hostLoop.ts`, `store/gameStore.ts`, `store/netStore.ts`, `hooks/useGameAdapter.ts`, `components/{PlayerChip,RulesEditor,effects/ScorePop}.tsx`, `i18n/strings.ts`, heel `engine/`, `dice/`(mexxen)/`cards/`(bussen) | Blijft per app. Pas in fase 3 optioneel via generics/injectie deels naar core. |

## Aanpak in fasen (elke fase apart afrondbaar en groen)

### Fase 0 — Normaliseren (in beide bestaande repo's, vóór import)
Voeg `.gitattributes` (`* text=auto eol=lf`) toe, `git add --renormalize .`, commit. Zo toont de
subtree-import echte diffs i.p.v. regeleinde-ruis.

### Fase 1 — Monorepo-skelet + historiebehoud + config-hoist (mechanisch, laag risico)
1. Nieuwe repo `sipster-games`; root `package.json` met `"workspaces": ["apps/*","packages/*"]`,
   `"private": true`; `turbo.json`; `.gitattributes`.
2. Historie behouden met **git subtree** (geen kopie):
   ```
   git subtree add --prefix=apps/mexxen <mexxen-url> main
   git subtree add --prefix=apps/bussen <bussen-url> main
   ```
   Volledige historie blijft onder de submappen.
3. Config hoisten: root `eslint.config.js`, `tsconfig.base.json` (apps' `tsconfig.app.json`
   extenden ervan). Per app blijven `vite.config.ts`, `vitest.config.ts`, `tsconfig*.json`
   (met eigen `@/`→`./src`), `capacitor.config.ts`, `index.css`, `public/`, `android/`.
4. Elke app-`package.json` krijgt een unieke naam (`@sipster/mexxen`, `@sipster/bussen`).
5. `turbo.json` pipelines voor `build`/`test`/`lint`; root-scripts draaien beide via Turborepo.

**Resultaat:** één repo, beide apps bouwen/testen/deployen nog exact zoals nu, nog geen gedeelde src.

### Fase 2 — `packages/core` met de veilige gedeelde set (tier A + B)
1. `packages/core` als workspace-package (`@sipster/core`, `"type":"module"`, exports-map,
   geen build-step nodig: source-exports via `exports` + `types`).
2. Verplaats tier A verbatim; verplaats tier B na parameteriseren (constanten/namen als
   argument of prop; app injecteert de waarde bij init).
3. Beide apps voegen `"@sipster/core": "workspace:*"` toe en vervangen de lokale kopieën door
   imports uit `@sipster/core`. `@/`-imports blijven voor app-interne code ongemoeid.

**Resultaat:** de echte duplicatie (utils, seeded-rng, wakelock, coaster, storage/sound/haptics,
locale-store, peer-transport, locale-switch/qr/drinkshots) staat nog maar één keer.

### Fase 3 — Optioneel/later: gedeeld skelet via generics (tier C)
Alleen als de onderhoudslast het rechtvaardigt. Maak `transport`/`hostLoop`/store-scaffold/
`useGameAdapter` generiek over de message- en anim-typen (`HostTransport<TEvent>`,
`GuestTransport<TIntent,TEvent>`, een `createHostLoop`-fabriek met geïnjecteerde RNG-source en
intent/event-mappers), en splits i18n in een core-runtime + per-app string-packs. Hoger risico
(raakt de spel-gekoppelde naad); bewust uitgesteld, niet nodig voor de DRY-winst.

## Vercel — twee losse sites (blijft gescheiden)
- Twee Vercel-projecten op dezelfde repo, elk met **Root Directory** `apps/mexxen` resp.
  `apps/bussen`; eigen domein (`mex.sipster.games` / `bus.sipster.games`).
- Vercel gebruikt de root-lockfile en bouwt de `@sipster/core`-dependency mee (workspace wordt
  automatisch gedetecteerd; "Include files outside root directory" aan laten).
- **Ignored build step** per project via `npx turbo-ignore` zodat een commit die alleen de andere
  app raakt geen deploy triggert. Zonder Turborepo: een klein `git diff`-script als skip-check.

## Capacitor — twee losse apps (blijft gescheiden)
- Elke app houdt zijn eigen `apps/<naam>/capacitor.config.ts` (eigen appId/appName), eigen
  `webDir: dist`, eigen `android/` (en later `ios/`). `npx cap sync` draai je vanuit de app-map.
- bussen heeft nog geen `android/`: eenmalig `npx cap add android` in `apps/bussen` na fase 1.
- De gedeelde `@sipster/core` zit al in de Vite-bundel van elke app; Capacitor ziet alleen `dist`.

## Verificatie (per fase, end-to-end)
1. Na fase 1: in de repo-root `npm install`; `turbo run build test lint` groen voor **beide** apps;
   `npm run dev` per app start; Vercel preview-deploys van beide projecten slagen.
2. Na fase 2: `npm run test` groen in beide apps (engine-tests ongemoeid); `npm run build` groen;
   hotseat-rooktest per app door de fasen (mexxen dobbelen, bussen kaarten) zonder console-fouten;
   controleren dat de uit core geïmporteerde stukken (geluid/haptics/locale/peer-prefix) per app
   de juiste gebrande waarde tonen.
3. Capacitor: `npx cap sync` per app slaagt; appId's blijven verschillend.
4. Regeleinde-check: `git diff` toont alleen echte wijzigingen (geen CRLF-ruis).

## Kritieke bestanden / aandachtspunten
- Historie: **`git subtree add --prefix=…`** (niet kopiëren) voor beide apps.
- `.gitattributes` + `--renormalize` vóór de import (CRLF vs LF).
- `@/`-alias blijft per app naar `apps/<naam>/src`; alleen verplaatste core-bestanden herbedraden.
- Neutrale API-namen in core voor `sound`/`haptics` (nu `playRoll`/`playDeal` uiteen).
- `net/transport.ts` is gekoppeld aan de per-app `protocol`-typen: pas in fase 3 (generiek) naar
  core; in fase 1/2 blijft het per app.
