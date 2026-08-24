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
Verificatie kan via alle drie de methoden: de regel in `public/ads.txt` bevat het
publisher-ID, en `index.html` bevat zowel de `<meta name="google-adsense-account">`
als het `adsbygoogle.js`-loader-script.

Op de pagina staat één display-banner onder het spellen-overzicht. Het slot-ID is
nog een placeholder (`data-ad-slot="0000000000"`): maak in AdSense een Display-ad-unit
aan en vervang dat nummer, anders vult de banner niet.

Dit script hoort BEWUST alleen op de hub: AdSense in de Capacitor-apps schendt het
beleid, dus de spel-apps laden het nooit (zie `@sipster/core/ads`, web-only).
