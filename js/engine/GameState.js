export class GameState {
  constructor() {
    this.piles = {};
    this.undoStack = [];
    this.moveCount = 0;
    this.startTime = null;
    this.won = false;
  }

  addPile(pile) {
    this.piles[pile.id] = pile;
  }

  getPile(id) {
    return this.piles[id];
  }

  getAllPiles() {
    return Object.values(this.piles);
  }

  getPilesByType(type) {
    return this.getAllPiles().filter(p => p.type === type);
  }

  snapshot() {
    return JSON.stringify(
      Object.fromEntries(
        Object.entries(this.piles).map(([id, pile]) => [
          id,
          {
            type: pile.type,
            cards: pile.cards.map(c => ({
              suit: c.suit,
              rank: c.rank,
              faceUp: c.faceUp
            }))
          }
        ])
      )
    );
  }

  pushUndo() {
    this.undoStack.push({
      piles: this.snapshot(),
      moveCount: this.moveCount
    });
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  popUndo() {
    return this.undoStack.pop();
  }

  serialize() {
    return JSON.stringify({
      piles: this.snapshot(),
      moveCount: this.moveCount,
      startTime: this.startTime,
      won: this.won
    });
  }
}
