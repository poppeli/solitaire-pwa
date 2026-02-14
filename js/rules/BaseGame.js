import { GameState } from '../engine/GameState.js';

export class BaseGame {
  constructor() {
    this.state = new GameState();
    this.name = 'Base';
    this.description = '';
  }

  setup() {
    throw new Error('Subclass must implement setup()');
  }

  canMove(cards, fromPile, toPile) {
    throw new Error('Subclass must implement canMove()');
  }

  onMove(cards, fromPile, toPile) {
    // Override for post-move logic (flip cards, etc.)
  }

  isWon() {
    throw new Error('Subclass must implement isWon()');
  }

  getBoardLayout() {
    throw new Error('Subclass must implement getBoardLayout()');
  }

  onStockClick() {
    // Override for stock pile click behavior
  }

  findAutoMoveToFoundation(card) {
    const foundations = this.state.getPilesByType('foundation');
    for (const foundation of foundations) {
      if (this.canMove([card], null, foundation)) {
        return foundation;
      }
    }
    return null;
  }
}
