import { RANKS, SUITS } from "./constants.js";

export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${rank.id}-${suit.id}`,
        rank: rank.id,
        value: rank.value,
        suit: suit.id,
        label: `${rank.id}${suit.symbol}`
      });
    }
  }
  deck.push({ id: "joker", rank: "Joker", value: 0, suit: "joker", label: "Joker", joker: true });
  return deck;
}

export function shuffle(cards) {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function draw(deck, count) {
  return {
    cards: deck.slice(0, count),
    deck: deck.slice(count)
  };
}

export function cardToText(card) {
  return card?.label || "?";
}
