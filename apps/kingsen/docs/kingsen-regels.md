# Kingsen: spelregels (bron van waarheid)

Dit document is de **bron van waarheid** voor de engine. Wijk hier niet stiekem van af
omdat een andere kings-cup-variant het anders doet; pas eerst dit document aan.

Kingsen is de Nederlandse variant van "Kings Cup / Ring of Fire".

## Opstelling

- Een volledig kaartspel van 52 kaarten ligt gesloten in een cirkel rond een centraal glas
  (de "cup").
- Minimaal 2 spelers (ideaal 4 of meer).
- Er wordt met de klok mee gespeeld: om de beurt draait de speler die aan zet is de volgende
  kaart om en voert de bijbehorende actie uit.
- Het potje eindigt zodra de 4e koning wordt getrokken (of, als dat eerder gebeurt, wanneer
  alle 52 kaarten op zijn).

## Kaartbetekenissen (vaste set)

De meeste acties voer je in het echt uit; de app onthult de kaart en toont de instructie. Een
paar kaarten zijn "engine-stateful": ze veranderen de spelstand (blijvende regel, rol, of de
cup-meter). Die zijn hieronder gemarkeerd.

| Rang | Naam | Actie |
|---|---|---|
| **A** (aas) | Waterval | Iedereen begint tegelijk te drinken. Je mag pas stoppen als de speler vóór jou (je rechterbuur bij kloksgewijs spelen) stopt. |
| **2** | Jij | Wijs iemand aan; die drinkt. |
| **3** | Ik | Je drinkt zelf. |
| **4** | Vrouwen | Alle vrouwen drinken. |
| **5** | Maatje | Kies een drinkmaatje; die drinkt met je mee tot de volgende 5. |
| **6** | Mannen | Alle mannen drinken. |
| **7** | Hemel | Iedereen steekt zijn hand omhoog; de laatste drinkt. |
| **8** | Categorie | Noem een categorie (landen, automerken, ...). Om de beurt een voorbeeld noemen; wie faalt of herhaalt, drinkt. |
| **9** | Rijmen | Zeg een woord. Om de beurt een rijmwoord; wie faalt, drinkt. |
| **10** | Nieuwe regel | *(engine-stateful)* Verzin een regel die de rest van het potje geldt. Blijft zichtbaar op tafel. |
| **J** (boer) | Duimmeester | *(engine-stateful)* Leg ongemerkt je duim op tafel; de laatste die volgt, drinkt. Je bent duimmeester tot het einde van het potje. |
| **Q** (vrouw) | Vraagmeester | *(engine-stateful)* Stel spelers vragen; wie antwoordt (of terugvraagt), drinkt. Je bent vraagmeester tot het einde van het potje. |
| **K** (koning) | King's Cup | *(engine-stateful)* Schenk een aantal slokken in het centrale glas (vul de meter). Bij de **4e** koning drink jij het volle glas leeg en eindigt het potje. |

## Engine-stateful details

- **Nieuwe regel (10)**: de speler typt een vrije tekst; die komt in de lijst met actieve
  regels en blijft staan tot het einde van het potje.
- **Duimmeester (J) / Vraagmeester (Q)**: de rol wordt aan de speler die de kaart trok
  gekoppeld en blijft als actieve regel op tafel staan. Trekt iemand anders later dezelfde
  rol, dan neemt die de rol over (de vorige vervalt).
- **King's Cup (K)**: elke koning verhoogt de teller `kingsDrawn`. Bij koning 1 t/m 3 vult de
  speler de meter (`cup`) met een zelfgekozen aantal slokken. Bij de 4e koning wordt de meter
  niet meer aangevuld: de speler drinkt het totaal en het potje is voorbij.

## Huisregels (instelbaar)

- `standaardSlokken` (default 1): stapgrootte-eenheid voor de cup-meter (de +/- knoppen
  verhogen met dit aantal).

## Wat de engine wel/niet bijhoudt

De engine houdt de cup-meter, het aantal getrokken koningen en de actieve regels/rollen exact
bij. Individuele slokken per speler (bij "jij", "ik", "waterval", ...) zijn sociaal en worden
in v1 niet per speler geteld; de app onthult de kaart en de instructie, de tafel doet de rest.
