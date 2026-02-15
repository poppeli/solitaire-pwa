import { Card } from './engine/Card.js';
import { CardRenderer } from './render/CardRenderer.js';
import { BoardRenderer } from './render/BoardRenderer.js';
import { InputManager } from './input/InputManager.js';
import { HUD } from './ui/HUD.js';
import { createGame, getGameList } from './rules/GameRegistry.js';
import { AnimationManager } from './render/AnimationManager.js';

const APP_VERSION = 'v24';

class GameController {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.cardRenderer = new CardRenderer();
    this.renderer = new BoardRenderer(this.canvas, this.cardRenderer);
    this.animManager = new AnimationManager(this.cardRenderer);
    this.input = null;
    this.hud = null;
    this.game = null;
    this.currentGameId = 'klondike';
    this.renderRequested = false;
    this.rightHanded = localStorage.getItem('pasianssi-hand') !== 'left';
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    this.menuScreen = document.getElementById('menu-screen');
    this.gameScreen = document.getElementById('game-screen');
  }

  async init() {
    await this.cardRenderer.init();
    this.input = new InputManager(this.canvas, this);
    this.hud = new HUD(this);

    // Version in footer
    const versionEl = document.getElementById('version');
    if (versionEl) versionEl.textContent = APP_VERSION;

    // Handedness buttons
    this._initHandButtons();

    // Menu button
    const btnMenu = document.getElementById('btn-menu');
    if (btnMenu) {
      btnMenu.addEventListener('click', () => {
        if (this._hasActiveGame() && !confirm('Vaihdetaanko peliä? Nykyinen peli hävitetään.')) return;
        this.showMenu();
      });
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

    // Try to restore saved game
    const saved = this._loadSave();
    if (saved) {
      try {
        await this.startGame(saved.gameId, saved);
      } catch (e) {
        this._clearSave();
        await this.startGame('klondike');
      }
    } else {
      await this.startGame('klondike');
    }
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

  _initHandButtons() {
    const btnRight = document.getElementById('btn-hand-right');
    const btnLeft = document.getElementById('btn-hand-left');
    if (!btnRight || !btnLeft) return;

    const updateButtons = () => {
      btnRight.classList.toggle('active', this.rightHanded);
      btnLeft.classList.toggle('active', !this.rightHanded);
    };
    updateButtons();

    btnRight.addEventListener('click', () => {
      if (this.rightHanded) return;
      this.rightHanded = true;
      localStorage.setItem('pasianssi-hand', 'right');
      updateButtons();
      if (this.game) this._onResize();
    });

    btnLeft.addEventListener('click', () => {
      if (!this.rightHanded) return;
      this.rightHanded = false;
      localStorage.setItem('pasianssi-hand', 'left');
      updateButtons();
      if (this.game) this._onResize();
    });
  }

  _hasActiveGame() {
    return this.game && this.game.state.moveCount > 0 && !this.game.state.won;
  }

  showMenu() {
    this.hud.stopTimer();
    this.menuScreen.style.display = 'flex';
    this.gameScreen.style.display = 'none';
  }

  async startGame(gameId, savedState) {
    this.currentGameId = gameId;
    this.menuScreen.style.display = 'none';
    this.gameScreen.style.display = 'flex';
    // Wait one frame so the browser lays out game-screen before measuring
    await new Promise(r => requestAnimationFrame(r));
    if (savedState) {
      await this._restoreGame(savedState);
    } else {
      await this.newGame();
    }
  }

  async newGame() {
    this.game = createGame(this.currentGameId);
    this._clearSave();
    await this._onResize();
    this.hud.startTimer();
    this.hud.update();
    this.requestRender();
    this._saveGame();
  }

  async _restoreGame(saved) {
    this.game = createGame(saved.gameId);
    this._restoreSnapshot({ piles: saved.piles, moveCount: saved.moveCount });
    this.game.state.startTime = Date.now() - (saved.elapsed || 0);
    this.game.state.won = saved.won || false;
    await this._onResize();
    this.hud.startTimer();
    this.hud.update();
    this.requestRender();
  }

  async _onResize() {
    const dpr = this.dpr;
    const wrap = document.getElementById('canvas-wrap');
    const displayW = wrap ? wrap.clientWidth : this.canvas.parentElement.clientWidth;
    const displayH = wrap ? wrap.clientHeight : this.canvas.parentElement.clientHeight;

    // Skip if dimensions haven't changed (prevents resize loop)
    if (displayW === this._lastW && displayH === this._lastH) return;
    this._lastW = displayW;
    this._lastH = displayH;

    this.canvas.width = Math.round(displayW * dpr);
    this.canvas.height = Math.round(displayH * dpr);

    if (this.game) {
      await this.renderer.recalculate(this.game, this.rightHanded);
      this.renderRequested = false;
      this.renderer.render(this.game, this.input ? this.input.getDragState() : null);
    }

    // Re-check after next frame in case layout wasn't ready yet
    requestAnimationFrame(() => {
      const newW = wrap ? wrap.clientWidth : this.canvas.parentElement.clientWidth;
      const newH = wrap ? wrap.clientHeight : this.canvas.parentElement.clientHeight;
      if (newW !== this._lastW || newH !== this._lastH) {
        this._onResize();
      }
    });
  }

  requestRender() {
    if (this.renderRequested) return;
    this.renderRequested = true;
    requestAnimationFrame(() => {
      this.renderRequested = false;
      if (this.game) {
        this.renderer.render(this.game, this.input.getDragState());
        // Draw animations on top
        if (this.animManager.isAnimating()) {
          const dpr = this.dpr;
          const ctx = this.ctx;
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.scale(dpr, dpr);
          this.animManager.render(ctx, dpr);
          ctx.restore();
        }
      }
    });
  }

  onStockClick() {
    this.game.state.pushUndo();
    this.game.onStockClick();
    this.game.state.moveCount++;
    this.hud.update();
    this.renderer.markDirty();
    this.requestRender();
    this._saveGame();
  }

  tryMove(cards, fromPile, toPile) {
    if (!this.game.canMove(cards, fromPile, toPile)) return false;

    // Capture source position before move
    const fromPos = this._getCardPosition(fromPile, fromPile.indexOf(cards[0]));

    this.game.state.pushUndo();
    const cardIndex = fromPile.indexOf(cards[0]);
    const moved = fromPile.takeFrom(cardIndex);
    toPile.pushMany(moved);
    this.game.onMove(moved, fromPile, toPile);
    this.game.state.moveCount++;
    this.hud.update();
    this.renderer.markDirty();

    // Animate if we have positions and not dragging
    const toPos = this._getCardPosition(toPile, toPile.cards.length - moved.length);
    if (fromPos && toPos && !this.input.getDragState()) {
      this.animManager.animate(moved, fromPos.x, fromPos.y, toPos.x, toPos.y, this.renderer.overlapFaceUp);
      this._animLoop();
    } else {
      this.requestRender();
    }

    if (this.game.isWon()) {
      this._onWin();
    } else {
      this._saveGame();
    }

    return true;
  }

  _getCardPosition(pile, cardIndex) {
    const pos = this.renderer.getPilePosition(pile.id);
    if (!pos) return null;
    if (pile.type === 'tableau' && cardIndex > 0) {
      let y = pos.y;
      for (let i = 0; i < cardIndex; i++) {
        const c = pile.cards[i];
        y += c && c.faceUp ? this.renderer.overlapFaceUp : this.renderer.overlapFaceDown;
      }
      return { x: pos.x, y };
    }
    return { x: pos.x, y: pos.y };
  }

  _animLoop() {
    this.requestRender();
    if (this.animManager.isAnimating()) {
      requestAnimationFrame(() => this._animLoop());
    }
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
    this.renderer.markDirty();
    this.requestRender();
    this._saveGame();
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

  _saveGame() {
    try {
      const data = {
        version: APP_VERSION,
        gameId: this.currentGameId,
        piles: this.game.state.snapshot(),
        moveCount: this.game.state.moveCount,
        elapsed: Date.now() - this.game.state.startTime,
        won: this.game.state.won
      };
      localStorage.setItem('pasianssi-save', JSON.stringify(data));
    } catch (e) { /* quota exceeded etc. */ }
  }

  _loadSave() {
    try {
      const json = localStorage.getItem('pasianssi-save');
      if (!json) return null;
      const data = JSON.parse(json);
      if (!data.gameId || !data.piles) return null;
      if (data.won) return null; // Don't restore won games
      // Discard saves from different versions to avoid restore issues
      if (data.version && data.version !== APP_VERSION) {
        localStorage.removeItem('pasianssi-save');
        return null;
      }
      return data;
    } catch (e) { return null; }
  }

  _clearSave() {
    localStorage.removeItem('pasianssi-save');
  }

  _onWin() {
    this.game.state.won = true;
    this.hud.stopTimer();
    this._clearSave();
    this._playWinAnimation();
  }

  _playWinAnimation() {
    const dpr = this.dpr;
    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;
    const ctx = this.ctx;
    const colors = ['#e74c3c', '#f39c12', '#2ecc71', '#3498db', '#9b59b6', '#e91e63', '#00bcd4'];
    const particles = [];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: w / 2 + (Math.random() - 0.5) * w * 0.4,
        y: h * 0.3,
        vx: (Math.random() - 0.5) * 12,
        vy: Math.random() * -10 - 2,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.3,
        life: 1
      });
    }

    const startTime = performance.now();
    const duration = 2500;

    const animFrame = () => {
      const elapsed = performance.now() - startTime;
      const progress = elapsed / duration;

      // Draw game underneath
      this.renderer.render(this.game, null);

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      // Dark overlay fading in
      ctx.fillStyle = `rgba(0,0,0,${Math.min(0.4, progress * 0.6)})`;
      ctx.fillRect(0, 0, w, h);

      // Particles
      for (const p of particles) {
        p.x += p.vx;
        p.vy += 0.25;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        p.life = Math.max(0, 1 - progress);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }

      // Win text
      if (progress > 0.3) {
        const textAlpha = Math.min(1, (progress - 0.3) / 0.3);
        ctx.globalAlpha = textAlpha;
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.max(24, w * 0.07)}px -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 8;
        ctx.fillText('Onneksi olkoon!', w / 2, h * 0.4);

        const gameElapsed = Math.floor((Date.now() - this.game.state.startTime) / 1000);
        const min = Math.floor(gameElapsed / 60);
        const sec = gameElapsed % 60;
        ctx.font = `${Math.max(16, w * 0.04)}px -apple-system, sans-serif`;
        ctx.fillText(`Siirrot: ${this.game.state.moveCount}   Aika: ${min}:${sec.toString().padStart(2, '0')}`, w / 2, h * 0.5);
      }

      ctx.restore();

      if (progress < 1) {
        requestAnimationFrame(animFrame);
      }
    };

    requestAnimationFrame(animFrame);
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
