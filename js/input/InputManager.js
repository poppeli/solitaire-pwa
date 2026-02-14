export class InputManager {
  constructor(canvas, gameController) {
    this.canvas = canvas;
    this.gc = gameController;
    this.dragState = null;
    this.lastTapTime = 0;

    // Mouse events
    canvas.addEventListener('mousedown', (e) => this._onPointerDown(e.offsetX, e.offsetY));
    canvas.addEventListener('mousemove', (e) => this._onPointerMove(e.offsetX, e.offsetY));
    canvas.addEventListener('mouseup', (e) => this._onPointerUp(e.offsetX, e.offsetY));

    // Touch events
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const pos = this._touchPos(e);
      this._onPointerDown(pos.x, pos.y);
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const pos = this._touchPos(e);
      this._onPointerMove(pos.x, pos.y);
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (this.dragState) {
        this._onPointerUp(this.dragState.currentX, this.dragState.currentY);
      }
    }, { passive: false });
  }

  _touchPos(e) {
    const touch = e.touches[0] || e.changedTouches[0];
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }

  _onPointerDown(x, y) {
    const hit = this.gc.renderer.hitTest(x, y);
    if (!hit) return;

    const pile = this.gc.game.state.getPile(hit.pileId);
    if (!pile) return;

    // Double-tap detection
    const now = Date.now();
    if (now - this.lastTapTime < 350 && hit.cardIndex >= 0) {
      this.lastTapTime = 0;
      this._onDoubleTap(pile, hit.cardIndex);
      return;
    }
    this.lastTapTime = now;

    // Stock pile click
    if (pile.type === 'stock') {
      this.gc.onStockClick();
      return;
    }

    // Can't drag from empty pile or face-down cards (unless it's the top card)
    if (hit.cardIndex < 0) return;
    const card = pile.cards[hit.cardIndex];
    if (!card || !card.faceUp) return;

    // For waste, foundation, and freecell, only the top card can be dragged
    if ((pile.type === 'waste' || pile.type === 'foundation' || pile.type === 'freecell') &&
        hit.cardIndex !== pile.cards.length - 1) {
      return;
    }

    // Start drag
    const cards = pile.cards.slice(hit.cardIndex);
    this.dragState = {
      cards,
      fromPile: pile,
      fromPileId: pile.id,
      fromCardIndex: hit.cardIndex,
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
      offsetX: x - hit.x,
      offsetY: y - hit.y,
      moved: false
    };

    this.gc.requestRender();
  }

  _onPointerMove(x, y) {
    if (!this.dragState) return;

    const dx = x - this.dragState.startX;
    const dy = y - this.dragState.startY;
    if (!this.dragState.moved && Math.hypot(dx, dy) < 5) return;

    this.dragState.moved = true;
    this.dragState.currentX = x;
    this.dragState.currentY = y;
    this.gc.requestRender();
  }

  _onPointerUp(x, y) {
    if (!this.dragState) return;

    const ds = this.dragState;

    if (!ds.moved) {
      // Click without drag: if single card, try auto-move to foundation
      if (ds.cards.length === 1) {
        this.gc.tryAutoMove(ds.fromPile, ds.fromCardIndex);
      }
      this.dragState = null;
      this.gc.requestRender();
      return;
    }

    // Find drop target
    const targetPile = this.gc.renderer.findDropTarget(x, y, this.gc.game);

    if (targetPile && targetPile !== ds.fromPile) {
      this.gc.tryMove(ds.cards, ds.fromPile, targetPile);
    }

    this.dragState = null;
    this.gc.requestRender();
  }

  _onDoubleTap(pile, cardIndex) {
    if (cardIndex < 0) return;
    const card = pile.cards[cardIndex];
    if (!card || !card.faceUp) return;

    // Try to move to foundation
    this.gc.tryAutoMove(pile, cardIndex);
  }

  getDragState() {
    return this.dragState;
  }
}
