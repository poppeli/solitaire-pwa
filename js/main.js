import { Card } from './engine/Card.js';
import { CardRenderer } from './render/CardRenderer.js';
import { BoardRenderer } from './render/BoardRenderer.js';
import { InputManager } from './input/InputManager.js';
import { HUD } from './ui/HUD.js';
import { createGame, getGameList } from './rules/GameRegistry.js';

class GameController {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.cardRenderer = new CardRenderer();
    this.renderer = new BoardRenderer(this.canvas, this.cardRenderer);
    this.input = null;
    this.hud = null;
    this.game = null;
    this.currentGameId = 'klondike';
    this.renderRequested = false;

    this.menuScreen = document.getElementById('menu-screen');
    this.gameScreen = document.getElementById('game-screen');
  }

  async init() {
    await this.cardRenderer.init();
    this.input = new InputManager(this.canvas, this);
    this.hud = new HUD(this);

    // Menu button
    const btnMenu = document.getElementById('btn-menu');
    if (btnMenu) {
      btnMenu.addEventListener('click', () => this.showMenu());
    }

    // Help button + modal
    const btnHelp = document.getElementById('btn-help');
    const rulesModal = document.getElementById('rules-modal');
    const rulesBody = document.getElementById('rules-body');
    const rulesClose = document.getElementById('rules-close');

    if (btnHelp) {
      btnHelp.addEventListener('click', () => {
        if (this.game) {
          rulesBody.innerHTML = this.game.getRules();
          rulesModal.style.display = 'flex';
        }
      });
    }
    if (rulesClose) {
      rulesClose.addEventListener('click', () => {
        rulesModal.style.display = 'none';
      });
    }
    if (rulesModal) {
      rulesModal.addEventListener('click', (e) => {
        if (e.target === rulesModal) rulesModal.style.display = 'none';
      });
    }

    window.addEventListener('resize', () => this._onResize());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this._onResize(), 100);
    });

    this._buildMenu();
    await this.startGame('klondike');
  }

  _buildMenu() {
    const container = document.getElementById('menu-games');
    const games = getGameList();

    for (const game of games) {
      const btn = document.createElement('button');
      btn.className = 'menu-game-btn';
      btn.innerHTML = `<div class="game-name">${game.name}</div><div class="game-desc">${game.description}</div>`;
      btn.addEventListener('click', () => this.startGame(game.id));
      container.appendChild(btn);
    }
  }

  showMenu() {
    this.hud.stopTimer();
    this.menuScreen.style.display = 'flex';
    this.gameScreen.style.display = 'none';
  }

  async startGame(gameId) {
    this.currentGameId = gameId;
    this.menuScreen.style.display = 'none';
    this.gameScreen.style.display = 'flex';
    await this.newGame();
  }

  async newGame() {
    this.game = createGame(this.currentGameId);
    await this._onResize();
    this.hud.startTimer();
    this.hud.update();
    this.requestRender();
  }

  async _onResize() {
    const container = this.canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const hudEl = document.getElementById('hud');
    const hudHeight = hudEl ? hudEl.offsetHeight : 0;
    const footerEl = document.getElementById('footer');
    const footerHeight = footerEl ? footerEl.offsetHeight : 0;

    const displayW = container.clientWidth;
    const displayH = container.clientHeight - hudHeight - footerHeight;

    this.canvas.style.width = displayW + 'px';
    this.canvas.style.height = displayH + 'px';
    this.canvas.width = Math.round(displayW * dpr);
    this.canvas.height = Math.round(displayH * dpr);

    if (this.game) {
      await this.renderer.recalculate(this.game);
      this.requestRender();
    }
  }

  requestRender() {
    if (this.renderRequested) return;
    this.renderRequested = true;
    requestAnimationFrame(() => {
      this.renderRequested = false;
      if (this.game) {
        this.renderer.render(this.game, this.input.getDragState());
      }
    });
  }

  onStockClick() {
    this.game.state.pushUndo();
    this.game.onStockClick();
    this.game.state.moveCount++;
    this.hud.update();
    this.requestRender();
  }

  tryMove(cards, fromPile, toPile) {
    if (!this.game.canMove(cards, fromPile, toPile)) return false;

    this.game.state.pushUndo();
    const cardIndex = fromPile.indexOf(cards[0]);
    const moved = fromPile.takeFrom(cardIndex);
    toPile.pushMany(moved);
    this.game.onMove(moved, fromPile, toPile);
    this.game.state.moveCount++;
    this.hud.update();
    this.requestRender();

    if (this.game.isWon()) {
      this._onWin();
    }

    return true;
  }

  tryAutoMove(pile, cardIndex) {
    if (cardIndex < 0 || cardIndex >= pile.cards.length) return;
    const card = pile.cards[cardIndex];
    if (!card.faceUp) return;

    // Only single cards can go to foundation automatically
    if (cardIndex === pile.cards.length - 1) {
      const target = this.game.findAutoMoveToFoundation(card);
      if (target) {
        this.tryMove([card], pile, target);
        return;
      }
    }

    // Try moving to tableau piles
    const cards = pile.cards.slice(cardIndex);
    const tableauPiles = this.game.state.getPilesByType('tableau');
    for (const tp of tableauPiles) {
      if (tp === pile) continue;
      if (this.game.canMove(cards, pile, tp)) {
        this.tryMove(cards, pile, tp);
        return;
      }
    }

    // Try moving to free cells (single card)
    if (cards.length === 1) {
      const freeCells = this.game.state.getPilesByType('freecell');
      for (const fc of freeCells) {
        if (fc === pile) continue;
        if (this.game.canMove(cards, pile, fc)) {
          this.tryMove(cards, pile, fc);
          return;
        }
      }
    }
  }

  undo() {
    if (!this.game.state.canUndo()) return;

    const snapshot = this.game.state.popUndo();
    this._restoreSnapshot(snapshot);
    this.hud.update();
    this.requestRender();
  }

  _restoreSnapshot(snapshot) {
    const pilesData = JSON.parse(snapshot.piles);

    for (const [pileId, data] of Object.entries(pilesData)) {
      const pile = this.game.state.getPile(pileId);
      if (!pile) continue;
      pile.cards = data.cards.map(c => {
        const card = new Card(c.suit, c.rank);
        card.faceUp = c.faceUp;
        return card;
      });
    }

    this.game.state.moveCount = snapshot.moveCount;
  }

  _onWin() {
    this.game.state.won = true;
    this.hud.stopTimer();

    setTimeout(() => {
      const elapsed = Math.floor((Date.now() - this.game.state.startTime) / 1000);
      const min = Math.floor(elapsed / 60);
      const sec = elapsed % 60;
      const msg = `Onneksi olkoon! Voitit pelin!\n\nSiirrot: ${this.game.state.moveCount}\nAika: ${min}:${sec.toString().padStart(2, '0')}`;

      if (confirm(msg + '\n\nAloita uusi peli?')) {
        this.newGame();
      }
    }, 300);
  }
}

// Boot
document.addEventListener('DOMContentLoaded', async () => {
  const gc = new GameController();
  await gc.init();
});

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
