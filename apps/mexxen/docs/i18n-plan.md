# Plan: meertaligheid (i18n)

> **Status: fasen 1 t/m 4 afgerond en gemerged.** Mexxen is nu in het Nederlands
> en Engels speelbaar; de taalkiezer staat rechtsboven op de startpagina en
> wisselt live. Geen i18n-library (past bij de bewuste keuze uit `plan.md`).
> Fase 5 (volgende talen) is optioneel en puur vertaalwerk.
>
> **Openstaand: menselijke eindredactie van het Engelse jargon.** De structuur
> en signaturen kloppen (het type dwingt volledigheid af), maar de gekozen
> termen zijn een eerste opzet en moeten nagelezen worden door iemand die het
> spel kent (zie "Jargon-keuzes" onderaan).

## Uitgangspunt

Alle UI-teksten staan al centraal in `src/i18n/strings.ts` (ongeveer 125
entries) en worden overal via het ene `strings`-object gebruikt: 86 plekken in
10 bestanden. Er staan nergens losse teksten in de UI. Daarmee is het dure deel
van i18n-achteraf (teksten opsporen en centraliseren) al gedaan. Er is geen
i18n-library nodig; een getypeerde verzameling talen plus een klein taal-store
volstaat.

De teksten zijn een mix van:
- platte strings (`roll: 'Gooi'`),
- functies met interpolatie (`throwCount: (used, max) => ...`),
- functies met meervoudslogica (`mexCount`, `drinks`, `roundsPlayed`),
- een functie met switch-logica (`afslaanVerdict`).

Elke taal krijgt dus dezelfde keys met dezelfde functie-signaturen.

## Vastgelegde beslissingen

1. **Geen i18n-library.** Een getypeerd `Record<Locale, Strings>` plus een
   zustand-store. Consistent met de bestaande architectuur.
2. **Type-veiligheid dwingt volledigheid af.** `type Strings = typeof nl`; elke
   andere taal moet dat type implementeren. Een ontbrekende of verkeerd
   getypte key faalt de build. Geen stille gaten.
3. **Meervouden per key via functies**, zoals nu al. Elke taal schrijft z'n
   eigen meervoudslogica; het model kan ook complexe meervoudstalen aan.
4. **Live wisselen** via een `useStrings()`-hook die de actieve taal uit de
   store leest, zodat de UI direct meebeweegt (in hotseat en multiplayer).
5. **Detectie met NL als fallback**: eerste keuze uit `navigator.language`,
   daarna de opgeslagen voorkeur, anders Nederlands.
6. **Jargon is vertaalwerk, geen techniek.** "mex", "ridder", "afslaan",
   "slokken", "borrel" vragen doordachte keuzes van iemand die het spel kent,
   niet een letterlijke vertaling. Dit plan levert de structuur; de
   tekstkwaliteit per taal is een aparte, menselijke controle.

## Fasen

| # | Fase | Grootte | Status | Acceptatie |
|---|------|---------|--------|------------|
| 1 | **Structuur omzetten** | S | ✅ | Huidig object werd `nl`; `type Strings = typeof nl`; `strings.ts` exporteert `locales: Record<Locale, Strings>` en het `Locale`-type. `as const` verwijderd zodat vertalingen het type halen. Build groen, geen gedragswijziging. |
| 2 | **Taal-store + hook** | M | ✅ | `localeStore` (zustand + persist naar localStorage), detectie (opgeslagen voorkeur > `navigator.language` > NL), `useStrings()`-hook. De React-lagen lezen via de hook; `netStore.ts` via `useLocaleStore.getState()`. Gedrag identiek zolang NL actief is. |
| 3 | **Taalkiezer** | S | ✅ | `LocaleSwitch` (NL/EN) rechtsboven op de HomeScreen; wisselen live. `<html lang>` volgt de taal. Meta-description en manifest: buiten scope gelaten (statisch NL). |
| 4 | **Engelse vertaling** | M | ✅ | Volledige `en: Strings` met eigen meervouds- en switch-logica. End-to-end geverifieerd (Playwright): live wissel, `<html lang>`, persist, detectie en fallback. Jargon-eindredactie staat nog open. |
| 5 | **Volgende talen** (optioneel) | per taal | ⬜ | Puur vertaalwerk: nieuwe `Locale` toevoegen, `locales`-record aanvullen, type dwingt volledigheid af. |

## Raakvlakken in de code

- `src/i18n/strings.ts`: van één object naar `nl` + `locales` + types.
- 10 importerende bestanden (`App.tsx`, `screens/*`, `components/*`,
  `store/netStore.ts`): `import { strings }` wordt `const strings = useStrings()`
  binnen componenten.
- `src/store/`: nieuw `localeStore.ts`.
- `index.html`: `<html lang>`, meta-description, OG-tags zijn statisch NL; die
  volgen de gekozen taal niet automatisch. Minimaal de default netjes zetten,
  eventueel bij taalwissel het `lang`-attribuut updaten.
- `public/manifest.webmanifest`: naam/omschrijving zijn statisch; PWA-manifest
  is niet per sessie te lokaliseren zonder extra werk, buiten scope.

## Aandachtspunten

- **`netStore.ts` gebruikt strings buiten React.** Geen hook mogelijk daar; via
  de niet-reactieve store-getter oplossen. Kleine, geïsoleerde uitzondering.
- **Reactiviteit.** Zolang componenten via de hook lezen, hertekent de UI bij
  taalwissel. Teksten die buiten render worden gelezen (effecten, netStore)
  pakken de taal op het moment van gebruik, niet reactief; voor status- en
  foutteksten is dat prima.
- **Jargon en toon.** De borrel-sfeer is deel van het product. Machinaal
  vertalen levert vlakke teksten; per taal een menselijke eindredactie.
- **Testdekking.** De engine bevat geen UI-teksten (blijft puur), dus de
  vitest-suite raakt dit niet. Een lichte type-check (elke `Locale` implementeert
  `Strings`) is de belangrijkste vangrail, en die is gratis via de build.

## Verificatie

1. `npm run lint`, `npm run build`, `npm test` groen na elke fase.
2. Na fase 2: met NL actief gedraagt de app zich identiek (regressiecheck).
3. Na fase 4: een compleet potje in het Engels spelen (hotseat), taal live
   wisselen tijdens een potje, herstart onthoudt de keuze.
4. `navigator.language` op Engels gezet toont bij eerste bezoek Engels; onbekende
   taal valt terug op Nederlands.

## Jargon-keuzes (Engels, controle gevraagd)

Eerste opzet in `en: Strings`; graag nalezen door iemand die het spel kent:

- **mex** blijft "mex" (naam van het spel en de worp van 21).
- **ridder** → "knight", **dubbele ridder** → "double knight".
- **afslaan** → "knock" (SLA AF! → "KNOCK!"). Twijfelgeval: dekt "knock" de
  reactie-race genoeg, of past "call it" beter?
- **slokken** → "sips", **standaard slokken** → "base sips".
- **potje** → "game", **tafel** → "table", **kamp/tiebreak** → "tiebreak /
  play off", **vers** → "fresh", **omgekeerde mex** → "reverse mex".
- **turnOf**: "to play" (rendert als "{naam} to play").
- **wettest**: "has the wettest whistle" (vrije, speelse vertaling).

## Buiten scope

- Volledige lokalisatie van het PWA-manifest en server-side OG-tags per taal.
- Rechts-naar-links-talen (Arabisch, Hebreeuws): vraagt ook lay-outwerk.
- Vertaling van `docs/` (die blijven Nederlands, intern).
