# Bussen: spelregels (bron van waarheid voor de engine)

Dit document is de bron van waarheid voor de engine (`src/engine/`). De reducer implementeert precies wat hier staat; wijk hier niet stiekem van af "omdat een andere variant het anders doet". Bussen (ook wel "ride the bus" of "drink de bus") kent talloze regionale varianten; dit is de variant die deze app implementeert.

Er wordt gespeeld met één standaard kaartspel van 52 kaarten (geen jokers). Ranks lopen van 2 (laag) tot en met aas (hoog). Aas = 14, heer = 13, vrouw = 12, boer = 11. Kleuren: harten en ruiten zijn rood, klaveren en schoppen zijn zwart.

De host schudt bij de start één deck met `crypto.getRandomValues` (Fisher-Yates). Alle kaarten worden puur uit die geschudde array getrokken; de reducer is deterministisch testbaar met een scripted deck.

## Fase 1: het vragenrondje

Elke speler is één voor één aan de beurt en beantwoordt vier vragen op volgorde. Per vraag wordt één kaart voor de speler opengelegd; die vier kaarten vormen samen de hand van de speler voor de piramide.

Bij een goede gok mag de speler N slokken **uitdelen** aan een zelfgekozen medespeler (N = het vraagnummer). Bij een foute gok **drinkt** de speler die N slokken zelf.

1. **Rood of zwart?** (1 slok) — de speler gokt de kleur van de eerste kaart.
2. **Hoger of lager?** (2 slokken) — hoger of lager dan de eerste kaart. Gelijk = fout (drinken).
3. **Binnen of buiten?** (3 slokken) — valt de derde kaart qua rank strikt tussen kaart 1 en kaart 2 in? Gelijk aan een van de grenzen (rand) = buiten telt als fout (drinken).
4. **Heb je of heb je niet?** (4 slokken) — heeft de speler de kleursoort (suit) van de vierde kaart al in de hand (bij de eerste drie kaarten)? "Heb je" = ja.

Als de laatste speler zijn vierde vraag heeft beantwoord, gaat het spel naar de piramide.

## Fase 2: de piramide

Uit de rest van het deck wordt een piramide gelegd, standaard vijf rijen groot: van onder naar boven `[5, 4, 3, 2, 1]` kaarten. De onderste rij is 1 slok waard, en dat loopt op naar boven (rij 2 = 2 slokken, … de top = 5 slokken).

De host draait één kaart tegelijk om (host-only actie), van onder naar boven. Iedere speler die een kaart met **dezelfde rank** in de hand heeft, mag die claimen: hij legt de kaart neer en deelt het aantal slokken van die rij uit aan een zelfgekozen medespeler.

**Elke claim kost een kaart.** Bij het claimen leg je één kaart af (bij een eerlijke claim de kaart van die rank). Die kaart is daarna uit je hand, dus je kunt hooguit zoveel keer uitdelen als je kaarten hebt (na het vragenrondje maximaal vier). Met een lege hand kun je niet meer claimen.

**Liegen (bluffen), standaard aan als lobby-toggle:** een speler mag een kaart claimen zónder de rank echt te hebben. Ook dan leg je een kaart af (dicht), dus liegen kan hooguit vier keer. Zolang het claim-venster open is, mag een andere speler "call bluff" roepen (afslaan). De afhandeling werkt exact als het afslaan-mechanisme uit Mexxen:

- Betrapte leugenaar (de claim was gelogen): drinkt dubbel (2× de rij-slokken). De afgelegde kaart is en blijft weg.
- Valse beschuldiging (de claim was echt): de beschuldiger drinkt dubbel; de eerlijke claim staat en de slokken worden alsnog uitgedeeld.

Na de laatste omgedraaide kaart wordt de speler (of spelers) met de **meeste kaarten nog in de hand** de buschauffeur. Bij gelijkspel rijden standaard alle gelijk-eindigende spelers de bus.

## Fase 3: de bus

De buschauffeur krijgt een rij van N kaarten (standaard 5) gesloten voor zich. Positie 0 (de eerste kaart) wordt open gelegd. Voor elke volgende kaart gokt de speler hoger of lager dan de vorige open kaart.

- Goed: schuif een positie op.
- Fout: de speler drinkt (oplopend: 1, dan 2, dan 3, …), de rij wordt opnieuw gesloten gelegd en de speler begint weer bij positie 0.

Zodra de hele rij zonder fout is doorlopen, is de bus uitgereden en is het potje afgelopen (`ended`).

## Instelbare regels (`RuleConfig`)

- **`bluffen`** (standaard aan): liegen + call bluff in de piramide.
- **`busLengte`** (standaard 5): het aantal kaarten in de bus-rij.
- **`standaardSlokken`**: basiseenheid voor de slok-administratie.

Alle contested realtime-acties (call bluff) lopen host-authoritative: de host beslist op volgorde van binnenkomst wie er eerst was, net als bij het afslaan in Mexxen.
