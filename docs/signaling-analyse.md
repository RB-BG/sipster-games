# Analyse: P2P-signaling, veiligheid en room-levensduur

> **Status: TENTATIEF, nog geen besluit.** Dit is een bevindingen-document ter
> overweging, niet een plan om uit te voeren. Het beschrijft hoe de multiplayer
> nu werkt en welke keuzes er liggen rond een eigen signaling-server. Ruben
> denkt hier nog over na. Niets hiervan is afgesproken of ingepland.

## Samenvatting

- Multiplayer werkt nu via de **gratis publieke PeerServer** van PeerJS, plus
  Google's publieke STUN. Dat staat niet in onze code, het zijn de
  PeerJS-defaults omdat `new Peer(...)` zonder config wordt aangeroepen.
- De **spel-data is veilig**: die loopt versleuteld en rechtstreeks tussen de
  telefoons (P2P), nooit langs de server.
- De realistische zwakke plekken zijn: een ongenode gast op een geraden
  roomcode, IP-metadata die inherent is aan P2P, en afhankelijkheid van infra
  van derden zonder garanties.
- De **room bestaat exact zolang de host-app open en verbonden is.** Geen TTL,
  geen persistentie, weg is weg.
- Een eigen (database-loze) PeerServer is een betrouwbaarheids- en
  veiligheidsupgrade, geen noodzaak om te kunnen spelen. Nog te beslissen.

## Hoe de signaling nu werkt

Bron: `src/net/peerTransport.ts`.

1. **Host claimt de roomcode.** `new Peer('mexxen-ABCD')` (regel 42) verbindt
   met de publieke PeerServer en registreert die id. `peer.on('open')` (regel
   45) betekent: de server heeft de code geaccepteerd.
2. **Gast vraagt de host op.** `new Peer()` (regel 99) haalt een willekeurige id
   op; `peer.connect('mexxen-ABCD')` (regel 107) vraagt de server om te koppelen.
3. **Handshake.** De server geeft het verzoek door; de toestellen wisselen via
   de server hun verbindingsgegevens uit (SDP + netwerk-kandidaten). Google STUN
   (PeerJS-default) helpt ieders publieke IP te ontdekken.
4. **Daarna direct P2P.** Zodra de `DataConnection` open is, gaan alle intents
   en events rechtstreeks tussen de telefoons (regels 69-73, 152-153). De server
   zit dan niet meer in het datapad.

Belangrijk: de signaling-server is geen eenmalig dingetje bij de start maar een
**doorlopende afhankelijkheid**. De host houdt de verbinding de hele sessie in
leven (regel 63-64: bij een wifi-blip meteen `peer.reconnect()`) zodat gasten
kunnen blijven joinen en terugkeren; ook een reconnectende gast herstelt eerst
de signaling-link (regel 143-144). Ligt de server plat, dan overleven bestaande
verbindingen, maar niemand kan er meer bij of terugkomen.

## Veiligheid van de publieke server

**Wat veilig is:**
- Game-data komt nooit langs de server; die stroomt P2P en is door WebRTC
  verplicht versleuteld (DTLS). De serverbeheerder ziet geen worpen of spelstand.

**Aandachtspunten:**
- **Signaling-metadata.** De handshake loopt wel via de publieke server:
  roomcodes en netwerk-kandidaten met **IP-adressen**. De beheerder zou kunnen
  zien wie met wie verbindt en vanaf welk IP. (IP-uitwisseling is inherent aan
  P2P zelf; medespelers leren sowieso je IP. Een TURN-server zou dat maskeren,
  maar die hebben we niet.)
- **Geen slot op de kamer.** Geen wachtwoord. Iedereen die de code kent of raadt
  kan proberen te verbinden. Codes zijn 4 tekens uit een alfabet van 31 (regel
  13), ongeveer 924.000 combinaties: niet triviaal te brute-forcen, en de
  publieke server heeft rate limits, maar het is geen echte beveiliging.
- **Impact van een ongenode gast is beperkt** dankzij de architectuur: de host
  is authoritative en valideert elke intent (`validateCommand`). Een indringer
  kan de spelstand niet corrumperen, hooguit meedoen of ruis sturen.
- **Derde partij.** Geen SLA, geen garantie tegen loggen, geen garantie op
  beschikbaarheid. Je deelt de server met de hele wereld.

Conclusie: de inhoud is veilig, de zwakke plekken zijn een ongenode gast op een
geraden code en het leunen op andermans infra.

## Levensduur van de room

- Er is **geen TTL en geen persistentie.** De id `mexxen-ABCD` bestaat op de
  server zolang de host een open signaling-verbinding heeft.
- Sluit de host de app of roept `close` aan (regel 75, `peer.destroy()`), dan
  geeft de server de id na een korte time-out vrij (orde van seconden tot een
  minuut) en is de code weer claimbaar.
- Daarom houdt de host een **wake lock** (`useWakeLock`): valt het scherm in
  slaap, dan sterft de signaling-verbinding en verdwijnt de room.
- Sluit de host echt af, dan is de tafel voorbij. Host-migratie is bewust
  toekomstwerk.

## Opties (ter overweging, niet besloten)

| | Publieke PeerServer (nu) | Eigen PeerServer |
|---|---|---|
| Werk | Niets | Klein servertje opzetten (~5 USD/mnd), geen database |
| Betrouwbaarheid | Gedeeld, geen SLA, kan plat/traag | Onder eigen controle |
| Veiligheid | Standaard 4-teken code, geen secret | Kan langere/geheime codes, eigen rate limits |
| Strenge netwerken | Geen TURN: verbinding kan stil falen | Optioneel eigen TURN als relay-vangnet |
| Codewijziging | Geen | Config in `peerTransport.ts` regel 42 + 99 (host + port), dankzij het `Transport`-interface één plek |

## Openstaande beslissingen voor Ruben

- Blijven op de publieke server, of een eigen PeerServer draaien?
- Zo eigen server: ook een TURN-server erbij voor strenge netwerken (kost
  bandbreedte, dus iets meer geld), of alleen signaling?
- Willen we een room-secret of langere roomcode tegen ongenode gasten, of is dat
  overkill voor een borrelspel?
- Willen we ooit host-migratie zodat de tafel niet sterft als de host weggaat?

Geen van deze is nu besloten. Dit document dient alleen om de afweging compleet
op papier te hebben.
