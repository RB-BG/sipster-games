/**
 * Alle UI-teksten centraal. Geen i18n-lib: `nl` is de bron, `type Strings` is
 * afgeleid uit `nl` en dwingt elke andere taal af tot dezelfde keys en
 * functie-signaturen. Bewust géén `as const`, anders zouden de teksten
 * letterlijke types worden en kon geen enkele vertaling het type halen.
 */
export const nl = {
  appName: 'Mexxen',
  tagline: 'Het dobbel-borrelspel, op je telefoon',
  createTable: 'Maak een tafel',
  joinTable: 'Doe mee',
  comingSoon: 'Binnenkort speelbaar',
  hotseat: 'Speel op één telefoon',

  // Setup
  players: 'Spelers',
  addPlayer: '+ speler',
  removePlayer: 'weg',
  startGame: 'Start het potje',
  needTwoPlayers: 'Minstens twee spelers nodig',
  playerNamePlaceholder: 'Naam',

  // Game HUD
  turnOf: 'aan de beurt',
  throwCount: (used: number, max: number) => `worp ${used} van ${max}`,
  roll: 'Gooi',
  stay: 'Blijf staan',
  rolling: 'aan het rollen…',
  passPhone: (name: string) => `Geef de telefoon aan ${name}`,
  versLocked: 'ligt vast (vers)',
  heldLabel: 'vast',
  round: (n: number) => `ronde ${n}`,
  mexCount: (n: number) => (n === 1 ? '1 mex gegooid' : `${n} mexxen gegooid`),

  // 31
  give31Title: '31! Deel slokken uit aan:',

  // Rulesets
  flipToMex: 'Draai om: mex!',
  slaAf: 'SLA AF!',
  ridderBadge: '🛡️',
  afslaanVerdict: (name: string, verdict: string): string => {
    switch (verdict) {
      case 'terecht':
        return `${name} slaat af! De 32 ligt vast`
      case 'onterecht':
        return `${name} slaat onterecht af: 2 slokken`
      case 'zelfAfgeklopt':
        return `${name} klopt zichzelf af: 4 slokken`
      case 'mexAfgeklopt':
        return `${name} slaat een mex af: 4 slokken`
      case 'eigenMexAfgeklopt':
        return `${name} slaat zijn eigen mex af: 8 slokken`
      default:
        return `${name} slaat af`
    }
  },
  afslaanNeedsPhones: 'Afslaan werkt alleen met meerdere telefoons (het is een reactie-race).',
  pop32Sub: 'au, de laagste…',
  pop31Sub: 'deel slokken uit!',
  ridderPop: (name: string) => `${name} is geslagen tot ridder!`,
  ridderDubbelPop: (name: string) => `${name} is nu dubbele ridder!`,
  ridderPopSub: 'drinkt bij elk honderdtal het aantal ogen',
  ridderDubbelPopSub: 'drinkt voortaan dubbel bij elk honderdtal',
  rulesExplainTitle: 'Hoe werken de regels?',
  rulesExplain: [
    ['Basis', 'Gooi 21 (mex) in max 3 worpen. Hoogste steen is het tiental, dubbel is een honderdtal. Een 1 of 2 blijft verplicht liggen. Gooi je 32, dan is je beurt direct voorbij; eindigt de eerste speler gedwongen vroeg (mex of 32), dan krijgt de rest ook maar zoveel worpen. Laagste score drinkt de standaard slokken, en elke mex die ronde verdubbelt dat (2, dan 4, dan 8).'],
    ['31', 'Gooi je 31, dan deel je slokken uit en gooi je gratis opnieuw.'],
    ['Eerste bepaalt het tempo', 'De rest krijgt max evenveel worpen als de eerste speler van de ronde.'],
    ['Omgekeerde mex', 'Gooi je 65, dan mag je de stenen omdraaien naar 21. Telt niet mee voor de slokken-multiplier.'],
    ['Ridder', 'Wie 1-1 gooit is de ridder en drinkt bij elk honderdtal het aantal ogen (300 = 3 slokken).'],
    ['Dubbele ridder', 'Gooit de ridder nóg eens 1-1, dan drinkt hij voortaan dubbel.'],
    ['Afslaan', 'Ligt er een 32, sla af om hem vast te leggen. De gooier voorkomt dat door een steen op te pakken. Onterecht afslaan: 2 slokken; een mex afslaan: 4; je eigen mex: 8.'],
  ] as [string, string][],

  // Tiebreak
  tiebreakTitle: 'Gelijkspel! Kamp om de laagste',
  tiebreakExplain: (hoogsteVerliest: boolean) =>
    hoogsteVerliest ? 'hoogste worp verliest' : 'laagste worp verliest',
  tiebreakRollFor: (name: string) => `${name} gooit`,
  tiebreakMultiplier: (m: number) => `inzet ×${m}`,

  // Ronde-einde
  loserIs: (name: string) => `${name} verliest de ronde`,
  drinks: (n: number) => (n === 1 ? 'drinkt 1 slok' : `drinkt ${n} slokken`),
  sips: 'slokken',
  nextRound: 'Volgende ronde',
  stopGame: 'Stop het potje',
  endGame: 'Sluit het potje af',
  finalTitle: 'Eindstand',
  wettest: (name: string) => `${name} heeft de natste keel`,
  roundsPlayed: (n: number) => (n === 1 ? 'na 1 ronde' : `na ${n} rondes`),

  // Lobby & netwerk
  lobbyTitle: 'Tafel',
  roomCodeLabel: 'tafelcode',
  scanToJoin: 'Scan om mee te doen',
  copyLink: 'Kopieer link',
  copied: 'Gekopieerd!',
  shareLink: 'Deel link',
  leaveTable: 'Verlaat tafel',
  closeTable: 'Sluit tafel',
  waitingForPlayers: 'Wachten op spelers…',
  connected: 'verbonden',
  reconnecting: 'opnieuw verbinden…',
  offline: 'offline',
  skipTurn: 'Sla beurt over',
  waitForHost: 'De host gaat verder…',
  waitingFor31: (name: string) => `${name} deelt slokken uit…`,
  waitingForTiebreak: (name: string) => `wachten op ${name}…`,
  noLoser: 'Niemand verliest deze ronde',
  needMorePlayers: 'Wachten op minstens één medespeler…',
  connectionLost: 'Verbinding kwijt; opnieuw verbinden…',
  tableGone: 'De tafel is gesloten',
  backHome: 'Terug naar start',
  shakeHint: 'of schud je telefoon 📳',
  soundOn: 'geluid aan',
  soundOff: 'geluid uit',
  sipsLogTitle: 'Slokken-log',
  sipReasons: {
    verliezer: 'ronde verloren',
    gekregen31: '31 gekregen',
    straf: 'straf',
    ridder: 'ridder',
  } as Record<string, string>,
  yourName: 'Jouw naam',
  codePlaceholder: 'Code (bv. ABCD)',
  makeTable: 'Maak tafel',
  joinNow: 'Doe mee',
  connecting: 'Verbinden…',
  startWhenReady: 'Multiplayer spelen volgt in de volgende update',
  rulesTitle: 'Regels',
  ruleLabels: {
    standaardSlokken: 'Standaard slokken',
    tempo: 'Eerste bepaalt het tempo',
    omgekeerdeMex: 'Omgekeerde mex (65 → 21)',
    ridder: 'Ridder',
    dubbeleRidder: 'Dubbele ridder',
    afslaan: 'Afslaan',
    tiebreakHoogsteVerliest: 'Kamp: hoogste verliest',
  },
  net: {
    hostFailed: 'Tafel maken lukt niet; check je internet en probeer opnieuw',
    joinFailed: 'Meedoen lukt niet; klopt de code?',
    tableClosed: 'De tafel is gesloten of onbereikbaar',
  },

  // Fouten
  errors: {
    WRONG_PHASE: 'Dat kan nu niet',
    NOT_YOUR_TURN: 'Jij bent niet aan de beurt',
    NOT_ENOUGH_PLAYERS: 'Minstens twee spelers nodig',
    ALREADY_JOINED: 'Die speler doet al mee',
    UNKNOWN_PLAYER: 'Onbekende speler',
    PENDING_31: 'Eerst je 31-slokken uitdelen',
    NOT_PENDING_31: 'Je hebt geen 31 liggen',
    NO_ROLLABLE_DICE: 'Beide stenen liggen vast',
    HAS_NOT_THROWN: 'Eerst gooien',
    INVALID_DIE: 'Die steen moet blijven liggen',
    INVALID_TARGET: 'Kies een andere speler',
    ALREADY_ROLLED: 'Je hebt al gegooid',
    INVALID_RULES: 'Ongeldige instellingen',
  } as Record<string, string>,
}

/** Het contract dat elke taal moet implementeren; afgeleid uit het Nederlands. */
export type Strings = typeof nl

/** Ondersteunde talen. Uitbreiden = hier een code toevoegen en `locales` aanvullen. */
export type Locale = 'nl' | 'en'

/**
 * Alle talen, per code. `en` is voorlopig een alias van `nl` (fase 4 vult de
 * echte vertaling in); het type dwingt af dat elke taal volledig is.
 */
export const locales: Record<Locale, Strings> = {
  nl,
  en: nl,
}
