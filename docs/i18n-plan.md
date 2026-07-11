# Plan: meertaligheid (i18n)

> **Status: voorstel, klaar om uit te voeren.** Doel: Mexxen naast Nederlands
> ook in andere talen aanbieden, zonder i18n-library (past bij de bewuste keuze
> uit `plan.md`). Engels als eerste tweede taal en proef; het model is daarna
> herbruikbaar voor elke volgende taal.

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

| # | Fase | Grootte | Acceptatie |
|---|------|---------|------------|
| 1 | **Structuur omzetten** | S | Huidig object wordt `nl`; `type Strings = typeof nl`; `strings.ts` exporteert `locales: Record<Locale, Strings>` en het `Locale`-type. Build groen, nog geen gedragswijziging. |
| 2 | **Taal-store + hook** | M | `localeStore` (zustand + persist naar localStorage), detectie via `navigator.language` met NL-fallback, `useStrings()`-hook. De 10 bestanden lezen via de hook i.p.v. de statische import. `netStore.ts` (buiten React) leest via `localeStore.getState()`. Gedrag identiek zolang NL actief is. |
| 3 | **Taalkiezer** | S | Kiezer in het profiel (of home); wisselen verandert de UI live. Statische teksten mee: `<html lang>`, meta-description en manifest waar mogelijk. |
| 4 | **Engelse vertaling** | M | Volledige `en: Strings`, inclusief eigen meervouds- en switch-logica. Menselijke controle op het jargon. Beide talen speelbaar end-to-end. |
| 5 | **Volgende talen** (optioneel) | per taal | Puur vertaalwerk: nieuwe `Locale` toevoegen, `locales`-record aanvullen, type dwingt volledigheid af. |

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

## Buiten scope

- Volledige lokalisatie van het PWA-manifest en server-side OG-tags per taal.
- Rechts-naar-links-talen (Arabisch, Hebreeuws): vraagt ook lay-outwerk.
- Vertaling van `docs/` (die blijven Nederlands, intern).
