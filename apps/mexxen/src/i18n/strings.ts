// Copyright © 2026 Mexxen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

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
    ['Basis', 'Gooi 21 (mex) in max 3 worpen. Hoogste steen is het tiental, dubbel is een honderdtal. Een 1 of 2 blijft verplicht liggen. Gooi je 32, dan is je beurt direct voorbij. Laagste score drinkt de standaard slokken, en elke mex die ronde verdubbelt dat (2, dan 4, dan 8).'],
    ['31', 'Gooi je 31, dan deel je slokken uit en gooi je gratis opnieuw.'],
    ['Eerste bepaalt het tempo', 'De rest krijgt max evenveel worpen als de eerste speler van de ronde.'],
    ['Omgekeerde mex', 'Gooi je 65, dan mag je de stenen omdraaien naar 21. Telt niet mee voor de slokken-multiplier.'],
    ['Ridder', 'Wie 1-1 gooit is de ridder en drinkt bij elk honderdtal het aantal ogen (300 = 3 slokken).'],
    ['Dubbele ridder', 'Gooit de ridder nóg eens 1-1, dan drinkt hij voortaan dubbel.'],
    ['Afslaan', 'Ligt er een 32, sla af om hem vast te leggen. De gooier voorkomt dat door een steen op te pakken. Onterecht afslaan: 2 slokken; een mex afslaan: 4; je eigen mex: 8.'],
  ] as [string, string][],

  // Tiebreak
  tiebreakTitle: 'Gelijkspel! Kamp om de laagste',
  tiebreakExplain: (hoogsteVerliest: boolean): string =>
    hoogsteVerliest ? 'hoogste worp verliest' : 'laagste worp verliest',
  tiebreakRollFor: (name: string) => `${name} gooit`,
  tiebreakMultiplier: (m: number) => `inzet ×${m}`,

  // Ronde-einde
  loserIs: (name: string) => `${name} verliest de ronde`,
  drinks: (n: number) => (n === 1 ? 'drinkt 1 slok' : `drinkt ${n} slokken`),
  sips: 'slokken',
  // Bijschrift onder de spelerchips: legt de twee getallen "ronde / totaal" uit.
  scoreLegend: 'deze ronde / totaal 🍺',
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
    MUST_REROLL: 'Na een 31 moet je opnieuw gooien',
    GAME_FULL: 'De tafel zit vol',
    MALFORMED: 'Onbegrijpelijk bericht ontvangen',
    NO_ROLLABLE_DICE: 'Beide stenen liggen vast',
    HAS_NOT_THROWN: 'Eerst gooien',
    INVALID_DIE: 'Die steen moet blijven liggen',
    INVALID_TARGET: 'Kies een andere speler',
    ALREADY_ROLLED: 'Je hebt al gegooid',
    INVALID_RULES: 'Ongeldige instellingen',
  } as Record<string, string>,
}

/**
 * Engelse vertaling. Het jargon (mex, knight, knock, sips) is een eerste opzet
 * die door iemand die het spel kent nagelezen moet worden; de structuur en de
 * functie-signaturen kloppen (het type dwingt dat af), de toon en de gekozen
 * termen zijn het menselijke werk.
 */
const en: Strings = {
  appName: 'Mexxen',
  tagline: 'The dice drinking game, on your phone',
  createTable: 'Create a table',
  joinTable: 'Join',
  comingSoon: 'Playable soon',
  hotseat: 'Play on one phone',

  // Setup
  players: 'Players',
  addPlayer: '+ player',
  removePlayer: 'remove',
  startGame: 'Start the game',
  needTwoPlayers: 'At least two players needed',
  playerNamePlaceholder: 'Name',

  // Game HUD
  turnOf: 'to play',
  throwCount: (used, max) => `throw ${used} of ${max}`,
  roll: 'Roll',
  stay: 'Stay',
  rolling: 'rolling…',
  passPhone: (name) => `Pass the phone to ${name}`,
  versLocked: 'locked (fresh)',
  heldLabel: 'held',
  round: (n) => `round ${n}`,
  mexCount: (n) => (n === 1 ? '1 mex rolled' : `${n} mexes rolled`),

  // 31
  give31Title: '31! Hand out sips to:',

  // Rulesets
  flipToMex: 'Flip it: mex!',
  slaAf: 'KNOCK!',
  ridderBadge: '🛡️',
  afslaanVerdict: (name, verdict) => {
    switch (verdict) {
      case 'terecht':
        return `${name} knocks! The 32 is locked`
      case 'onterecht':
        return `${name} knocks wrongly: 2 sips`
      case 'zelfAfgeklopt':
        return `${name} knocks themselves: 4 sips`
      case 'mexAfgeklopt':
        return `${name} knocks a mex: 4 sips`
      case 'eigenMexAfgeklopt':
        return `${name} knocks their own mex: 8 sips`
      default:
        return `${name} knocks`
    }
  },
  afslaanNeedsPhones: 'Knocking only works with multiple phones (it is a reaction race).',
  pop32Sub: 'ouch, the lowest…',
  pop31Sub: 'hand out sips!',
  ridderPop: (name) => `${name} has been knighted!`,
  ridderDubbelPop: (name) => `${name} is now a double knight!`,
  ridderPopSub: 'drinks the pip count on every hundred',
  ridderDubbelPopSub: 'now drinks double on every hundred',
  rulesExplainTitle: 'How do the rules work?',
  rulesExplain: [
    ['Basics', 'Roll 21 (mex) in max 3 throws. The higher die is the tens, a double is a hundred. A 1 or 2 must stay down. Roll 32 and your turn ends at once. The lowest score drinks the base sips, and every mex that round doubles it (2, then 4, then 8).'],
    ['31', 'Roll 31 and you hand out sips, then roll again for free.'],
    ['First player sets the pace', 'Everyone else gets at most as many throws as the first player of the round.'],
    ['Reverse mex', 'Roll 65 and you may flip the dice to 21. Does not count toward the sips multiplier.'],
    ['Knight', 'Whoever rolls 1-1 becomes the knight and drinks the pip count on every hundred (300 = 3 sips).'],
    ['Double knight', 'If the knight rolls 1-1 again, they drink double from then on.'],
    ['Knock', 'If a 32 is on the table, knock to lock it. The roller prevents this by picking up a die. Knocking wrongly: 2 sips; knocking a mex: 4; your own mex: 8.'],
  ],

  // Tiebreak
  tiebreakTitle: 'Tie! Play off for the lowest',
  tiebreakExplain: (hoogsteVerliest) =>
    hoogsteVerliest ? 'highest roll loses' : 'lowest roll loses',
  tiebreakRollFor: (name) => `${name} rolls`,
  tiebreakMultiplier: (m) => `stake ×${m}`,

  // Ronde-einde
  loserIs: (name) => `${name} loses the round`,
  drinks: (n) => (n === 1 ? 'drinks 1 sip' : `drinks ${n} sips`),
  sips: 'sips',
  scoreLegend: 'this round / total 🍺',
  nextRound: 'Next round',
  stopGame: 'Stop the game',
  endGame: 'End the game',
  finalTitle: 'Final score',
  wettest: (name) => `${name} has the wettest whistle`,
  roundsPlayed: (n) => (n === 1 ? 'after 1 round' : `after ${n} rounds`),

  // Lobby & netwerk
  lobbyTitle: 'Table',
  roomCodeLabel: 'table code',
  scanToJoin: 'Scan to join',
  copyLink: 'Copy link',
  copied: 'Copied!',
  shareLink: 'Share link',
  leaveTable: 'Leave table',
  closeTable: 'Close table',
  waitingForPlayers: 'Waiting for players…',
  connected: 'connected',
  reconnecting: 'reconnecting…',
  offline: 'offline',
  skipTurn: 'Skip turn',
  waitForHost: 'The host continues…',
  waitingFor31: (name) => `${name} is handing out sips…`,
  waitingForTiebreak: (name) => `waiting for ${name}…`,
  noLoser: 'No one loses this round',
  needMorePlayers: 'Waiting for at least one other player…',
  connectionLost: 'Connection lost; reconnecting…',
  tableGone: 'The table has closed',
  backHome: 'Back to start',
  shakeHint: 'or shake your phone 📳',
  soundOn: 'sound on',
  soundOff: 'sound off',
  sipsLogTitle: 'Sips log',
  sipReasons: {
    verliezer: 'lost the round',
    gekregen31: 'got a 31',
    straf: 'penalty',
    ridder: 'knight',
  },
  yourName: 'Your name',
  codePlaceholder: 'Code (e.g. ABCD)',
  makeTable: 'Create table',
  joinNow: 'Join',
  connecting: 'Connecting…',
  startWhenReady: 'Multiplayer is coming in the next update',
  rulesTitle: 'Rules',
  ruleLabels: {
    standaardSlokken: 'Base sips',
    tempo: 'First player sets the pace',
    omgekeerdeMex: 'Reverse mex (65 → 21)',
    ridder: 'Knight',
    dubbeleRidder: 'Double knight',
    afslaan: 'Knocking',
    tiebreakHoogsteVerliest: 'Tiebreak: highest loses',
  },
  net: {
    hostFailed: 'Could not create the table; check your internet and try again',
    joinFailed: 'Could not join; is the code correct?',
    tableClosed: 'The table is closed or unreachable',
  },

  // Fouten
  errors: {
    WRONG_PHASE: 'That is not possible right now',
    NOT_YOUR_TURN: 'It is not your turn',
    NOT_ENOUGH_PLAYERS: 'At least two players needed',
    ALREADY_JOINED: 'That player is already in',
    UNKNOWN_PLAYER: 'Unknown player',
    PENDING_31: 'Hand out your 31 sips first',
    NOT_PENDING_31: 'You have no 31 on the table',
    MUST_REROLL: 'After a 31 you must roll again',
    GAME_FULL: 'The table is full',
    MALFORMED: 'Received an unreadable message',
    NO_ROLLABLE_DICE: 'Both dice are locked',
    HAS_NOT_THROWN: 'Roll first',
    INVALID_DIE: 'That die must stay down',
    INVALID_TARGET: 'Pick another player',
    ALREADY_ROLLED: 'You have already rolled',
    INVALID_RULES: 'Invalid settings',
  },
}

/** Het contract dat elke taal moet implementeren; afgeleid uit het Nederlands. */
export type Strings = typeof nl

/** Ondersteunde talen. Uitbreiden = hier een code toevoegen en `locales` aanvullen. */
export type Locale = 'nl' | 'en'

/** Alle talen, per code. Het type dwingt af dat elke taal volledig is. */
export const locales: Record<Locale, Strings> = {
  nl,
  en,
}
