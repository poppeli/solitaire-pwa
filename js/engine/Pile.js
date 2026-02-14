export class Pile {
  constructor(type, id) {
    this.type = type;  // 'tableau', 'foundation', 'stock', 'waste'
    this.id = id;
    this.cards = [];
  }

  topCard() {
    return this.cards.length > 0 ? this.cards[this.cards.length - 1] : null;
  }

  push(card) {
    this.cards.push(card);
  }

  pushMany(cards) {
    for (const card of cards) {
      this.cards.push(card);
    }
  }

  pop() {
    return this.cards.pop();
  }

  takeFrom(index) {
    return this.cards.splice(index);
  }

  isEmpty() {
    return this.cards.length === 0;
  }

  indexOf(card) {
    return this.cards.indexOf(card);
  }
}
