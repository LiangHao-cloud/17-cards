# 17 Cards

17 Cards is a Foundry VTT module for running a two-sided 17-card gambling match between the Gamemaster side and the player team.

## Installation

Install the latest release in Foundry VTT with this manifest URL:

```text
https://github.com/LiangHao-cloud/17-cards/releases/latest/download/module.json
```

## How to Play

The deck contains 17 cards: A, J, Q, and K in each of the four suits, plus one Joker. The Joker can be treated as any rank or suit when hands are compared.

The game has two sides:

- The Gamemaster side, usually representing the master, dealer, NPC, or house-controlled opponent.
- The player side, where the players act as one team through a single operator selected by the GM.

At the start of each round, both sides receive 5 cards and each side pays a 5-chip attendance fee. This attendance fee goes to the house, referee, or venue provider and is not won back by either side.

The match lasts 10 rounds. After the final round, the side with more chips wins the match.

## Round Flow

1. The GM starts the match, assigns initial chips, chooses the player-side operator, and chooses the dealer.
2. Each side receives 5 cards and pays the 5-chip attendance fee.
3. Starting with the dealer, the first betting round begins.
4. After a bet is called, the GM confirms the exchange phase.
5. Each side may exchange 0 to 5 cards.
6. After both sides finish exchanging, the GM confirms the second betting round.
7. After the second bet is called, the GM confirms showdown.
8. Both hands are compared and the winning side receives the non-attendance chips in the pot.

## Actions

- **Call**: Pass action to the other side or match the current bet. If a side calls twice without resolving a bet, the round ends in a draw.
- **Raise**: Commit chips to the pot.
  - First betting round: the raise amount must be between 5 and 15 chips.
  - Second betting round: the minimum raise is the first-round bet, and the maximum raise is 30 chips.
- **Fold**: Give up the round. Attendance fees stay with the house. Any non-attendance chips already committed by the folding side go to the opponent.

## Hand Ranking

Hands are compared in this order, from strongest to weakest:

1. Five suits, meaning four natural suits plus the Joker
2. Royal flush
3. Four of a kind
4. Full house
5. Straight
6. Three of a kind
7. Two pair
8. One pair
9. High card

If both sides have the same evaluated hand strength and no clear tiebreaker wins, the round is treated as a draw. Non-attendance chips are returned, while attendance fees remain with the house.

## Release

Releases are created manually from GitHub Actions:

1. Open **Actions**.
2. Run the **Release** workflow.
3. Enter a version such as `0.1.0`.
4. The workflow creates tag `v0.1.0`, publishes `module.json`, and uploads `17-cards.zip`.
