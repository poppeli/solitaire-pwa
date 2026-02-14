import { BaseGame } from './BaseGame.js';
import { Card } from '../engine/Card.js';
import { Deck } from '../engine/Deck.js';
import { Pile } from '../engine/Pile.js';

export class SpiderGame extends BaseGame {
  constructor(suitCount = 4) {
    super();
    this.suitCount = suitCount; // 1, 2, or 4
    this.name = `Spider (${suitCount} ${suitCount === 1 ? 'maa' : 'maata'})`;
    this.description = `Spider-pasianssi - ${suitCount} ${suitCount === 1 ? 'maa' : 'maata'}`;
  }

  setup() {
    const allSuits = ['spades', 'hearts', 'diamonds', 'clubs'];
    const usedSuits = allSuits.slice(0, this.suitCount);
    const deck = new Deck();

    // Create 104 cards using only the selected suits
    const decksPerSuit = Math.floor(8 / usedSuits.length); // 8 suit-decks total
    for (const suit of usedSuits) {
      for (let d = 0; d < decksPerSuit; d++) {
        for (let rank = 1; rank <= 13; rank++) {
          deck.cards.push(new Card(suit, rank));
        }
      }
    }
    deck.shuffle();

    // 10 tableau piles: first 4 get 6 cards, last 6 get 5 cards
    for (let i = 0; i < 10; i++) {
      const pile = new Pile('tableau', `tableau-${i}`);
      const count = i < 4 ? 6 : 5;
      const cards = deck.deal(count);
      cards.forEach((card, j) => {
        card.faceUp = (j === cards.length - 1);
        pile.push(card);
      });
      this.state.addPile(pile);
    }

    // 8 foundation piles
    for (let i = 0; i < 8; i++) {
      this.state.addPile(new Pile('foundation', `foundation-${i}`));
    }

    // Stock pile (remaining 50 cards)
    const stock = new Pile('stock', 'stock');
    for (const card of deck.cards) {
      stock.push(card);
    }
    this.state.addPile(stock);

    this.state.startTime = Date.now();
  }

  canMove(cards, fromPile, toPile) {
    if (!cards || cards.length === 0) return false;
    if (fromPile === toPile) return false;
    if (toPile.type !== 'tableau') return false;

    // The moved sequence must be descending, same suit
    if (!this._isValidSequence(cards)) return false;

    if (toPile.isEmpty()) return true;

    const top = toPile.topCard();
    return cards[0].rank === top.rank - 1;
  }

  onMove(cards, fromPile, toPile) {
    if (fromPile && fromPile.type === 'tableau' && !fromPile.isEmpty()) {
      const topCard = fromPile.topCard();
      if (!topCard.faceUp) topCard.faceUp = true;
    }
    this._checkCompleteSequence(toPile);
  }

  _checkCompleteSequence(pile) {
    if (pile.cards.length < 13) return;

    const start = pile.cards.length - 13;
    const suit = pile.cards[start].suit;

    for (let i = 0; i < 13; i++) {
      const card = pile.cards[start + i];
      if (!card.faceUp || card.suit !== suit || card.rank !== 13 - i) return;
    }

    // Complete K-A sequence found — move to foundation
    const foundation = this.state.getPilesByType('foundation').find(f => f.isEmpty());
    if (foundation) {
      foundation.pushMany(pile.takeFrom(start));
      if (!pile.isEmpty() && !pile.topCard().faceUp) {
        pile.topCard().faceUp = true;
      }
    }
  }

  _isValidSequence(cards) {
    for (let i = 1; i < cards.length; i++) {
      if (cards[i].suit !== cards[i - 1].suit) return false;
      if (cards[i].rank !== cards[i - 1].rank - 1) return false;
    }
    return true;
  }

  onStockClick() {
    const stock = this.state.getPile('stock');
    if (stock.isEmpty()) return;

    const tableauPiles = this.state.getPilesByType('tableau');
    if (tableauPiles.some(p => p.isEmpty())) return;

    for (const pile of tableauPiles) {
      if (stock.isEmpty()) break;
      const card = stock.pop();
      card.faceUp = true;
      pile.push(card);
    }

    for (const pile of tableauPiles) {
      this._checkCompleteSequence(pile);
    }
  }

  isWon() {
    return this.state.getPilesByType('foundation')
      .every(p => p.cards.length === 13);
  }

  getRules() {
    const suitDesc = this.suitCount === 1
      ? 'Kaikki kortit ovat samaa maata — helpoin versio.'
      : this.suitCount === 2
        ? 'Kortit ovat kahta eri maata — keskivaikea versio.'
        : 'Kortit ovat neljää eri maata — vaikein versio.';

    return `<h2>Spider</h2>
<h3>Tavoite</h3>
<p>Kokoa kahdeksan täyttä laskevaa sarjaa (K, Q, J, 10 ... A) samaa maata. Valmis sarja siirtyy automaattisesti perustaan.</p>
<h3>Vaikeustaso</h3>
<p>${suitDesc}</p>
<h3>Pelialue</h3>
<ul>
<li><b>Varastopakka</b> (vasen yläkulma) — klikkaa jakaaksesi yhden kortin jokaiseen tableau-pinoon</li>
<li><b>10 tableau-pinoa</b> — pääpelialue</li>
<li><b>8 perustapiikkiä</b> — valmiit K-A-sarjat siirtyvät tänne automaattisesti</li>
</ul>
<h3>Säännöt</h3>
<ul>
<li>Tableau-pinoissa kortteja voi pinota laskevassa järjestyksessä <b>maasta riippumatta</b></li>
<li>Korttiryhmiä voi siirtää kerralla <b>vain jos ne ovat samaa maata</b> ja laskevassa järjestyksessä</li>
<li>Minkä tahansa kortin voi siirtää tyhjään tableau-pinoon</li>
<li>Varastosta jakaminen vaatii, että <b>kaikissa tableau-pinoissa on vähintään yksi kortti</b></li>
<li>Kun K-A-sarja samaa maata on valmis, se siirtyy automaattisesti perustaan</li>
</ul>
<h3>Ohjaus</h3>
<ul>
<li><b>Raahaa</b> kortteja tai korttiryhmiä pinojen välillä</li>
<li><b>Klikkaa varastopakkaa</b> jakaaksesi uudet kortit</li>
</ul>`;
  }

  getBoardLayout() {
    return {
      stock: { col: 0, row: 0 },
      foundations: [
        { col: 2, row: 0 }, { col: 3, row: 0 },
        { col: 4, row: 0 }, { col: 5, row: 0 },
        { col: 6, row: 0 }, { col: 7, row: 0 },
        { col: 8, row: 0 }, { col: 9, row: 0 }
      ],
      tableau: [
        { col: 0, row: 1 }, { col: 1, row: 1 },
        { col: 2, row: 1 }, { col: 3, row: 1 },
        { col: 4, row: 1 }, { col: 5, row: 1 },
        { col: 6, row: 1 }, { col: 7, row: 1 },
        { col: 8, row: 1 }, { col: 9, row: 1 }
      ],
      columns: 10
    };
  }
}
