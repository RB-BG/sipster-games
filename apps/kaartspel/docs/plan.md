# Kaartspel (werknaam Yousef): bouwplan

Geforkt van de architectuur van `apps/kingsen` (dichtstbijzijnde kaartspel: identieke stack en
gelaagde, host-authoritative opzet). De app-schil (`net/store/protocol/screens/cards/i18n`) is
hergebruikt; alleen `src/engine/` is echt nieuw, want Yousef speelt heel anders dan kingsen:
beurten met hand-management + ronde-scoring + cumulatieve bak-drempel, i.p.v. één cirkel van 52
kaarten.

De spelregels staan in [`kaartspel-regels.md`](./kaartspel-regels.md) (bron van waarheid).

Werknaam `kaartspel`; definitieve branding (naam, domein, appId, kleurthema) stellen we uit tot
de polish-chunk, net als bij kingsen.

## Chunks (elk op een eigen branch, volledig af: lint/build/test groen + merge `--no-ff`)

0. **Regels** (dit + `kaartspel-regels.md`): open punten beslissen vóór de engine-chunk.
1. **Scaffold** (`feat/kaartspel-scaffold`): app-skelet geforkt van kingsen. **Namespaces uniek
   maken** (anders botsen apps op dezelfde origin/broker):
   - `net/peerTransport.ts` `PEER_PREFIX`
   - `store/localeStore.ts` locale-sleutel
   - `lib/sound.ts` `configureSound` mute-sleutel
   - `lib/storage.ts` profiel-/regels-sleutels
   - `capacitor.config.ts` (appId + appName), `index.html` (titel/meta/canonical),
     `public/manifest.webmanifest`, `favicon.svg`
   - thema-tokens in `src/index.css`, `src/i18n/strings.ts` `appName`
   - root `README.md` + `CLAUDE.md` bijwerken met de nieuwe app.

   Bouwt groen als tijdelijke kingsen-kloon.
2. **Engine (puur)** (`feat/kaartspel-engine`): `types`, `cardActions` (afleggen van
   los/set/straat, trekken van stapel of aflegstapel, Yousef roepen), `reducer` (ronde-scoring,
   Assaf, cumulatieve bak-drempel + afkopen), `validate`. Deck/cards hergebruikt uit
   `@sipster/core`. Volledige vitest-dekking. Bespeelbaar via `/?debug`.
3. **Hotseat + GameScreen** (`feat/kaartspel-hotseat`): `gameStore`, `useGameAdapter`,
   `GameScreen` met handkaarten + afleg/trek-UI, Yousef-knop, scorebord met bak-meter per
   speler. Eén-toestel potje speelbaar. viewState-freeze zoals in de zusterspellen.
   **Afscherm-scherm** tussen de beurten ("geef de telefoon door aan &lt;naam&gt;, tik om je
   hand te zien") zodat de volgende speler de vorige hand niet ziet.
4. **P2P** (`feat/kaartspel-p2p`): `protocol/messages.ts`, `net/*`, netStore, lobby, QR-join.
   Pariteit met kingsen.
5. **Polish** (`feat/kaartspel-polish`): geluid/haptiek, bak-/slokken-effecten (evt.
   `DrinkShots` uit core), regel-uitleg, i18n NL+EN compleet, definitieve branding.

## Voortgang

- Chunk 0 (regels): afgerond. Geen blokkerende open punten meer; mogelijke huisregel-toggles
  (Assaf-scoring, joker-wildcard) genoteerd voor later.
- Chunk 1 (scaffold): afgerond (unieke namespaces, werknaam-branding, groen).
- Chunk 2 (engine): afgerond. Pure engine + app-laag-port naar de nieuwe Intents/Commands;
  `/?debug` speelt de engine. 72 vitest-tests, lint/typecheck/build groen.
- Chunk 3 (hotseat + GameScreen): afgerond. Echte hand-UI: afscherm-scherm bij het doorgeven
  van de telefoon (key-per-beurt), selecteerbare hand met afleggen (los/set/straat) + trekken
  van stapel/aflegstapel, Yousef-knop (met drempel), scorebord met bak-meter, ronde-einde
  (open handen, bak trekken / afkopen, volgende ronde) en eindstand. i18n NL+EN aangevuld.
  Lint/typecheck/test/build groen; HomeScreen laadt schoon in preview. Interactief bespelen +
  kaart-animaties (viewState-freeze) zijn bewust device-werk (preview commit geen React-updates).
  TODO chunk 5: kaart-flip-animaties, geluid/haptiek, branding; kingsen-restanten opruimen
  (CupMeter, oude i18n-teksten).
- Chunk 4 (P2P): afgerond. Net-laag was al bedraad in chunk 2; nu de P2P-kern toegevoegd:
  per-ontvanger gefilterde STATE (`stateFor`: eigen hand volledig, andermans hand alleen als
  aantal), en het GameScreen-perspectief (P2P toont je eigen hand, acties alleen op je beurt,
  geen afscherm-scherm; ronde-einde: alleen je eigen bak afhandelen, host start de ronde).
  Lint/typecheck/72 tests/build groen. Twee-device-rooktest staat nog open (preview kan P2P/
  animaties niet valideren, conform CLAUDE.md).
- Chunk 5 (polish): grotendeels afgerond. Regel-uitleg herschreven naar Yousef (hand, Yousef
  roepen, bakken) in NL+EN; geluid + haptiek bedraad op afleggen/Yousef/bak; mute-knop in de
  game-header. Lint/typecheck/72 tests/build groen.
  Bewust nog open (allemaal device-only of cosmetisch): kaart-flip-animaties + viewState-freeze
  (niet in preview te valideren), definitieve branding (naam/domein/kleurthema, blijft werknaam
  op verzoek), en opruimen van kingsen-restanten (ongebruikte `CupMeter`, `cardActions.ts` en
  oude i18n-keys als cupTitle/cardName; laten staan omdat verwijderen bevestiging vraagt).
- Chunk 1 t/m 5: open.
