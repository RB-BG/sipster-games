// Copyright © 2026 Kingsen. PolyForm Noncommercial License 1.0.0 (see LICENSE).

/**
 * Alle UI-teksten centraal. Geen i18n-lib: `nl` is de bron, `type Strings` is
 * afgeleid uit `nl` en dwingt elke andere taal af tot dezelfde keys en
 * functie-signaturen. Bewust géén `as const`, anders zouden de teksten
 * letterlijke types worden en kon geen enkele vertaling het type halen.
 */
export const nl = {
  appName: 'Bussen',
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
  turnOf: 'is aan de beurt',
  passPhone: (name: string) => `Geef de telefoon aan ${name}`,
  dealing: 'kaart wordt gedraaid…',
  cardsLeft: (n: number) => (n === 1 ? '1 kaart' : `${n} kaarten`),

  // Vragenrondje
  questionsPhase: 'Vragenrondje',
  questionTitle: (i: number): string =>
    ['Rood of zwart?', 'Hoger of lager?', 'Binnen of buiten?', 'Heb je deze kleur al?'][i] ?? '',
  questionSub: (i: number): string =>
    [
      'raad de kleur van de kaart',
      'hoger of lager dan de vorige kaart (gelijk = fout)',
      'valt de kaart tussen je vorige twee in?',
      'heb je deze kleursoort al in je hand?',
    ][i] ?? '',
  answerLabel: (choice: string): string =>
    (
      ({
        rood: 'Rood',
        zwart: 'Zwart',
        hoger: 'Hoger',
        lager: 'Lager',
        binnen: 'Binnen',
        buiten: 'Buiten',
        heb: 'Heb ik',
        niet: 'Heb ik niet',
      }) as Record<string, string>
    )[choice] ?? choice,

  // Slokken uitdelen
  giveTitle: (n: number) => `Deel ${n} ${n === 1 ? 'slok' : 'slokken'} uit aan:`,
  waitingForGive: (name: string) => `${name} deelt slokken uit…`,

  // Piramide
  pyramidPhase: 'De piramide',
  flipCard: 'Draai de volgende kaart',
  pyramidHint: 'Heb je deze rank? Claim en deel slokken uit, of bluf erop los.',
  claimRank: (rank: string) => `Claim een ${rank}`,
  claim: 'Claim',
  callBluff: 'Call bluff!',
  startBus: 'Start de bus',
  driverIs: (names: string) => `${names} rijdt de bus`,
  waitingForFlip: 'De host draait de kaarten om…',

  // Bus
  busPhase: 'De bus',
  busDriver: (name: string) => `${name} rijdt de bus`,
  higher: 'Hoger',
  lower: 'Lager',
  busPosition: (pos: number, total: number) => `kaart ${pos} van ${total}`,
  busResetMsg: 'Fout! De bus begint opnieuw',
  waitingForBus: (name: string) => `${name} rijdt de bus…`,

  // Call bluff / knallen
  bluffVerdict: (name: string, verdict: string): string =>
    verdict === 'betrapt'
      ? `${name} is betrapt: dubbel drinken`
      : 'Valse beschuldiging: dubbel drinken',
  popText: (kind: string, name: string): string => {
    switch (kind) {
      case 'correct':
        return 'Goed! Deel slokken uit'
      case 'fout':
        return 'Fout, drinken!'
      case 'bluf-betrapt':
        return `${name} loog: dubbel drinken`
      case 'bluf-mis':
        return 'Valse beschuldiging: dubbel'
      case 'bus-af':
        return 'Bus af! Opnieuw beginnen'
      case 'bus-uit':
        return 'De bus is uit!'
      default:
        return ''
    }
  },

  // Einde
  finalTitle: 'Eindstand',
  wettest: (name: string) => `${name} heeft de natste keel`,
  sips: 'slokken',
  drinks: (n: number) => (n === 1 ? 'drinkt 1 slok' : `drinkt ${n} slokken`),
  backHome: 'Terug naar start',

  // Kaarten van een speler bekijken (tik op de chip)
  handTitle: (name: string) => `Kaarten van ${name}`,
  handEmpty: 'Geen kaarten meer',
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
  skipTurn: 'Sla beurt over',
  waitForHost: 'De host gaat verder…',
  needMorePlayers: 'Wachten op minstens één medespeler…',
  connectionLost: 'Verbinding kwijt; opnieuw verbinden…',
  tableGone: 'De tafel is gesloten',
  soundOn: 'geluid aan',
  soundOff: 'geluid uit',
  stopGame: 'Stop het potje',
  endGame: 'Sluit het potje af',
  sipsLogTitle: 'Slokken-log',
  sipReasons: {
    fout: 'fout geraden',
    gekregen: 'gekregen',
    bluf: 'bluf',
    bus: 'bus',
  } as Record<string, string>,
  yourName: 'Jouw naam',
  codePlaceholder: 'Code (bv. ABCD)',
  makeTable: 'Maak tafel',
  joinNow: 'Doe mee',
  connecting: 'Verbinden…',
  rulesTitle: 'Regels',
  rulesExplainTitle: 'Hoe werkt bussen?',
  rulesExplain: [
    [
      'Vragenrondje',
      'Elke speler beantwoordt vier vragen: rood of zwart, hoger of lager, binnen of buiten, en heb je de kleur al. Goed geraden: jij deelt slokken uit (1, 2, 3 of 4). Fout: jij drinkt. De vier kaarten blijven je hand voor de piramide.',
    ],
    [
      'Piramide',
      'De host draait de piramide kaart voor kaart om, van onder (1 slok) naar boven (5 slokken). Heb je die rank in je hand? Claim de kaart en deel de slokken van die rij uit.',
    ],
    [
      'Liegen',
      'Met de bluf-regel mag je claimen zonder de kaart. Betrapt iemand je met call bluff, dan drink je dubbel. Zit de beschuldiger ernaast, dan drinkt die dubbel.',
    ],
    [
      'De bus',
      'Wie na de piramide de meeste kaarten overhoudt, rijdt de bus: gok hoger of lager voor elke volgende kaart. Fout betekent drinken en opnieuw beginnen; alles goed en de bus is uitgereden.',
    ],
  ] as [string, string][],
  ruleLabels: {
    standaardSlokken: 'Slokken-eenheid',
    busLengte: 'Lengte van de bus',
    bluffen: 'Liegen (bluffen) toestaan',
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
    PENDING_GIVE: 'Eerst je slokken uitdelen',
    NOT_PENDING_GIVE: 'Je hebt geen slokken uit te delen',
    INVALID_CHOICE: 'Ongeldige keuze',
    INVALID_CARD: 'Die kaart kan niet',
    INVALID_TARGET: 'Kies een andere speler',
    NO_OPEN_CLAIM: 'Er staat geen claim open',
    CLAIM_IN_PROGRESS: 'Er loopt al een claim',
    NOTHING_TO_FLIP: 'De piramide is helemaal omgedraaid',
    NOT_A_DRIVER: 'Alleen de buschauffeur mag gokken',
    INVALID_RULES: 'Ongeldige instellingen',
  } as Record<string, string>,
}

/**
 * Engelse vertaling. De structuur en functie-signaturen kloppen (het type
 * dwingt dat af); de toon is een eerste opzet die een native speler mag
 * nalezen.
 */
const en: Strings = {
  appName: 'Bussen',
  tagline: 'The card drinking game, on your phone',
  createTable: 'Create a table',
  joinTable: 'Join',
  hotseat: 'Play on one phone',

  players: 'Players',
  addPlayer: '+ player',
  removePlayer: 'remove',
  startGame: 'Start the game',
  playerNamePlaceholder: 'Name',

  turnOf: 'is up',
  passPhone: (name) => `Pass the phone to ${name}`,
  dealing: 'flipping the card…',
  cardsLeft: (n) => (n === 1 ? '1 card' : `${n} cards`),

  questionsPhase: 'Question round',
  questionTitle: (i) =>
    ['Red or black?', 'Higher or lower?', 'Inside or outside?', 'Got this suit already?'][i] ?? '',
  questionSub: (i) =>
    [
      'guess the colour of the card',
      'higher or lower than the last card (tie = wrong)',
      'does the card fall between your last two?',
      'do you already hold this suit?',
    ][i] ?? '',
  answerLabel: (choice) =>
    (
      ({
        rood: 'Red',
        zwart: 'Black',
        hoger: 'Higher',
        lager: 'Lower',
        binnen: 'Inside',
        buiten: 'Outside',
        heb: 'I have it',
        niet: 'I do not',
      }) as Record<string, string>
    )[choice] ?? choice,

  giveTitle: (n) => `Hand out ${n} ${n === 1 ? 'sip' : 'sips'} to:`,
  waitingForGive: (name) => `${name} is handing out sips…`,

  pyramidPhase: 'The pyramid',
  flipCard: 'Flip the next card',
  pyramidHint: 'Got this rank? Claim it and hand out sips, or bluff.',
  claimRank: (rank) => `Claim a ${rank}`,
  claim: 'Claim',
  callBluff: 'Call bluff!',
  startBus: 'Start the bus',
  driverIs: (names) => `${names} rides the bus`,
  waitingForFlip: 'The host is flipping the cards…',

  busPhase: 'The bus',
  busDriver: (name) => `${name} rides the bus`,
  higher: 'Higher',
  lower: 'Lower',
  busPosition: (pos, total) => `card ${pos} of ${total}`,
  busResetMsg: 'Wrong! The bus starts over',
  waitingForBus: (name) => `${name} is riding the bus…`,

  bluffVerdict: (name, verdict) =>
    verdict === 'betrapt'
      ? `${name} got caught: drink double`
      : 'False accusation: drink double',
  popText: (kind, name) => {
    switch (kind) {
      case 'correct':
        return 'Correct! Hand out sips'
      case 'fout':
        return 'Wrong, drink!'
      case 'bluf-betrapt':
        return `${name} lied: drink double`
      case 'bluf-mis':
        return 'False accusation: double'
      case 'bus-af':
        return 'Bus crashed! Start over'
      case 'bus-uit':
        return 'The bus is home!'
      default:
        return ''
    }
  },

  finalTitle: 'Final score',
  wettest: (name) => `${name} has the wettest whistle`,
  sips: 'sips',
  drinks: (n) => (n === 1 ? 'drinks 1 sip' : `drinks ${n} sips`),
  backHome: 'Back to start',

  handTitle: (name) => `${name}'s cards`,
  handEmpty: 'No cards left',
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
  skipTurn: 'Skip turn',
  waitForHost: 'The host continues…',
  needMorePlayers: 'Waiting for at least one other player…',
  connectionLost: 'Connection lost; reconnecting…',
  tableGone: 'The table has closed',
  soundOn: 'sound on',
  soundOff: 'sound off',
  stopGame: 'Stop the game',
  endGame: 'End the game',
  sipsLogTitle: 'Sips log',
  sipReasons: {
    fout: 'guessed wrong',
    gekregen: 'received',
    bluf: 'bluff',
    bus: 'bus',
  },
  yourName: 'Your name',
  codePlaceholder: 'Code (e.g. ABCD)',
  makeTable: 'Create table',
  joinNow: 'Join',
  connecting: 'Connecting…',
  rulesTitle: 'Rules',
  rulesExplainTitle: 'How does bussen work?',
  rulesExplain: [
    [
      'Question round',
      'Each player answers four questions: red or black, higher or lower, inside or outside, and do you already hold the suit. Correct: you hand out sips (1, 2, 3 or 4). Wrong: you drink. The four cards stay your hand for the pyramid.',
    ],
    [
      'Pyramid',
      'The host flips the pyramid card by card, from the bottom (1 sip) to the top (5 sips). Hold that rank? Claim the card and hand out that row of sips.',
    ],
    [
      'Bluffing',
      'With the bluff rule you may claim without the card. If someone calls your bluff, you drink double. If the accuser is wrong, they drink double.',
    ],
    [
      'The bus',
      'Whoever holds the most cards after the pyramid rides the bus: guess higher or lower for each next card. Wrong means drink and start over; all right and the bus is home.',
    ],
  ],
  ruleLabels: {
    standaardSlokken: 'Sip unit',
    busLengte: 'Bus length',
    bluffen: 'Allow bluffing',
  },
  net: {
    hostFailed: 'Could not create the table; check your internet and try again',
    joinFailed: 'Could not join; is the code correct?',
    tableClosed: 'The table is closed or unreachable',
  },

  errors: {
    WRONG_PHASE: 'That is not possible right now',
    NOT_YOUR_TURN: 'It is not your turn',
    NOT_ENOUGH_PLAYERS: 'At least two players needed',
    ALREADY_JOINED: 'That player is already in',
    UNKNOWN_PLAYER: 'Unknown player',
    PENDING_GIVE: 'Hand out your sips first',
    NOT_PENDING_GIVE: 'You have no sips to hand out',
    INVALID_CHOICE: 'Invalid choice',
    INVALID_CARD: 'That card is not allowed',
    INVALID_TARGET: 'Pick another player',
    NO_OPEN_CLAIM: 'There is no open claim',
    CLAIM_IN_PROGRESS: 'A claim is already in progress',
    NOTHING_TO_FLIP: 'The pyramid is fully flipped',
    NOT_A_DRIVER: 'Only the bus driver may guess',
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
