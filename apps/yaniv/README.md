# Yaniv 🃏

Het kaart-borrelspel *Yaniv* (uit de Yaniv/Yousef-familie), als webgame. Iedereen speelt met een hand van 5 kaarten en probeert zijn handwaarde laag te houden: is die 5 of lager, dan mag je "Yaniv" roepen, waarna iedereen nog één beurt krijgt en de ronde stopt. Punten stapelen over de rondes; wie boven de 30 komt, trekt een bak. Spelers zitten aan dezelfde tafel, ieder op eigen telefoon. Geen backend, geen accounts: de lobby-maker is de host en alles loopt peer-to-peer over WebRTC.

De spelregels staan in [docs/yaniv-regels.md](docs/yaniv-regels.md); het bouwplan in [docs/plan.md](docs/plan.md). Geforkt van de architectuur van het zusterspel Kingsen.

## Features

- **2.5D-speelkaarten** (CSS-3D-flip, geen WebGL). De deal komt van de host-shuffle; de flip-animatie is puur cosmetisch en landt altijd op de juiste kaart, identiek op elk toestel via een gedeelde seed.
- **P2P multiplayer**: tafel maken, QR-code of link delen, klaar. Host-authoritative: gasten sturen intenties, de host valideert en broadcast de volledige spelstand. Reconnect met resync als een telefoon even wegvalt.
- **Pass-the-phone-modus** met afscherm-scherm tussen de beurten, zodat de volgende speler je hand niet ziet.
- **Yaniv-scoring**: ronde-punten als verschil tot de afleger, Assaf-straf bij een verkeerde call, en een bak-meter per speler (bak trekken bij >= 30, halve bak afkopen voor slokken).
- **Borrel-details**: kaartgeratel (gesynthetiseerd, geen assets), trilfeedback, wake lock zodat schermen aan blijven, en een PWA-manifest voor "Zet op beginscherm".

## Architectuur

```
src/
  engine/     pure spellogica: reducer-state-machine, vitest-tests, geen React/DOM/netwerk
  protocol/   Intent- en GameEvent-types (discriminated unions)
  net/        Transport-interface, PeerJS-implementatie, host-loop (validate -> reduce -> broadcast)
  store/      zustand: gameStore (hotseat) + netStore (P2P); viewState loopt één animatie achter
  cards/      2.5D CSS-3D-speelkaarten + juice (flip, deal, screenshake)
  components/ UI-bouwstenen + effects/
  screens/    Home, setup, lobby, game; /?debug en /?cards zijn dev-speeltuinen
```

De laag-regel: `engine/` en `protocol/` importeren niets daarbuiten, `net/` kent alleen engine + protocol, en de React-lagen kennen alles. Daardoor is de spellogica volledig unit-testbaar en is PeerJS later verwisselbaar voor een realtime-dienst (remote spelen).

> **Status.** Compleet en speelbaar (hotseat + P2P). Kaart-flip-animaties en de twee-device-rooktest zijn device-werk; zie [docs/plan.md](docs/plan.md).

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
