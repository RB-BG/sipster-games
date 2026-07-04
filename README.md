# Mexxen

Het dobbel-borrelspel mexen (Utrechtse variant), als webgame. Spelers zitten aan dezelfde tafel, ieder op eigen telefoon: de app vervangt de dobbelstenen en doet de score- en slokkenadministratie. P2P via WebRTC, 3D-dobbelstenen met physics, geen backend.

De spelregels staan in [docs/mexxen-regels.md](docs/mexxen-regels.md).

## Development

```bash
npm install
npm run dev      # dev-server
npm run test     # engine-tests (vitest)
npm run lint     # ESLint
npm run build    # typecheck + productie-build
```

Deployment: Vercel (SPA, zie `vercel.json`).
