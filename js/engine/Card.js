export class Card {
  constructor(suit, rank) {
    this.suit = suit;    // 'hearts', 'diamonds', 'clubs', 'spades'
    this.rank = rank;    // 1-13 (1=Ace, 11=Jack, 12=Queen, 13=King)
    this.faceUp = false;
  }

  get color() {
    return (this.suit === 'hearts' || this.suit === 'diamonds') ? 'red' : 'black';
  }

  get displayRank() {
    const names = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
    return names[this.rank] || String(this.rank);
  }

  get suitSymbol() {
    return { hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', spades: '\u2660' }[this.suit];
  }

  get id() {
    return `${this.suit}-${this.rank}`;
  }
}
