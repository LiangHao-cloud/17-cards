export const MODULE_ID = "17-cards";
export const SOCKET = `module.${MODULE_ID}`;
export const STATE_SETTING = "state";

export const ATTENDANCE_FEE = 5;
export const MAX_ROUNDS = 10;
export const FIRST_RAISE_MIN = 5;
export const FIRST_RAISE_MAX = 15;
export const SECOND_RAISE_MAX = 30;

export const SIDES = {
  GM: "gm",
  PLAYERS: "players"
};

export const PHASES = {
  SETUP: "setup",
  FIRST_BETTING: "firstBetting",
  EXCHANGE: "exchange",
  SECOND_BETTING: "secondBetting",
  SHOWDOWN: "showdown",
  ROUND_END: "roundEnd",
  MATCH_END: "matchEnd"
};

export const PHASE_LABELS = {
  [PHASES.SETUP]: "Setup",
  [PHASES.FIRST_BETTING]: "First Betting",
  [PHASES.EXCHANGE]: "Exchange",
  [PHASES.SECOND_BETTING]: "Second Betting",
  [PHASES.SHOWDOWN]: "Showdown",
  [PHASES.ROUND_END]: "Round End",
  [PHASES.MATCH_END]: "Match End"
};

export const SUITS = [
  { id: "spades", label: "Spades", symbol: "S" },
  { id: "hearts", label: "Hearts", symbol: "H" },
  { id: "diamonds", label: "Diamonds", symbol: "D" },
  { id: "clubs", label: "Clubs", symbol: "C" }
];

export const RANKS = [
  { id: "J", value: 11 },
  { id: "Q", value: 12 },
  { id: "K", value: 13 },
  { id: "A", value: 14 }
];
