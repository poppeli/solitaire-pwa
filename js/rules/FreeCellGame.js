import { BaseGame } from './BaseGame.js';
import { Deck } from '../engine/Deck.js';
import { Pile } from '../engine/Pile.js';

export class FreeCellGame extends BaseGame {
  constructor() {
    super();
    this.name = 'FreeCell';
    this.description = 'FreeCell-pasianssi';
  }

  setup() {
    const deck = new Deck().createStandard52().shuffle();

    // 8 tableau piles: first 4 get 7 cards, last 4 get 6 cards
    for (let i = 0; i < 8; i++) {
      const pile = new Pile('tableau', `tableau-${i}`);
      const count = i < 4 ? 7 : 6;
      const cards = deck.deal(count);
      cards.forEach(card => {
        card.faceUp = true; // All cards face up in FreeCell
        pile.push(card);
      });
      this.state.addPile(pile);
    }

    // 4 free cells
    for (let i = 0; i < 4; i++) {
      this.state.addPile(new Pile('freecell', `freecell-${i}`));
    }

    // 4 foundation piles
    for (let i = 0; i < 4; i++) {
      this.state.addPile(new Pile('foundation', `foundation-${i}`));
    }

    this.state.startTime = Date.now();
  }

  canMove(cards, fromPile, toPile) {
    if (!cards || cards.length === 0) return false;
    if (fromPile === toPile) return false;

    const bottomCard = cards[0];

    if (toPile.type === 'foundation') {
      if (cards.length !== 1) return false;
      if (toPile.isEmpty()) return bottomCard.rank === 1;
      const top = toPile.topCard();
      return bottomCard.suit === top.suit && bottomCard.rank === top.rank + 1;
    }

    if (toPile.type === 'freecell') {
      return cards.length === 1 && toPile.isEmpty();
    }

    if (toPile.type === 'tableau') {
      // Check if we have enough free spaces to move this many cards
      if (cards.length > this._maxMovable(toPile)) return false;

      // Sequence must be alternating colors, descending
      for (let i = 1; i < cards.length; i++) {
        if (cards[i].color === cards[i - 1].color) return false;
        if (cards[i].rank !== cards[i - 1].rank - 1) return false;
      }

      if (toPile.isEmpty()) return true;

      const top = toPile.topCard();
      return bottomCard.color !== top.color && bottomCard.rank === top.rank - 1;
    }

    return false;
  }

  _maxMovable(targetPile) {
    const freeCells = this.state.getPilesByType('freecell').filter(p => p.isEmpty()).length;
    const emptyTableau = this.state.getPilesByType('tableau')
      .filter(p => p.isEmpty() && p !== targetPile).length;

    // Formula: (1 + freeCells) * 2^emptyTableau
    return (1 + freeCells) * Math.pow(2, emptyTableau);
  }

  onMove(cards, fromPile, toPile) {
    // No card flipping needed — all cards are always face up in FreeCell
  }

  isWon() {
    return this.state.getPilesByType('foundation')
      .every(p => p.cards.length === 13);
  }

  getRules() {
    return `<h2>FreeCell</h2>
<h3>Tavoite</h3>
<p>Siirrä kaikki 52 korttia neljään perustapiikkiin maittain järjestyksessä ässästä kuninkaaseen.</p>
<h3>Pelialue</h3>
<ul>
<li><b>4 vapaata solua</b> (vasen yläkulma) — väliaikainen säilytyspaikka yhdelle kortille</li>
<li><b>4 perustapiikkiä</b> (oikea yläkulma) — rakenna maa kerrallaan: A, 2, 3 ... K</li>
<li><b>8 tableau-pinoa</b> — kaikki kortit ovat kuvapuoli ylöspäin alusta alkaen</li>
</ul>
<h3>Säännöt</h3>
<ul>
<li>Tableau-pinoissa kortit järjestetään laskevasti vuoroväreillä (esim. musta 7 → punainen 6)</li>
<li>Vapaaseen soluun mahtuu <b>yksi kortti</b> kerrallaan</li>
<li>Minkä tahansa kortin voi siirtää tyhjään tableau-pinoon</li>
<li>Korttiryhmiä voi siirtää kerralla, jos vapaita soluja ja tyhjiä tableau-pinoja on tarpeeksi</li>
<li>Siirrettävien korttien enimmäismäärä = (1 + vapaat solut) × 2<sup>tyhjät tableau-pinot</sup></li>
</ul>
<h3>Ohjaus</h3>
<ul>
<li><b>Raahaa</b> kortteja pinojen, solujen ja perustojen välillä</li>
<li><b>Klikkaa</b> korttia siirtääksesi sen automaattisesti parhaaseen paikkaan</li>
<li><b>Tuplaklikkaa</b> siirtääksesi kortin perustaan</li>
</ul>`;
  }

  getBoardLayout() {
    return {
      freecells: [
        { col: 0, row: 0 }, { col: 1, row: 0 },
        { col: 2, row: 0 }, { col: 3, row: 0 }
      ],
      foundations: [
        { col: 4, row: 0 }, { col: 5, row: 0 },
        { col: 6, row: 0 }, { col: 7, row: 0 }
      ],
      tableau: [
        { col: 0, row: 1 }, { col: 1, row: 1 },
        { col: 2, row: 1 }, { col: 3, row: 1 },
        { col: 4, row: 1 }, { col: 5, row: 1 },
        { col: 6, row: 1 }, { col: 7, row: 1 }
      ],
      columns: 8
    };
  }
}
