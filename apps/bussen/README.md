# Bussen 🃏

Het kaart-borrelspel *bussen* ("ride the bus"), als webgame. Spelers zitten aan dezelfde tafel, ieder op eigen telefoon: de app deelt de kaarten en doet de score- en slokkenadministratie. Geen backend, geen accounts: de lobby-maker is de host en alles loopt peer-to-peer over WebRTC.

De spelregels staan in [docs/bussen-regels.md](docs/bussen-regels.md), gebouwd op de architectuur van het zusterspel Mexxen.

## Features

- **2.5D-speelkaarten** (CSS-3D-flip, geen WebGL). De kaart komt van de host-shuffle; de flip-animatie is puur cosmetisch en landt altijd op de juiste kaart, identiek op elk toestel via een gedeelde seed.
- **P2P multiplayer**: tafel maken, QR-code of link delen, klaar. Host-authoritative: gasten sturen intenties, de host valideert en broadcast de volledige spelstand. Reconnect met resync als een telefoon even wegvalt.
- **Pass-the-phone-modus** voor als er maar één telefoon is.
- **De drie fases**: het vragenrondje (rood/zwart, hoger/lager, binnen/buiten, heb je / heb je niet), de piramide met liegen + afslaan (call bluff), en de bus zelf.
- **Game-feel**: fullscreen knallen voor goed/fout, een betrapte bluf en bus-af, en bij elke slok vliegt een 🍺 in een boog naar de chip van de drinker (met +N-inslag, chip-pulse en haptics).
- **Borrel-details**: kaartgeratel en fanfare (gesynthetiseerd, geen assets), trilfeedback, slokken-log, eindstand met "natste keel", wake lock zodat schermen aan blijven, en een PWA-manifest voor "Zet op beginscherm".

## Architectuur

```
src/
  engine/     pure spellogica: reducer-state-machine, vitest-tests, geen React/DOM/netwerk
  protocol/   Intent- en GameEvent-types (discriminated unions)
  net/        Transport-interface, PeerJS-implementatie, host-loop (validate -> reduce -> broadcast)
  store/      zustand: gameStore (hotseat) + netStore (P2P); viewState loopt één animatie achter
  cards/      2.5D CSS-3D-speelkaarten + juice (flip, deal, screenshake)
  components/ UI-bouwstenen + effects/ (score-pops, drink-shots)
  screens/    Home, setup, lobby, game; /?debug en /?cards zijn dev-speeltuinen
```

De laag-regel: `engine/` en `protocol/` importeren niets daarbuiten, `net/` kent alleen engine + protocol, en de React-lagen kennen alles. Daardoor is de spellogica volledig unit-testbaar en is PeerJS later verwisselbaar voor een realtime-dienst (remote spelen).

## Development

```bash
npm install
npm run dev      # dev-server
npm run test     # engine- en net-tests (vitest)
npm run lint     # ESLint
npm run build    # typecheck + productie-build
```

Deployment: Vercel (SPA, zie `vercel.json`). Stack: React 19, TypeScript, Vite, Tailwind 4, zustand, framer-motion, PeerJS.

## License

Dit project valt onder de [PolyForm Noncommercial License 1.0.0](LICENSE). Niet-commercieel gebruik, aanpassen en delen is toegestaan; commercieel gebruik of (her)verkoop is niet toegestaan zonder voorafgaande schriftelijke toestemming van de houder. De volledige voorwaarden staan in het [LICENSE](LICENSE)-bestand.
