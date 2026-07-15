# Kingsen: bouwplan

Kingsen is geforkt van de architectuur van `apps/bussen` (identieke stack en gelaagde,
host-authoritative architectuur; alleen het spel en de branding verschillen). De app-schil
(net/store/protocol/screens/cards/i18n) is hergebruikt; alleen `src/engine/` is nieuw.

De spelregels staan in [`kingsen-regels.md`](./kingsen-regels.md) (bron van waarheid).

## Chunks (elk op een eigen branch, volledig af: lint/build/test groen + merge `--no-ff`)

1. **Scaffold** (`feat/kingsen-scaffold`): app-skelet geforkt van bussen, config + branding
   (appId `games.sipster.kingsen`, domein `king.sipster.games`), koningspaars-thema,
   `docs/kingsen-regels.md`. Bouwt groen als tijdelijke bussen-kloon.
2. **Engine (puur)**: `types`, `cardActions`, `reducer`, `validate`, deck/cards-reuse.
   Volledige vitest-dekking. Bespeelbaar via `/?debug`.
3. **Hotseat + GameScreen**: `gameStore`, `useGameAdapter`, `GameScreen`, `CupMeter`,
   Card-flip. Eén-toestel potje speelbaar.
4. **P2P**: `protocol`, `net/*`, `netStore`, lobby, QR-join. Pariteit met bussen.
5. **Polish**: geluid/haptiek, cup-/waterval-effect, regel-uitleg, i18n NL+EN, branding.

## Voortgang

- Chunk 1 (scaffold): in uitvoering.
