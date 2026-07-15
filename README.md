# sipster-games

Monorepo voor de Sipster borrelspellen. Elke app is een losstaande build met een
eigen Vercel-site en een eigen Capacitor-app; gedeelde, spel-agnostische code komt
(gefaseerd) in `packages/core`.

## Apps
- `apps/mexxen` — Mexxen (dobbelspel), appId `nl.mexxen.app`, domein `mex.sipster.games`.
- `apps/bussen` — Bussen (kaartspel), appId `games.sipster.bussen`, domein `bus.sipster.games`.
- `apps/kingsen` — Kingsen (kaartspel, kings cup), appId `games.sipster.kingsen`, domein `king.sipster.games`.

## Packages
- `packages/core` — gedeelde laag (in opbouw, zie `apps/bussen/docs/monorepo-migratie.md`).

## Commando's (root)
- `npm run dev` — draait de dev-servers via Turborepo.
- `npm run build` / `npm run test` / `npm run lint` — over alle workspaces.

Per app kun je ook gericht draaien, bijvoorbeeld:
`npm run build -w @sipster/bussen`.

## Historie
mexxen en bussen zijn met behoud van git-historie geïmporteerd via `git subtree`;
commits van vóór de monorepo staan onder hun `apps/<naam>/`-pad.
