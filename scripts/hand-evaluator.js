import { RANKS, SIDES, SUITS } from "./constants.js";

export function compareHands(gmHand, playerHand) {
  const gm = evaluateHand(gmHand);
  const players = evaluateHand(playerHand);
  const cmp = compareScores(gm.score, players.score);
  return { gm, players, winner: cmp > 0 ? SIDES.GM : cmp < 0 ? SIDES.PLAYERS : null };
}

export function evaluateHand(hand) {
  const normalized = hand.map(normalizeCard);
  const jokerIndex = normalized.findIndex((card) => card.joker);
  if (jokerIndex === -1) return evaluateConcreteHand(normalized);

  const naturalCards = normalized.filter((card) => !card.joker);
  const naturalSuits = new Set(naturalCards.map((card) => card.suit));
  if (naturalSuits.size === 4) return rankResult(8, [14], "Five Suits");
  if (hasRoyalRanks(naturalCards) && naturalSuits.size > 1) return rankResult(4, [14], "Straight");

  let best = null;
  for (const substitute of jokerAlternatives()) {
    const candidate = [...normalized];
    candidate[jokerIndex] = substitute;
    const score = evaluateConcreteHand(candidate);
    if (!best || compareScores(score.score, best.score) > 0) best = score;
  }
  return best;
}

export function compareScores(a, b) {
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const left = a[index] || 0;
    const right = b[index] || 0;
    if (left !== right) return left - right;
  }
  return 0;
}

function normalizeCard(card) {
  if (card.joker) return card;
  const rank = RANKS.find((entry) => entry.id === card.rank);
  return { ...card, value: rank?.value ?? card.value };
}

function jokerAlternatives() {
  const alternatives = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      alternatives.push({
        id: `joker-as-${rank.id}-${suit.id}`,
        rank: rank.id,
        value: rank.value,
        suit: suit.id,
        label: `Joker as ${suit.symbol}${rank.id}`,
        jokerSubstitute: true
      });
    }
  }
  return alternatives;
}

function evaluateConcreteHand(hand) {
  const values = hand.map((card) => card.value).sort((a, b) => b - a);
  const counts = values.reduce((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
  const groups = Object.entries(counts)
    .map(([value, count]) => ({ value: Number(value), count }))
    .sort((a, b) => b.count - a.count || b.value - a.value);
  const hasRoyalFlush = SUITS.some((suit) => RANKS.every((rank) => hand.some((card) => card.suit === suit.id && card.rank === rank.id)));

  if (hasRoyalFlush) return rankResult(7, [14], "Royal Flush");
  if (groups[0].count === 4) return rankResult(6, [groups[0].value], "Four of a Kind");
  if (groups[0].count === 3 && groups[1]?.count === 2) return rankResult(5, [groups[0].value, groups[1].value], "Full House");
  if (groups[0].count === 3) return rankResult(3, [groups[0].value, ...groups.slice(1).map((group) => group.value).sort((a, b) => b - a)], "Three of a Kind");
  if (groups[0].count === 2 && groups[1]?.count === 2) return rankResult(2, [groups[0].value, groups[1].value, groups[2].value], "Two Pair");
  if (groups[0].count === 2) return rankResult(1, [groups[0].value, ...groups.slice(1).map((group) => group.value).sort((a, b) => b - a)], "One Pair");
  return rankResult(0, values, "High Card");
}

function hasRoyalRanks(cards) {
  if (cards.length !== RANKS.length) return false;
  const ranks = new Set(cards.map((card) => card.rank));
  return RANKS.every((rank) => ranks.has(rank.id));
}

function rankResult(rank, tieBreakers, label) {
  return {
    rank,
    label,
    score: [rank, ...tieBreakers]
  };
}
