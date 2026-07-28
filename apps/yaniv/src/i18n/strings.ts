// Copyright © 2026 Yaniv. PolyForm Noncommercial License 1.0.0 (see LICENSE).

/**
 * Alle UI-teksten centraal. Geen i18n-lib: `nl` is de bron, `type Strings` is
 * afgeleid uit `nl` en dwingt elke andere taal af tot dezelfde keys en
 * functie-signaturen. Bewust géén `as const`, anders zouden de teksten
 * letterlijke types worden en kon geen enkele vertaling het type halen.
 */
export const nl = {
  appName: 'Yaniv',
  tagline: 'Het kaart-borrelspel, op je telefoon',
  createTable: 'Maak een tafel',
  joinTable: 'Doe mee',
  hotseat: 'Speel op één telefoon',

  // Setup
  players: 'Spelers',
  addPlayer: '+ speler',
  removePlayer: 'weg',
  startGame: 'Start het potje',
  playerNamePlaceholder: 'Naam',

  // HUD
  dealing: 'kaarten worden gedeeld…',

  // Einde
  finalTitle: 'Einde potje',
  backHome: 'Terug naar start',
  close: 'Sluit',

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
  reconnecting: 'opnieuw verbinden…',
  offline: 'offline',
  round: (n: number) => `ronde ${n}`,
  waitForHost: 'De host gaat verder…',
  needMorePlayers: 'Wachten op minstens één medespeler…',
  soundOn: 'geluid aan',
  soundOff: 'geluid uit',
  stopGame: 'Stop het potje',
  endGame: 'Sluit het potje af',
  yourName: 'Jouw naam',
  codePlaceholder: 'Code (bv. ABCD)',
  makeTable: 'Maak tafel',
  joinNow: 'Doe mee',
  connecting: 'Verbinden…',
  rulesTitle: 'Regels',
  rulesExplainTitle: 'Hoe werkt Yaniv?',
  rulesExplain: [
    [
      'De hand',
      'Iedereen speelt met 5 kaarten. Om de beurt leg je kaarten af (een losse kaart, een setje van dezelfde rang, of een straat van opeenvolgende kaarten) en trek je één kaart, van de stapel of de bovenste afgelegde kaart. Aas telt 1, boer/vrouw/heer tellen 10, en de joker telt -1 (en mag een gat in een straat vullen).',
    ],
    [
      'Yaniv roepen',
      'Zodra je handwaarde 5 of lager is, mag je aan het begin van je beurt "Yaniv" roepen. Daarna krijgt elke andere speler nog één beurt, en pas dan wordt er gescoord. Ben je de laagste, dan tellen de anderen het verschil met jouw hand bij hun score op. Zit iemand gelijk of lager (Assaf), dan is de call mislukt en krijg jij zelf de punten: 10 bij gelijk, anders het verschil keer 10.',
    ],
    [
      'Bakken',
      'De punten stapelen over de rondes. Kom je op 30 of meer, dan trek je een bak (20 punten eraf). Onder de 30 mag je een halve bak afkopen: 10 slokken voor 10 punten eraf. Je speelt zo lang je wilt.',
    ],
  ] as [string, string][],
  ruleLabels: {
    handSize: 'Kaarten per hand',
    yousefMax: 'Yaniv roepen t/m',
    jokerWildcard: 'Joker als wildcard',
    assafEveryoneScores: 'Bij Assaf scoort iedereen',
    bakThreshold: 'Bak trekken vanaf',
  },
  net: {
    hostFailed: 'Tafel maken lukt niet; check je internet en probeer opnieuw',
    joinFailed: 'Meedoen lukt niet; klopt de code?',
    tableClosed: 'De tafel is gesloten of onbereikbaar',
  },

  // Yaniv-spel (de call-teksten; de i18n-key heet nog `yousef`, puur intern)
  yousef: {
    passTitle: (name: string) => `Geef de telefoon aan ${name}`,
    passHint: 'zodat niemand anders je hand ziet',
    showHand: 'Toon mijn hand',
    waitingFor: (name: string) => `Wachten op ${name}`,
    reviewHint: 'Je nieuwe hand, denk alvast na',
    passButton: (name: string) => `Geef door aan ${name}`,
    finalLap: 'Laatste beurt na Yaniv',
    handValue: (n: number) => `handwaarde ${n}`,
    deck: 'stapel',
    discardPile: 'aflegstapel',
    drawDeck: 'Trek van de stapel',
    drawDiscard: 'Pak deze kaart',
    pickCards: 'Kies kaart(en) om af te leggen, dan trek je één kaart',
    invalidGroup: 'Geen geldige set of straat',
    callYousef: 'Yaniv!',
    yousefLocked: (n: number) => `Yaniv mag bij ${n} of lager`,
    points: (n: number) => `${n} pt`,
    roundOver: 'Ronde afgelopen',
    called: (name: string) => `${name} riep Yaniv`,
    clean: 'Schone Yaniv',
    assaf: 'Assaf: verkeerde call',
    gained: (n: number) => (n > 0 ? `+${n}` : `${n}`),
    drawBak: 'Bak trekken (−20)',
    buyOff: 'Halve bak afkopen (10 slokken, −10)',
    nextRound: 'Volgende ronde',
    bakPending: 'Eerst alle openstaande bakken trekken',
    finalStandings: 'Eindstand',
  },

  // Fouten
  errors: {
    WRONG_PHASE: 'Dat kan nu niet',
    NOT_YOUR_TURN: 'Jij bent niet aan de beurt',
    NOT_ENOUGH_PLAYERS: 'Minstens twee spelers nodig',
    ALREADY_JOINED: 'Die speler doet al mee',
    UNKNOWN_PLAYER: 'Onbekende speler',
    CARD_NOT_IN_HAND: 'Die kaart zit niet in je hand',
    INVALID_GROUP: 'Geen geldige set of straat',
    HAND_TOO_HIGH: 'Je hand is te hoog voor Yaniv',
    EMPTY_DISCARD: 'De aflegstapel is leeg',
    NO_BAK_DUE: 'Je hoeft geen bak te trekken',
    CANNOT_BUY_OFF: 'Afkopen kan hier niet',
    BAK_PENDING: 'Eerst de openstaande bak trekken',
    INVALID_RULES: 'Ongeldige instellingen',
    GAME_FULL: 'De tafel zit vol',
    MALFORMED: 'Onbegrijpelijk bericht ontvangen',
  } as Record<string, string>,
}

/**
 * Engelse vertaling. De structuur en functie-signaturen kloppen (het type
 * dwingt dat af); de toon is een eerste opzet die een native speler mag
 * nalezen.
 */
const en: Strings = {
  appName: 'Yaniv',
  tagline: 'The card drinking game, on your phone',
  createTable: 'Create a table',
  joinTable: 'Join',
  hotseat: 'Play on one phone',

  players: 'Players',
  addPlayer: '+ player',
  removePlayer: 'remove',
  startGame: 'Start the game',
  playerNamePlaceholder: 'Name',

  dealing: 'dealing the cards…',

  finalTitle: 'Game over',
  backHome: 'Back to start',
  close: 'Close',

  lobbyTitle: 'Table',
  roomCodeLabel: 'table code',
  scanToJoin: 'Scan to join',
  copyLink: 'Copy link',
  copied: 'Copied!',
  shareLink: 'Share link',
  leaveTable: 'Leave table',
  closeTable: 'Close table',
  waitingForPlayers: 'Waiting for players…',
  reconnecting: 'reconnecting…',
  offline: 'offline',
  round: (n: number) => `round ${n}`,
  waitForHost: 'The host continues…',
  needMorePlayers: 'Waiting for at least one other player…',
  soundOn: 'sound on',
  soundOff: 'sound off',
  stopGame: 'Stop the game',
  endGame: 'End the game',
  yourName: 'Your name',
  codePlaceholder: 'Code (e.g. ABCD)',
  makeTable: 'Create table',
  joinNow: 'Join',
  connecting: 'Connecting…',
  rulesTitle: 'Rules',
  rulesExplainTitle: 'How does Yaniv work?',
  rulesExplain: [
    [
      'Your hand',
      'Everyone plays with 5 cards. On your turn you discard cards (a single card, a set of the same rank, or a run of consecutive cards) and draw one card, from the deck or the top of the discard pile. Ace counts 1, jack/queen/king count 10, and the joker counts -1 (and may fill a gap in a run).',
    ],
    [
      'Calling Yaniv',
      'Once your hand value is 5 or lower, you may call "Yaniv" at the start of your turn. Every other player then gets one more turn, and only then is the round scored. If you are the lowest, everyone else adds the difference with your hand to their score. If someone ties or is lower (Assaf), the call failed and you take the points yourself: 10 on a tie, otherwise the difference times 10.',
    ],
    [
      'Baks',
      'Points build up across rounds. Reach 30 or more and you draw a bak (minus 20 points). Below 30 you may buy off half a bak: 10 sips for 10 points off. Play for as long as you like.',
    ],
  ],
  ruleLabels: {
    handSize: 'Cards per hand',
    yousefMax: 'Call Yaniv up to',
    jokerWildcard: 'Joker as wildcard',
    assafEveryoneScores: 'Everyone scores on Assaf',
    bakThreshold: 'Draw a bak from',
  },
  net: {
    hostFailed: 'Could not create the table; check your internet and try again',
    joinFailed: 'Could not join; is the code correct?',
    tableClosed: 'The table is closed or unreachable',
  },

  yousef: {
    passTitle: (name) => `Pass the phone to ${name}`,
    passHint: 'so no one else sees your hand',
    showHand: 'Show my hand',
    waitingFor: (name) => `Waiting for ${name}`,
    reviewHint: 'Your new hand, start thinking',
    passButton: (name) => `Pass to ${name}`,
    finalLap: 'Final turn after Yaniv',
    handValue: (n) => `hand value ${n}`,
    deck: 'deck',
    discardPile: 'discard pile',
    drawDeck: 'Draw from the deck',
    drawDiscard: 'Take this card',
    pickCards: 'Pick card(s) to discard, then draw one card',
    invalidGroup: 'Not a valid set or run',
    callYousef: 'Yaniv!',
    yousefLocked: (n) => `Yaniv allowed at ${n} or lower`,
    points: (n) => `${n} pt`,
    roundOver: 'Round over',
    called: (name) => `${name} called Yaniv`,
    clean: 'Clean Yaniv',
    assaf: 'Assaf: wrong call',
    gained: (n) => (n > 0 ? `+${n}` : `${n}`),
    drawBak: 'Draw a bak (−20)',
    buyOff: 'Buy off half a bak (10 sips, −10)',
    nextRound: 'Next round',
    bakPending: 'Draw all pending baks first',
    finalStandings: 'Final standings',
  },

  errors: {
    WRONG_PHASE: 'That is not possible right now',
    NOT_YOUR_TURN: 'It is not your turn',
    NOT_ENOUGH_PLAYERS: 'At least two players needed',
    ALREADY_JOINED: 'That player is already in',
    UNKNOWN_PLAYER: 'Unknown player',
    CARD_NOT_IN_HAND: 'That card is not in your hand',
    INVALID_GROUP: 'Not a valid set or run',
    HAND_TOO_HIGH: 'Your hand is too high to call Yaniv',
    EMPTY_DISCARD: 'The discard pile is empty',
    NO_BAK_DUE: 'You do not need to draw a bak',
    CANNOT_BUY_OFF: 'You cannot buy off here',
    BAK_PENDING: 'Draw the pending bak first',
    INVALID_RULES: 'Invalid settings',
    GAME_FULL: 'The table is full',
    MALFORMED: 'Received an unreadable message',
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
