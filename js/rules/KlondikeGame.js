import { BaseGame } from './BaseGame.js';
import { Deck } from '../engine/Deck.js';
import { Pile } from '../engine/Pile.js';

export class KlondikeGame extends BaseGame {
  constructor(drawCount = 1) {
    super();
    this.name = 'Klondike';
    this.description = 'Classic solitaire';
    this.drawCount = drawCount;
  }

  setup() {
    const deck = new Deck().createStandard52().shuffle();

    // 7 tableau piles
    for (let i = 0; i < 7; i++) {
      const pile = new Pile('tableau', `tableau-${i}`);
      const cards = deck.deal(i + 1);
      cards.forEach((card, j) => {
        card.faceUp = (j === cards.length - 1);
        pile.push(card);
      });
      this.state.addPile(pile);
    }

    // 4 foundation piles
    for (let i = 0; i < 4; i++) {
      this.state.addPile(new Pile('foundation', `foundation-${i}`));
    }

    // Stock pile (remaining cards)
    const stock = new Pile('stock', 'stock');
    for (const card of deck.cards) {
      stock.push(card);
    }
    this.state.addPile(stock);

    // Waste pile
    this.state.addPile(new Pile('waste', 'waste'));

    this.state.startTime = Date.now();
  }

  canMove(cards, fromPile, toPile) {
    if (!cards || cards.length === 0) return false;
    if (fromPile === toPile) return false;

    const bottomCard = cards[0];

    if (toPile.type === 'foundation') {
      if (cards.length !== 1) return false;
      if (toPile.isEmpty()) {
        return bottomCard.rank === 1; // Ace
      }
      const top = toPile.topCard();
      return bottomCard.suit === top.suit && bottomCard.rank === top.rank + 1;
    }

    if (toPile.type === 'tableau') {
      if (toPile.isEmpty()) {
        return bottomCard.rank === 13; // King
      }
      const top = toPile.topCard();
      return bottomCard.color !== top.color && bottomCard.rank === top.rank - 1;
    }

    return false;
  }

  onMove(cards, fromPile, toPile) {
    // Flip the top card of the source tableau pile if it's face-down
    if (fromPile && fromPile.type === 'tableau' && !fromPile.isEmpty()) {
      const topCard = fromPile.topCard();
      if (!topCard.faceUp) {
        topCard.faceUp = true;
      }
    }
  }

  onStockClick() {
    const stock = this.state.getPile('stock');
    const waste = this.state.getPile('waste');

    if (stock.isEmpty()) {
      // Recycle waste back to stock
      while (!waste.isEmpty()) {
        const card = waste.pop();
        card.faceUp = false;
        stock.push(card);
      }
    } else {
      // Draw cards from stock to waste
      const count = Math.min(this.drawCount, stock.cards.length);
      for (let i = 0; i < count; i++) {
        const card = stock.pop();
        card.faceUp = true;
        waste.push(card);
      }
    }
  }

  isWon() {
    return this.state.getPilesByType('foundation')
      .every(p => p.cards.length === 13);
  }

  getBoardLayout() {
    return {
      stock: { col: 0, row: 0 },
      waste: { col: 1, row: 0 },
      foundations: [
        { col: 3, row: 0 },
        { col: 4, row: 0 },
        { col: 5, row: 0 },
        { col: 6, row: 0 }
      ],
      tableau: [
        { col: 0, row: 1 },
        { col: 1, row: 1 },
        { col: 2, row: 1 },
        { col: 3, row: 1 },
        { col: 4, row: 1 },
        { col: 5, row: 1 },
        { col: 6, row: 1 }
      ],
      columns: 7
    };
  }
}
