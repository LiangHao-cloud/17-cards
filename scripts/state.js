import { MAX_ROUNDS, MODULE_ID, PHASES, SIDES, STATE_SETTING } from "./constants.js";

export function clone(data) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(data);
  if (globalThis.structuredClone) return structuredClone(data);
  return JSON.parse(JSON.stringify(data));
}

export function emptyState() {
  return {
    active: false,
    phase: PHASES.SETUP,
    round: 0,
    maxRounds: MAX_ROUNDS,
    operatorUserId: "",
    dealer: SIDES.GM,
    turn: SIDES.GM,
    chips: {
      [SIDES.GM]: 100,
      [SIDES.PLAYERS]: 100
    },
    committed: {
      [SIDES.GM]: 0,
      [SIDES.PLAYERS]: 0
    },
    house: 0,
    deck: [],
    hands: {
      [SIDES.GM]: [],
      [SIDES.PLAYERS]: []
    },
    exchangeDone: {
      [SIDES.GM]: false,
      [SIDES.PLAYERS]: false
    },
    roundLogs: emptyRoundLogs(),
    betting: resetBetting(),
    lastAction: "No game has started.",
    result: null
  };
}

export function emptyRoundLogs() {
  return {
    actions: [],
    exchanges: {
      [SIDES.GM]: [],
      [SIDES.PLAYERS]: []
    }
  };
}

export function resetBetting(firstRoundBet = 0) {
  return {
    currentBet: 0,
    firstRoundBet,
    lastRaiseSide: null,
    consecutiveCalls: {
      [SIDES.GM]: 0,
      [SIDES.PLAYERS]: 0
    },
    phaseCommitted: {
      [SIDES.GM]: 0,
      [SIDES.PLAYERS]: 0
    }
  };
}

export function getState() {
  return game.settings.get(MODULE_ID, STATE_SETTING);
}

export async function setState(state) {
  await game.settings.set(MODULE_ID, STATE_SETTING, state);
}
