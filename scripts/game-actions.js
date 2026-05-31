import { ATTENDANCE_FEE, FIRST_RAISE_MAX, FIRST_RAISE_MIN, PHASES, SECOND_RAISE_MAX, SIDES } from "./constants.js";
import { createDeck, draw, shuffle } from "./cards.js";
import { compareHands } from "./hand-evaluator.js";
import { clone, emptyState, resetBetting } from "./state.js";
import { otherSide, sideLabel } from "./permissions.js";

export function currentRaiseLimits(state) {
  const existingBet = Number(state.betting?.currentBet) || 0;
  if (state.phase === PHASES.FIRST_BETTING) return { min: Math.max(FIRST_RAISE_MIN, existingBet + 1), max: FIRST_RAISE_MAX, callAmount: existingBet };
  if (state.phase === PHASES.SECOND_BETTING) {
    return {
      min: Math.max(FIRST_RAISE_MIN, state.betting.firstRoundBet || FIRST_RAISE_MIN, existingBet + 1),
      max: SECOND_RAISE_MAX,
      callAmount: existingBet
    };
  }
  return null;
}

export function startMatch({ gmChips, playerChips, operatorUserId, dealer }) {
  const state = emptyState();
  state.operatorUserId = operatorUserId || "";
  state.dealer = dealer || SIDES.GM;
  state.turn = state.dealer;
  state.chips[SIDES.GM] = Number(gmChips) || 100;
  state.chips[SIDES.PLAYERS] = Number(playerChips) || 100;
  return beginRound(state, false);
}

export function beginRound(state, keepChips = true) {
  const next = clone(state);
  const round = keepChips ? next.round + 1 : 1;
  const deck = shuffle(createDeck());
  const gmDraw = draw(deck, 5);
  const playerDraw = draw(gmDraw.deck, 5);

  next.active = true;
  next.round = round;
  next.phase = PHASES.FIRST_BETTING;
  next.turn = next.dealer || SIDES.GM;
  next.committed = { [SIDES.GM]: 0, [SIDES.PLAYERS]: 0 };
  next.house += ATTENDANCE_FEE * 2;
  next.chips[SIDES.GM] = Math.max(0, Number(next.chips[SIDES.GM]) - ATTENDANCE_FEE);
  next.chips[SIDES.PLAYERS] = Math.max(0, Number(next.chips[SIDES.PLAYERS]) - ATTENDANCE_FEE);
  next.deck = playerDraw.deck;
  next.hands = {
    [SIDES.GM]: gmDraw.cards,
    [SIDES.PLAYERS]: playerDraw.cards
  };
  next.exchangeDone = { [SIDES.GM]: false, [SIDES.PLAYERS]: false };
  next.betting = resetBetting(0);
  next.result = null;
  next.lastAction = `Round ${round} started. Attendance fees went to the house. ${sideLabel(next.turn)} acts first.`;
  return next;
}

export function handleRaise(state, side, amount) {
  validateTurn(state, side);
  const limits = currentRaiseLimits(state);
  const value = Number(amount);
  if (!Number.isInteger(value)) throw new Error("Raise amount must be an integer.");
  if (value < limits.min || value > limits.max) throw new Error(`Raise must be between ${limits.min} and ${limits.max}.`);

  const next = clone(state);
  const needed = value - (Number(next.betting.phaseCommitted[side]) || 0);
  if (needed <= 0) throw new Error("Raise must increase this side's current betting commitment.");
  commitChips(next, side, needed);
  next.betting.currentBet = value;
  next.betting.lastRaiseSide = side;
  next.betting.consecutiveCalls[side] = 0;
  next.betting.consecutiveCalls[otherSide(side)] = 0;
  next.turn = otherSide(side);
  next.lastAction = `${sideLabel(side)} raised ${value}.`;
  return next;
}

export function handleCall(state, side) {
  validateTurn(state, side);
  const next = clone(state);
  const currentBet = Number(next.betting.currentBet) || 0;

  if (currentBet > 0 && next.betting.lastRaiseSide && next.betting.lastRaiseSide !== side) {
    const needed = currentBet - (Number(next.betting.phaseCommitted[side]) || 0);
    if (needed > 0) commitChips(next, side, needed);
    if (next.phase === PHASES.FIRST_BETTING) {
      next.betting.firstRoundBet = currentBet;
      next.lastAction = `${sideLabel(side)} called ${currentBet}. GM may confirm exchange.`;
    } else {
      next.lastAction = `${sideLabel(side)} called ${currentBet}. GM may confirm showdown.`;
    }
    next.turn = null;
    return next;
  }

  next.betting.consecutiveCalls[side] += 1;
  next.lastAction = `${sideLabel(side)} called.`;
  if (next.betting.consecutiveCalls[side] >= 2) return finishDraw(next, "A side called twice. The round is a draw.");
  next.turn = otherSide(side);
  return next;
}

export function handleFold(state, side) {
  validateTurn(state, side);
  const next = clone(state);
  const winner = otherSide(side);
  next.chips[winner] += next.committed[side] + next.committed[winner];
  next.committed[side] = 0;
  next.committed[winner] = 0;
  next.result = {
    winner,
    reason: `${sideLabel(side)} folded.`,
    handRank: null
  };
  next.phase = PHASES.ROUND_END;
  next.turn = null;
  next.lastAction = `${sideLabel(side)} folded. ${sideLabel(winner)} receives the folding side's non-attendance committed chips.`;
  return maybeEndMatch(next);
}

export function handleExchange(state, side, indexes) {
  requireActive(state);
  if (state.phase !== PHASES.EXCHANGE) throw new Error("Cards can only be exchanged during the exchange phase.");
  const unique = [...new Set(indexes.map((index) => Number(index)))].filter((index) => Number.isInteger(index) && index >= 0 && index < 5);
  if (unique.length > 5) throw new Error("You can exchange at most 5 cards.");
  if (state.exchangeDone[side]) throw new Error(`${sideLabel(side)} has already exchanged cards.`);

  const next = clone(state);
  const drawResult = draw(next.deck, unique.length);
  const hand = [...next.hands[side]];
  unique.forEach((handIndex, drawIndex) => {
    hand[handIndex] = drawResult.cards[drawIndex];
  });
  next.hands[side] = hand;
  next.deck = drawResult.deck;
  next.exchangeDone[side] = true;
  next.lastAction = `${sideLabel(side)} exchanged ${unique.length} card${unique.length === 1 ? "" : "s"}.`;
  return next;
}

export function confirmNextPhase(state) {
  requireActive(state);
  const next = clone(state);

  if (next.phase === PHASES.FIRST_BETTING) {
    if (next.turn) throw new Error("Resolve the first betting action before moving to exchange.");
    next.phase = PHASES.EXCHANGE;
    next.exchangeDone = { [SIDES.GM]: false, [SIDES.PLAYERS]: false };
    next.lastAction = "GM opened the exchange phase.";
    return next;
  }

  if (next.phase === PHASES.EXCHANGE) {
    if (!next.exchangeDone[SIDES.GM] || !next.exchangeDone[SIDES.PLAYERS]) {
      throw new Error("Both sides must finish exchanging cards before second betting.");
    }
    next.phase = PHASES.SECOND_BETTING;
    next.turn = next.dealer || SIDES.GM;
    next.betting = resetBetting(next.betting.firstRoundBet);
    next.lastAction = `GM opened second betting. Minimum raise is ${currentRaiseLimits(next).min}.`;
    return next;
  }

  if (next.phase === PHASES.SECOND_BETTING) {
    if (next.turn) throw new Error("Resolve the second betting action before showdown.");
    next.phase = PHASES.SHOWDOWN;
    next.lastAction = "GM opened showdown.";
    return next;
  }

  if (next.phase === PHASES.SHOWDOWN) return finishShowdown(next);

  if (next.phase === PHASES.ROUND_END) {
    if (next.round >= next.maxRounds) return maybeEndMatch(next);
    return beginRound(next, true);
  }

  throw new Error("No next phase is available.");
}

function requireActive(state) {
  if (!state.active) throw new Error("Start a match first.");
}

function validateTurn(state, side) {
  requireActive(state);
  if (![PHASES.FIRST_BETTING, PHASES.SECOND_BETTING].includes(state.phase)) {
    throw new Error("Betting actions are only available during betting phases.");
  }
  if (state.turn !== side) throw new Error(`It is ${sideLabel(state.turn)}' turn.`);
}

function commitChips(state, side, amount) {
  const value = Number(amount);
  if (!Number.isInteger(value) || value <= 0) throw new Error("Raise amount must be a positive integer.");
  if (state.chips[side] < value) throw new Error(`${sideLabel(side)} does not have enough chips.`);
  state.chips[side] -= value;
  state.committed[side] += value;
  state.betting.phaseCommitted[side] += value;
}

function finishDraw(state, reason) {
  const next = clone(state);
  next.chips[SIDES.GM] += next.committed[SIDES.GM];
  next.chips[SIDES.PLAYERS] += next.committed[SIDES.PLAYERS];
  next.committed = { [SIDES.GM]: 0, [SIDES.PLAYERS]: 0 };
  next.result = { winner: null, reason, handRank: null };
  next.phase = PHASES.ROUND_END;
  next.turn = null;
  next.lastAction = `${reason} Non-attendance chips returned; attendance remains with the house.`;
  return maybeEndMatch(next);
}

function finishShowdown(state) {
  const next = clone(state);
  const comparison = compareHands(next.hands[SIDES.GM], next.hands[SIDES.PLAYERS]);
  const pot = next.committed[SIDES.GM] + next.committed[SIDES.PLAYERS];

  if (comparison.winner) {
    next.chips[comparison.winner] += pot;
    next.result = {
      winner: comparison.winner,
      reason: `${sideLabel(comparison.winner)} wins the showdown.`,
      handRank: comparison[comparison.winner === SIDES.GM ? "gm" : "players"].label,
      hands: comparison
    };
    next.lastAction = `${sideLabel(comparison.winner)} wins ${pot} chips with ${next.result.handRank}.`;
  } else {
    next.chips[SIDES.GM] += next.committed[SIDES.GM];
    next.chips[SIDES.PLAYERS] += next.committed[SIDES.PLAYERS];
    next.result = {
      winner: null,
      reason: "Showdown tied.",
      handRank: comparison.gm.label,
      hands: comparison
    };
    next.lastAction = "Showdown tied. Non-attendance chips returned; attendance remains with the house.";
  }

  next.committed = { [SIDES.GM]: 0, [SIDES.PLAYERS]: 0 };
  next.phase = PHASES.ROUND_END;
  next.turn = null;
  return maybeEndMatch(next);
}

function maybeEndMatch(state) {
  const next = clone(state);
  if (next.round >= next.maxRounds) {
    next.phase = PHASES.MATCH_END;
    next.active = false;
    const gm = next.chips[SIDES.GM];
    const players = next.chips[SIDES.PLAYERS];
    const winner = gm > players ? SIDES.GM : players > gm ? SIDES.PLAYERS : null;
    next.result = {
      ...(next.result || {}),
      matchWinner: winner,
      matchReason: winner ? `${sideLabel(winner)} wins the match by chip total.` : "The match ends tied by chip total."
    };
    next.lastAction = `${next.lastAction} ${next.result.matchReason}`;
  }
  return next;
}
