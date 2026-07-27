# Kaartspel (werknaam): spelregels

> **Bron van waarheid voor de engine.** Wijk hier niet stiekem van af omdat een andere
> Yaniv/Yousef-variant het anders doet. Werknaam is `kaartspel`; definitieve branding
> volgt later.

Yousef is een kaart-borrelspel uit de Yaniv-familie (ook bekend als Yaniv/Yusef). Iedereen
speelt met een hand van 5 kaarten en probeert zijn handwaarde laag te houden om "Yousef" te
kunnen roepen. Punten stapelen over de rondes; wie te hoog komt, trekt een bak.

## Kaarten & waarden

- Standaard 52-kaartendeck + jokers.
- Aas = 1, 2 t/m 10 = nominaal, boer/vrouw/heer = 10.
- **Joker = -1.** Extra rol: een joker mag als **wildcard een gat in een straat vullen**,
  bijv. `4 - J - 6 - 7` (de joker staat voor de 5).
- Handwaarde = som van de kaartwaarden in je hand.

## Verloop van een ronde

1. Iedere speler krijgt **5 kaarten**. De rest is de trekstapel; de bovenste kaart start de
   aflegstapel.
2. Om de beurt (met de klok mee) doet de actieve speler twee dingen, in deze volgorde:
   1. **Afleggen**: één of meer kaarten op de aflegstapel. Toegestaan:
      - één losse kaart;
      - een **setje** (2+ kaarten van dezelfde rang);
      - een **straat** (3+ opeenvolgende rangen; **suit hoeft niet gelijk** te zijn). Een
        **joker** mag als wildcard een gat in de straat vullen, bijv. `4 - J - 6 - 7`.
   2. **Trekken**: precies één kaart, óf een **random kaart van de trekstapel**, óf de
      **bovenste kaart van de aflegstapel**.
3. Zo houd je je handwaarde laag.

## Yousef roepen

- Aan het begin van je beurt (in plaats van afleggen/trekken) mag je **"Yousef"** roepen, mits
  je **handwaarde < 5** is (dus 0 t/m 4).
- De ronde stopt direct; iedereen legt zijn hand open.

## Ronde-scoring

Noem de roeper de *afleger* met handwaarde `H_afleger`, en de laagste hand aan tafel `H_laag`.

**Geval A, roeper is (mede-)laagste zonder dat iemand strikt lager zit:**
- De roeper scoort 0.
- Elke andere speler `p` telt bij zijn totaal op: `H_p - H_afleger` (het verschil tot de
  afleger; is nooit negatief want de afleger is de laagste).

**Geval B, Assaf (iemand zit gelijk of lager dan de roeper): alleen de roeper wordt gestraft.**
- **Gelijkspel** (iemand exact gelijk, niemand lager): de roeper krijgt **+10** punten.
- **Iemand strikt lager**: de roeper krijgt **`(H_afleger - H_laag) × 10`** punten.
- **Alle andere spelers krijgen deze ronde 0** (gegund) - ook wie lager zat en wie hoger zat.
  Een verkeerde Yousef-call straft dus uitsluitend de roeper.

> **Worked example.** Roeper heeft 4, speler X heeft 1, speler Y heeft 8.
> Assaf: roeper krijgt `(4-1)×10 = 30` (meteen een bak). X en Y krijgen allebei **0**.

*(Mogelijke huisregel-toggle later: "iedereen scoort ook bij Assaf" i.p.v. alleen de roeper. De
apps hebben een regels-editor, dus dit kan een aan/uit-optie worden. Nu: basisregel = alleen de
roeper.)*

## Bakken, slokken & afkopen

- Scores zijn **cumulatief** over de rondes.
- Zodra je totaal **>= 30** komt, moet je **een bak trekken**: je drinkt een bak en er gaat
  **20 punten** af (een bak is 20 punten waard).
- **Afkopen**: onder de 30 mag je vrijwillig een **halve bak afkopen** = **10 slokken** drinken
  voor **-10 punten**, zodat je niet later een hele bak hoeft.
- De app houdt de cumulatieve score en een bak-meter per speler bij, vlagt bij >= 30 "bak
  trekken" (knop: -20) en biedt de optionele "halve bak afkopen" (knop: -10, 10 slokken). De
  app dwingt niets af qua drinken; het toont de stand.

## Einde

- Geen vast eindpunt: je speelt zo lang je wil. Er is geen winnaar-op-punten; de bak-meter is
  de "score".

## Privacy bij hotseat (1 telefoon)

Het spel leent zich het best voor meerdere telefoons (P2P). Speel je toch met 1 telefoon, dan
moet er tussen de beurten een **afscherm-scherm** komen ("geef de telefoon door aan &lt;naam&gt;,
tik om je kaarten te zien"), zodat de volgende speler bij het doorgeven niet de hand van de
vorige ziet.

## Open punten

- Geen blokkerende open punten meer. Mogelijke latere huisregel-toggles: Assaf-scoring
  (alleen roeper vs. iedereen) en de joker-wildcard aan/uit.
