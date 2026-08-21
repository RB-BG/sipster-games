# @sipster/hub

De apex-site op `sipster.games`: een statische landingspagina die naar de vier
spellen linkt (Mexxen, Bussen, Kingsen, Yaniv) en de gedeelde `ads.txt` serveert.

Bewust géén build-tooling: alles staat kant-en-klaar in `public/`. Vercel serveert
die map één-op-één (`outputDirectory: "public"`, geen build, geen SPA-rewrite, want
een catch-all rewrite zou `/ads.txt` breken).

## Bestanden
- `public/index.html` — zelfstandige landingspagina (inline CSS, geen externe requests).
- `public/ads.txt` — autoritatief voor de apex én de subdomeinen; crawlers zoeken
  `ads.txt` op de domeinroot, dus dit dekt ook `mex./bus./king./yaniv.sipster.games`.
- `public/favicon.svg`.

## Vercel
Nieuw project, root directory `apps/hub`, domein `sipster.games` (plus `www` redirect
naar keuze). Framework preset: Other. Build command: leeg. Output directory: `public`.

## AdSense
Verificatie loopt via de ads.txt-methode: de regel in `public/ads.txt` bevat het
publisher-ID. De `<meta name="google-adsense-account">` in `index.html` staat er als
extra eigendomssignaal en laadt zelf geen advertenties.
