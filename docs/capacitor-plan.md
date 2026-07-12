# Plan: Mexxen als native app via Capacitor

> **Status: fase 1 + 2 uitgevoerd.** Capacitor draait rond de bestaande build,
> Android-platform gescaffold, native haptics en keep-awake ingebouwd (web
> ongemoeid). Nog te doen op de juiste hardware: iOS-platform (macOS/Xcode),
> `@capacitor/motion` op een echt toestel, deep links (fase 3) en store-werk
> (fase 4-5, vereist Apple/Google-accounts). Bron van waarheid voor de regels
> blijft `docs/mexxen-regels.md`; dit plan raakt alleen de verpakking.

## Uitgangspunt

Capacitor stopt de bestaande Vite-build (`dist/`) in een native app-schil met
een WebView. Geen herschrijving: `src/engine/`, `src/protocol/`, de React-lagen
en de 2.5D CSS-dice draaien ongewijzigd. De web-app blijft een geldige
website/PWA, dus **Vercel blijft precies werken**: die bouwt en serveert `dist/`
zoals nu; Capacitor pakt datzelfde `dist/` erbij voor de native apps. Eén
codebase, twee doelen.

### Wat wel en niet native is

- **Rendering** blijft web (WebView), niet OS-native. Op moderne telefoons
  onmerkbaar voor CSS-3D-dice en een mobile-first UI.
- **Offline**: Capacitor bundelt `dist/` lokaal, dus de app start zonder
  internet. Hotseat (pass-the-phone) speelt daardoor **volledig offline**.
  P2P-multiplayer heeft internet nodig (signaling + WebRTC), dat is inherent aan
  PeerJS, geen Capacitor-beperking.
- **Bridge naar device-features**: haptics, device-motion, scherm-wakker-houden
  en deep links lopen via Capacitor-plugins in plaats van losse browser-API's.

## Vastgelegde beslissingen

1. **Capacitor, niet React Native**: hergebruikt 100% van de code; RN zou de
   hele UI + dice herschrijven en PeerJS moeten vervangen. Buiten verhouding.
2. **Zelfde repo (`mexxen`)**: Capacitor is additief (`ios/`, `android/`,
   `capacitor.config.ts`, een paar devDependencies). Geen nieuwe repository,
   dus geen conflict met de git-regel "alleen naar déze repo".
3. **Bundled assets, geen live-URL-wrapper**: de app laadt lokaal uit `dist/`
   (offline start), niet vanaf de Vercel-URL. Web-updates gaan via een nieuwe
   store-release (of later optioneel live-updates, buiten scope).
4. **Guard aan de rand**: native-only features draaien alleen als
   `Capacitor.isNativePlatform()`; op web valt de tak stil weg. Volgt hetzelfde
   patroon als het bestaande `Transport`-interface en de pure engine.
5. **Hotseat = altijd-werkt-kern, multiplayer = internet-bonus**: nette
   product- en review-boodschap, en het minste dat mis kan gaan bij App Review.

## Native-raakvlakken in de huidige code

| Feature | Nu (web-API) | Native aanpak |
|---|---|---|
| Schudden = gooien | `src/hooks/useShakeToRoll.ts` (DeviceMotion + iOS `requestPermission`) | `@capacitor/motion` voor stabiele events; iOS-permissie via plugin i.p.v. `DeviceMotionEvent.requestPermission`. Web-pad blijft als fallback. |
| Haptische feedback | (geen) | `@capacitor/haptics`: buzz bij gooien, mex, afslaan. Alleen native, web slaat over. |
| Scherm aanhouden | `src/hooks/useWakeLock.ts` (`navigator.wakeLock`) | WKWebView ondersteunt Screen Wake Lock niet betrouwbaar: `@capacitor-community/keep-awake` als native pad, web-hook als fallback. |
| Geluid | `src/lib/sound.ts` (WebAudio) | Werkt in de WebView; wel iOS audio-unlock op de eerste tap borgen en de mute-schakelaar respecteren. Geen plugin nodig. |
| Join via link/QR | `?room=`-autofill, `src/components/QrShare.tsx` | Universal Links / App Links + `@capacitor/app` (`appUrlOpen`) zodat een `?room=`-link de app opent en direct joint. |
| Duurzame opslag | `localStorage` (profiel, mute, motion-grant, `storage.ts`) | WKWebView kan localStorage opschonen: profiel + voorkeuren migreren naar `@capacitor/preferences` (optionele hardening). |
| P2P-verbinding | `src/net/peerTransport.ts` (PeerJS) | Draait ongewijzigd in de WebView (WKWebView kan WebRTC). Signaling-server is een apart plan; niet hier. |

## Fasen

| # | Fase | Grootte | Acceptatie |
|---|------|---------|------------|
| 1 | **Capacitor erin, web ongemoeid** ✅ | S | `@capacitor/core` + `@capacitor/cli` + `android` toegevoegd; `capacitor.config.ts` wijst `webDir` naar `dist`; `npm run build` + `npx cap sync` draaien schoon; `cap doctor` groen. iOS-platform volgt op macOS (`npx cap add ios`). Vercel-deploy onveranderd. |
| 2 | **Native-guards + plugins** ✅ (haptics + keep-awake) | M | `lib/haptics.ts` en `useWakeLock` achter `Capacitor.isNativePlatform()`, web-fallbacks intact, lint/build/test groen. Resterend: `@capacitor/motion` in `useShakeToRoll` op een echt toestel, en offline hotseat-test in vliegtuigmodus. |
| 3 | **Deep links (join-flow)** | M | Universal Link / App Link opent de app op een `?room=`-code en joint de tafel; QR blijft werken op web én native. |
| 4 | **Store-gereed maken** | M | App-icoon + splash gegenereerd; iOS 17+ leeftijdsrating (alcohol), permissie-teksten (motion), privacybeleid (geen data, geen account); Android-signing; testbuilds op TestFlight en interne Play-track. |
| 5 | **Indienen** | M | Screenshots, listing (NL), review-notities die de native-features benoemen (haptics, schudden, offline hotseat) tegen guideline 4.2; ingediend bij beide stores. |

## Lokaal een debug-APK bouwen

Om zelf te testen (geen store, geen signing nodig):

1. Vereist: een JDK 17+ (Gradle 8.14 draait op 17/21) en een Android SDK met
   `platform-tools`, `platforms;android-36` en `build-tools;36.0.0`. Wijs
   `JAVA_HOME` en `ANDROID_HOME` daarnaar en zet `android/local.properties` op
   `sdk.dir=<pad-naar-sdk>` (die file is git-ignored).
2. Bouwen:
   ```
   npm run build
   npx cap sync android
   (cd android && ./gradlew assembleDebug)
   ```
3. Resultaat: `android/app/build/outputs/apk/debug/app-debug.apk` (debug-key,
   installeerbaar via "onbekende bronnen" of `adb install -r <apk>`).

APK's/AAB's zijn overal git-ignored (root-`.gitignore` + `android/.gitignore`),
dus build-artefacten komen nooit in de repo.

## Nieuwe packages (buiten de huidige baseline)

Alleen na akkoord (CLAUDE.md-regel over packages):

- `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`
- `@capacitor/haptics`, `@capacitor/motion`, `@capacitor/app`
- `@capacitor-community/keep-awake`
- Optioneel: `@capacitor/preferences` (opslag-hardening),
  `@capacitor/status-bar`, `@capacitor/splash-screen`

Geen enkele hiervan raakt `engine/`, `protocol/` of `net/`.

## Risico's en aandachtspunten

- **App Review 4.2 (minimum functionality)**: een kale WebView-wrapper wordt
  soms geweigerd als "gewoon een website". Ondervangen door native haptics,
  schudden en offline hotseat expliciet te benoemen en te tonen.
- **Leeftijdsrating**: drankspel, dus 17+ op iOS. Geen blokkade, wel een feit.
- **iOS-audio**: WebAudio moet ontgrendeld worden door een user-gesture; borgen
  op de eerste tap en de stille-schakelaar respecteren.
- **WKWebView-opslag**: localStorage kan worden opgeschoond; kritieke
  voorkeuren naar `@capacitor/preferences` als het een probleem blijkt.
- **Multiplayer heeft internet nodig**: geen Capacitor-tekortkoming maar
  WebRTC/PeerJS. Echt offline-multiplayer (Bluetooth/lokaal netwerk) is een
  aparte, grote native-feature en bewust buiten scope.
- **Signaling-server**: multiplayer leunt nog op de publieke PeerServer. Voor
  een store-app is een eigen kleine signaling-server aan te raden. Apart plan.
- **Kosten**: Apple Developer 99 USD/jaar, Google Play 25 USD eenmalig.

## Verificatie

1. `npm run lint`, `npm run build`, `npm test` groen (net als nu, non-negotiable).
2. `npx cap sync` zonder fouten; app start in iOS-simulator en Android-emulator.
3. Op een echt toestel: hotseat in vliegtuigmodus (offline), schudden geeft
   haptische buzz, scherm blijft aan tijdens een potje.
4. Multiplayer op twee toestellen met internet: join via link/QR, live worpen.
5. Vercel preview-deploy blijft ongewijzigd werken (regressiecheck web).

## Buiten scope van dit plan

- Eigen P2P-signaling-server (apart plan, wel aanbevolen vóór store-launch).
- Offline-multiplayer via lokaal netwerk (Bluetooth/Nearby/Multipeer).
- In-app aankopen / monetisatie (RevenueCat e.d.).
- Live web-updates zonder store-release (Capacitor live-updates/Appflow).
