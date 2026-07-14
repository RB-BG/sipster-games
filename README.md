# Mexxen 🎲

Het dobbel-borrelspel mexen (Utrechtse variant), als webgame. Spelers zitten aan dezelfde tafel, ieder op eigen telefoon: de app vervangt de dobbelstenen en doet de score- en slokkenadministratie. Geen backend, geen accounts: de lobby-maker is de host en alles loopt peer-to-peer over WebRTC.

De spelregels staan in [docs/mexxen-regels.md](docs/mexxen-regels.md), het bouwplan in [docs/plan.md](docs/plan.md).

## Features

- **2.5D-dobbelstenen** (CSS-3D-kubussen, geen WebGL). De uitkomst komt van de host-RNG; de tuimel-animatie is puur cosmetisch en landt altijd op de juiste waarde, identiek op elk toestel via een gedeelde seed.
- **P2P multiplayer**: tafel maken, QR-code of link delen, klaar. Host-authoritative: gasten sturen intenties, de host valideert en broadcast de volledige spelstand. Reconnect met resync als een telefoon even wegvalt.
- **Pass-the-phone-modus** voor als er maar één telefoon is.
- **Complete regelset** als toggles (in de lobby én in pass-the-phone, huisregels worden onthouden): verse 1/2, 31-slokken, mex-multiplier, tiebreak met verdubbeling, eerste bepaalt het tempo, omgekeerde mex (65 → 21 met draai-animatie), ridder + dubbele ridder, en afslaan met de volledige strafmatrix (2/4/8 slokken). Huisregels: een 32 beëindigt de beurt direct, en het worpen-maximum wordt alleen aan de eerste speler gekoppeld met de tempo-regelset aan; zie [docs/mexxen-regels.md](docs/mexxen-regels.md).
- **Game-feel**: fullscreen knallen voor mex, 32, 31 en de ridderslag, en bij elke slok vliegt een 🍺 in een boog naar de chip van de drinker (met +N-inslag, chip-pulse en haptics).
- **Borrel-details**: schud je telefoon om te gooien, dobbelgeratel en mex-fanfare (gesynthetiseerd, geen assets), trilfeedback, slokken-log, eindstand met "natste keel", wake lock zodat schermen aan blijven, en een PWA-manifest voor "Zet op beginscherm".

## Architectuur

```
src/
  engine/     pure spellogica: reducer-state-machine, 120+ vitest-tests, geen React/DOM/netwerk
  protocol/   Intent- en GameEvent-types (discriminated unions)
  net/        Transport-interface, PeerJS-implementatie, host-loop (validate -> reduce -> broadcast)
  store/      zustand: gameStore (hotseat) + netStore (P2P); viewState loopt één animatie achter
  dice/       2.5D CSS-3D-dobbelstenen + juice (tuimel, screenshake, mex-burst)
  components/ UI-bouwstenen + effects/ (score-pops, drink-shots)
  screens/    Home, setup, lobby, game; /?debug en /?dice zijn dev-speeltuinen
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
