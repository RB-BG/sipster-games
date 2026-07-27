// Copyright © 2026 Kaartspel. PolyForm Noncommercial License 1.0.0 (see LICENSE).

import type { Rank } from '@/engine/types'

/**
 * De kaartacties per rang. De namen en instructies volgen `docs/kaartspel-regels.md`.
 * Los van het `nl`/`en`-object gehouden zodat de functies er netjes uit kunnen putten.
 */
interface CardText {
  name: string
  instruction: string
}

const CARD_NL: Record<Rank, CardText> = {
  2: { name: 'Jij', instruction: 'Wijs iemand aan; die drinkt.' },
  3: { name: 'Ik', instruction: 'Je drinkt zelf.' },
  4: { name: 'Vrouwen', instruction: 'Alle vrouwen drinken.' },
  5: { name: 'Nieuwe regel', instruction: 'Verzin een regel die de rest van het potje geldt.' },
  6: { name: 'Mannen', instruction: 'Alle mannen drinken.' },
  7: { name: 'Hemel', instruction: 'Iedereen steekt zijn hand omhoog; de laatste drinkt.' },
  8: { name: 'Maatje', instruction: 'Kies een drinkmaatje; die drinkt met je mee tot de volgende 8.' },
  9: { name: 'Rijmen', instruction: 'Zeg een woord. Om de beurt rijmen; wie faalt, drinkt.' },
  10: { name: 'Categorie', instruction: 'Noem een categorie. Om de beurt een voorbeeld; wie faalt of herhaalt, drinkt.' },
  11: { name: 'Duimmeester', instruction: 'Leg ongemerkt je duim op tafel; de laatste die volgt, drinkt. Geldt de rest van het potje.' },
  12: { name: 'Vraagmeester', instruction: 'Stel spelers vragen; wie antwoordt, drinkt. Geldt de rest van het potje.' },
  13: { name: "King's Cup", instruction: 'Schenk slokken in het glas. De 4e koning drinkt het glas leeg: einde potje.' },
  14: { name: 'Waterval', instruction: 'Iedereen drinkt tegelijk; stoppen mag pas als de speler vóór je stopt.' },
}

const CARD_EN: Record<Rank, CardText> = {
  2: { name: 'You', instruction: 'Point at someone; they drink.' },
  3: { name: 'Me', instruction: 'You drink.' },
  4: { name: 'Women', instruction: 'All women drink.' },
  5: { name: 'New rule', instruction: 'Make up a rule for the rest of the game.' },
  6: { name: 'Men', instruction: 'All men drink.' },
  7: { name: 'Heaven', instruction: 'Everyone raises a hand; the last one drinks.' },
  8: { name: 'Mate', instruction: 'Pick a drinking mate who drinks along until the next 8.' },
  9: { name: 'Rhyme', instruction: 'Say a word. Take turns rhyming; whoever fails, drinks.' },
  10: { name: 'Category', instruction: 'Name a category. Take turns naming one; whoever fails or repeats, drinks.' },
  11: { name: 'Thumb master', instruction: 'Sneak your thumb onto the table; the last to follow drinks. Lasts the whole game.' },
  12: { name: 'Question master', instruction: 'Ask players questions; whoever answers, drinks. Lasts the whole game.' },
  13: { name: "King's Cup", instruction: 'Pour sips into the glass. The 4th king drinks it dry: game over.' },
  14: { name: 'Waterfall', instruction: 'Everyone drinks at once; you may stop only after the player before you does.' },
}

/** Roltekentje bij de spelerchip (taal-neutraal). */
function roleBadgeFor(rank: Rank): string {
  if (rank === 11) return '👍'
  if (rank === 12) return '❓'
  return ''
}

/**
 * Alle UI-teksten centraal. Geen i18n-lib: `nl` is de bron, `type Strings` is
 * afgeleid uit `nl` en dwingt elke andere taal af tot dezelfde keys en
 * functie-signaturen. Bewust géén `as const`, anders zouden de teksten
 * letterlijke types worden en kon geen enkele vertaling het type halen.
 */
export const nl = {
  appName: 'Kaartspel',
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
  flipCard: 'Draai de volgende kaart',
  waitingForFlip: (name: string) => `${name} draait de kaart…`,

  // Kaartacties
  cardName: (rank: Rank) => CARD_NL[rank].name,
  cardInstruction: (rank: Rank) => CARD_NL[rank].instruction,
  roleBadge: (rank: Rank) => roleBadgeFor(rank),
  activeRulesTitle: 'Regels op tafel',

  // King's Cup
  cupTitle: "King's Cup",
  cupSips: (n: number) => (n === 1 ? '1 slok in het glas' : `${n} slokken in het glas`),
  kingsCount: (n: number) => `Koning ${n} van 4`,
  pourPrompt: 'Schenk slokken in het glas',
  pour: 'Schenk in',
  drinkCup: (n: number) =>
    n === 1 ? 'Drink het glas leeg (1 slok)' : `Drink het glas leeg (${n} slokken)`,

  // Nieuwe regel
  ruleInputPrompt: 'Verzin een nieuwe regel',
  rulePlaceholder: 'Bv. niet vloeken',
  saveRule: 'Vastleggen',

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
  skipTurn: 'Sla beurt over',
  round: (n: number) => `ronde ${n}`,
  // Slokken-scorebord op de chips.
  scoreLegend: 'deze ronde / totaal 🍺',
  assignHint: 'tik een speler om slokken uit te delen',
  assignGive: (n: number) => `geven +${n} 🍺`,
  assignTake: (n: number) => `corrigeren −${n} 🍺`,
  waitForHost: 'De host gaat verder…',
  needMorePlayers: 'Wachten op minstens één medespeler…',
  connectionLost: 'Verbinding kwijt; opnieuw verbinden…',
  tableGone: 'De tafel is gesloten',
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
  rulesExplainTitle: 'Hoe werkt Kaartspel?',
  rulesExplain: [
    [
      'De hand',
      'Iedereen speelt met 5 kaarten. Om de beurt leg je kaarten af (een losse kaart, een setje van dezelfde rang, of een straat van opeenvolgende kaarten) en trek je één kaart, van de stapel of de bovenste afgelegde kaart. Aas telt 1, boer/vrouw/heer tellen 10, en de joker telt -1 (en mag een gat in een straat vullen).',
    ],
    [
      'Yousef roepen',
      'Zodra je handwaarde onder de 5 is, mag je aan het begin van je beurt "Yousef" roepen. Ben je dan de laagste, dan tellen de anderen het verschil met jouw hand bij hun score op. Zit iemand gelijk of lager (Assaf), dan is de call mislukt en krijg jij zelf de punten: 10 bij gelijk, anders het verschil keer 10.',
    ],
    [
      'Bakken',
      'De punten stapelen over de rondes. Kom je op 30 of meer, dan trek je een bak (20 punten eraf). Onder de 30 mag je een halve bak afkopen: 10 slokken voor 10 punten eraf. Je speelt zo lang je wilt.',
    ],
  ] as [string, string][],
  ruleLabels: {
    handSize: 'Kaarten per hand',
    yousefMax: 'Yousef roepen onder',
  },
  net: {
    hostFailed: 'Tafel maken lukt niet; check je internet en probeer opnieuw',
    joinFailed: 'Meedoen lukt niet; klopt de code?',
    tableClosed: 'De tafel is gesloten of onbereikbaar',
  },

  // Yousef-spel
  yousef: {
    passTitle: (name: string) => `Geef de telefoon aan ${name}`,
    passHint: 'zodat niemand anders je hand ziet',
    showHand: 'Toon mijn hand',
    waitingFor: (name: string) => `Wachten op ${name}`,
    handValue: (n: number) => `handwaarde ${n}`,
    deck: 'stapel',
    discardPile: 'aflegstapel',
    drawDeck: 'Trek van de stapel',
    drawDiscard: 'Pak deze kaart',
    pickCards: 'Kies kaart(en) om af te leggen, dan trek je één kaart',
    invalidGroup: 'Geen geldige set of straat',
    callYousef: 'Yousef!',
    yousefLocked: (n: number) => `Yousef mag onder de ${n}`,
    points: (n: number) => `${n} pt`,
    roundOver: 'Ronde afgelopen',
    called: (name: string) => `${name} riep Yousef`,
    clean: 'Schone Yousef',
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
    HAND_TOO_HIGH: 'Je hand is te hoog voor Yousef',
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
  appName: 'Kaartspel',
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
  flipCard: 'Flip the next card',
  waitingForFlip: (name) => `${name} is flipping the card…`,

  cardName: (rank) => CARD_EN[rank].name,
  cardInstruction: (rank) => CARD_EN[rank].instruction,
  roleBadge: (rank) => roleBadgeFor(rank),
  activeRulesTitle: 'Rules on the table',

  cupTitle: "King's Cup",
  cupSips: (n) => (n === 1 ? '1 sip in the glass' : `${n} sips in the glass`),
  kingsCount: (n) => `King ${n} of 4`,
  pourPrompt: 'Pour sips into the glass',
  pour: 'Pour',
  drinkCup: (n) => (n === 1 ? 'Down the glass (1 sip)' : `Down the glass (${n} sips)`),

  ruleInputPrompt: 'Make up a new rule',
  rulePlaceholder: 'E.g. no swearing',
  saveRule: 'Save',

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
  skipTurn: 'Skip turn',
  round: (n: number) => `round ${n}`,
  scoreLegend: 'this round / total 🍺',
  assignHint: 'tap a player to hand out sips',
  assignGive: (n: number) => `give +${n} 🍺`,
  assignTake: (n: number) => `fix −${n} 🍺`,
  waitForHost: 'The host continues…',
  needMorePlayers: 'Waiting for at least one other player…',
  connectionLost: 'Connection lost; reconnecting…',
  tableGone: 'The table has closed',
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
  rulesExplainTitle: 'How does Kaartspel work?',
  rulesExplain: [
    [
      'Your hand',
      'Everyone plays with 5 cards. On your turn you discard cards (a single card, a set of the same rank, or a run of consecutive cards) and draw one card, from the deck or the top of the discard pile. Ace counts 1, jack/queen/king count 10, and the joker counts -1 (and may fill a gap in a run).',
    ],
    [
      'Calling Yousef',
      'Once your hand value is below 5, you may call "Yousef" at the start of your turn. If you are the lowest, everyone else adds the difference with your hand to their score. If someone ties or is lower (Assaf), the call failed and you take the points yourself: 10 on a tie, otherwise the difference times 10.',
    ],
    [
      'Baks',
      'Points build up across rounds. Reach 30 or more and you draw a bak (minus 20 points). Below 30 you may buy off half a bak: 10 sips for 10 points off. Play for as long as you like.',
    ],
  ],
  ruleLabels: {
    handSize: 'Cards per hand',
    yousefMax: 'Call Yousef below',
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
    handValue: (n) => `hand value ${n}`,
    deck: 'deck',
    discardPile: 'discard pile',
    drawDeck: 'Draw from the deck',
    drawDiscard: 'Take this card',
    pickCards: 'Pick card(s) to discard, then draw one card',
    invalidGroup: 'Not a valid set or run',
    callYousef: 'Yousef!',
    yousefLocked: (n) => `Yousef allowed below ${n}`,
    points: (n) => `${n} pt`,
    roundOver: 'Round over',
    called: (name) => `${name} called Yousef`,
    clean: 'Clean Yousef',
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
    HAND_TOO_HIGH: 'Your hand is too high to call Yousef',
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
