# Mexxen: spelregels (Utrechtse variant)

Samenvatting van de "mexxen bijbel". Dit is de bron van waarheid voor de game-engine.

## Basis

- Twee dobbelstenen, doel: 21 ("mex") gooien. Maximaal 3 worpen per beurt.
- Hoogste dobbelsteen = tiental, laagste = eental (6 en 4 = 64). Dubbel = honderdtal (3 en 3 = 300).
- Score-rangorde van hoog naar laag: 21 (mex), 100-tallen (600 > 500 > ... > 100), dan gewone scores (65 > 64 > ... > 41), en 31 en 32 zijn bijzonder (zie hieronder). 32 is het laagst.
- **Verse 1 of 2**: wie een 1 of 2 gooit, moet die laten liggen. Die is maximaal één worp "vers"; daarna moet hij weer opgepakt en meegegooid worden. Je legt nooit beide stenen tegelijk vast: bij dubbel 1 of dubbel 2 houd je er één en blijft de ander gooibaar (ook als je er ridder mee wordt), want een 1 of 2 blijft maar één worp liggen.
- **21 (mex)**: hoogste worp, beurt eindigt direct.
- **31**: speler deelt slokken uit aan een andere speler en gooit opnieuw. Telt niet als worp en veroudert de verse 1/2 niet.
- **32**: laagste worp. Wie 32 gooit is direct klaar met zijn beurt (uitzondering: met de afslaan-regelset blijft de 32 open, zodat de gooier kan oppakken vóór iemand afslaat).
- Standaard heeft iedereen z'n eigen drie worpen: een vroeg einde van de eerste speler (mex, 32 of vrijwillig blijven staan) beperkt de rest niet. Alleen de tempo-regelset koppelt het maximum aan de eerste speler (zie hieronder).
- Ronde eindigt als iedereen gespeeld heeft. Laagste score verliest en drinkt het standaard aantal slokken (advies: 2), en elke mex die ronde verdubbelt dat aantal: standaard × 2^aantal-mexxen (2, dan 4, dan 8, ...). Zonder mex is het gewoon het standaard aantal.
- **Gelijkspel om laagste**: gebonden spelers gooien elk één dobbelsteen tegen elkaar. Vooraf afspreken of hoogste of laagste verliest. Bij opnieuw gelijk: allebei opnieuw en het aantal slokken verdubbelt.
- De verliezer begint de volgende ronde.
- Regelovertreding: standaard 2 slokken straf.

## Optionele regelsets (lobby-toggles)

### Eerste bepaalt het tempo
Alle andere spelers hebben maximaal evenveel worpen als de eerste speler van de ronde gebruikte.

### Ridder
- Wie 1 en 1 gooit wordt de ridder (ceremonie gebeurt fysiek aan tafel).
- Telkens als iemand (ook de ridder zelf) een honderdtal gooit, drinkt de ridder het aantal ogen (300 = 3 slokken).
- Ridder blijft tot een ander 1 en 1 gooit. Gooit de ridder zelf opnieuw 1 en 1: 1 slok (tenzij dubbele ridder actief is).

### Dubbele ridder
Uitbreiding op ridder: gooit de ridder opnieuw 1 en 1, dan wordt hij dubbele ridder en drinkt dubbel bij elk honderdtal.

### Afslaan
- Deze regelset heft het directe beurt-einde van een 32 op: de 32 blijft open, zodat de gooier kan proberen door te spelen tot iemand afslaat.
- Zodra iemand 32 gooit, mag elke speler afslaan (digitaal: knop). Wie het eerst afslaat legt de 32 vast; de gooier mag die ronde niet meer doorspelen.
- De gooier voorkomt afslaan door minstens één dobbelsteen op te pakken vóór de afslag. Let op: een verse 2 moet blijven liggen, dan mag alleen de 3 opnieuw.
- Bij twijfel wie sneller was beslissen de andere spelers (digitaal: verwerkingsvolgorde bij de host).

**Onterechte afklop (2 slokken straf):**
- De gooier was op tijd: hij had vóór de afslag al een steen opgepakt of alweer opnieuw gegooid (in beide gevallen is het afslaan-window dicht).
- Een andere speler had al terecht afgeklopt.
- Er was geen afklopbare situatie.
- Het was sowieso de laatste worp van de gooier.

**Extra onterecht (4 slokken):**
- Jezelf terecht afkloppen.
- Een mex afkloppen.

**Eigen mex afkloppen: 8 slokken.**

### Omgekeerde mex
Wie 65 gooit mag de stenen omdraaien naar 21. Telt voor de speler als mex (hoogste, beurt eindigt direct), maar telt NIET mee voor het totaal aantal mexxen (de drink-multiplier).

### Buiten scope (fysieke regels, niet in de app)
- Gemeenschappelijke mex (ontstaat uit fysieke situaties met stenen op elkaar).
- Niet aanpakken / niet wijzen / niet dubbel oppakken.
