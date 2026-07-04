/** Alle UI-teksten centraal, Nederlands. Geen i18n-lib nodig. */
export const strings = {
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
} as const
