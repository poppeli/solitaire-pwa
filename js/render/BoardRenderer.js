export class BoardRenderer {
  constructor(canvas, cardRenderer) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cardRenderer = cardRenderer;

    // Layout metrics (recalculated on resize)
    this.cardWidth = 70;
    this.cardHeight = 100;
    this.padding = 10;
    this.columnGap = 8;
    this.rowGap = 20;
    this.overlapFaceDown = 8;
    this.overlapFaceUp = 22;

    // Pile positions cache: pileId -> { x, y }
    this.pilePositions = {};
    // Card positions cache: for hit testing
    this.cardPositions = [];

    // Offscreen canvas for static board (B+D optimization)
    this._bgCanvas = document.createElement('canvas');
    this._bgCtx = this._bgCanvas.getContext('2d');
    this._bgDirty = true;
  }

  markDirty() {
    this._bgDirty = true;
  }

  recalculate(game, rightHanded) {
    const layout = game.getBoardLayout();
    const cols = layout.columns;

    // Mirror top row columns for right-handed layout
    const mirrorCol = (col) => rightHanded ? (cols - 1) - col : col;

    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const availableWidth = this.canvas.width / this.dpr;

    this.padding = Math.max(6, availableWidth * 0.015);
    this.columnGap = Math.max(4, availableWidth * 0.01);

    this.cardWidth = Math.floor(
      (availableWidth - this.padding * 2 - this.columnGap * (cols - 1)) / cols
    );
    this.cardWidth = Math.min(this.cardWidth, 110);
    this.cardWidth = Math.max(this.cardWidth, 40);
    this.cardHeight = Math.round(this.cardWidth * 1.45);

    this.overlapFaceDown = Math.max(5, Math.round(this.cardHeight * 0.1));
    this.overlapFaceUp = Math.max(12, Math.round(this.cardHeight * 0.22));
    this.rowGap = Math.max(10, Math.round(this.cardHeight * 0.2));

    // Calculate pile positions based on layout
    this.pilePositions = {};

    const totalWidth = cols * this.cardWidth + (cols - 1) * this.columnGap;
    const offsetX = Math.max(this.padding, (availableWidth - totalWidth) / 2);
    const row0Y = this.padding;
    const row1Y = row0Y + this.cardHeight + this.rowGap;

    // Stock
    if (layout.stock) {
      this.pilePositions['stock'] = {
        x: offsetX + mirrorCol(layout.stock.col) * (this.cardWidth + this.columnGap),
        y: row0Y
      };
    }

    // Waste
    if (layout.waste) {
      this.pilePositions['waste'] = {
        x: offsetX + mirrorCol(layout.waste.col) * (this.cardWidth + this.columnGap),
        y: row0Y
      };
    }

    // Foundations
    if (layout.foundations) {
      layout.foundations.forEach((f, i) => {
        this.pilePositions[`foundation-${i}`] = {
          x: offsetX + mirrorCol(f.col) * (this.cardWidth + this.columnGap),
          y: row0Y
        };
      });
    }

    // Free cells
    if (layout.freecells) {
      layout.freecells.forEach((f, i) => {
        this.pilePositions[`freecell-${i}`] = {
          x: offsetX + mirrorCol(f.col) * (this.cardWidth + this.columnGap),
          y: row0Y
        };
      });
    }

    // Tableau
    if (layout.tableau) {
      layout.tableau.forEach((t, i) => {
        this.pilePositions[`tableau-${i}`] = {
          x: offsetX + t.col * (this.cardWidth + this.columnGap),
          y: row1Y
        };
      });
    }

    // Resize offscreen canvas to match
    this._bgCanvas.width = this.canvas.width;
    this._bgCanvas.height = this.canvas.height;
    this._bgDirty = true;

    return this.cardRenderer.setSize(this.cardWidth, this.cardHeight);
  }

  _renderBackground(game) {
    const ctx = this._bgCtx;
    const dpr = this.dpr || Math.min(window.devicePixelRatio || 1, 1.5);
    const displayW = this._bgCanvas.width / dpr;
    const displayH = this._bgCanvas.height / dpr;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#2d6a3f';
    ctx.fillRect(0, 0, displayW, displayH);

    this.cardPositions = [];

    // Draw each pile (no drag exclusion — this is the static board)
    for (const pile of game.state.getAllPiles()) {
      const pos = this.pilePositions[pile.id];
      if (!pos) continue;
      this._renderPile(ctx, pile, pos.x, pos.y, null);
    }

    ctx.restore();
    this._bgDirty = false;
  }

  render(game, dragState) {
    const hasDrag = dragState && dragState.cards && dragState.moved;
    const hasAnim = game.state.getAllPiles().some(p =>
      p.cards.some(c => c._animating)
    );

    // Update offscreen background if state changed
    if (this._bgDirty && !hasDrag && !hasAnim) {
      this._renderBackground(game);
    }

    const ctx = this.ctx;
    const dpr = this.dpr || Math.min(window.devicePixelRatio || 1, 1.5);

    if (hasDrag || hasAnim) {
      // During drag/animation: full redraw (need drag/anim exclusion)
      const displayW = this.canvas.width / dpr;
      const displayH = this.canvas.height / dpr;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      ctx.fillStyle = '#2d6a3f';
      ctx.fillRect(0, 0, displayW, displayH);

      this.cardPositions = [];

      for (const pile of game.state.getAllPiles()) {
        const pos = this.pilePositions[pile.id];
        if (!pos) continue;
        this._renderPile(ctx, pile, pos.x, pos.y, dragState);
      }

      // Draw dragged cards on top
      if (hasDrag) {
        for (let i = 0; i < dragState.cards.length; i++) {
          const card = dragState.cards[i];
          const x = dragState.currentX - dragState.offsetX;
          const y = dragState.currentY - dragState.offsetY + i * this.overlapFaceUp;
          this.cardRenderer.drawCard(ctx, card, x, y);
        }
      }

      ctx.restore();
    } else {
      // Static: just blit the cached background
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(this._bgCanvas, 0, 0);
      ctx.restore();
    }
  }

  _renderPile(ctx, pile, x, y, dragState) {
    if (pile.isEmpty()) {
      this.cardRenderer.drawEmptyPile(ctx, x, y, pile.type);
      // Still record position for drop targeting
      this.cardPositions.push({
        pileId: pile.id,
        cardIndex: -1,
        x, y,
        width: this.cardWidth,
        height: this.cardHeight
      });
      return;
    }

    if (pile.type === 'tableau') {
      let cy = y;
      for (let i = 0; i < pile.cards.length; i++) {
        const card = pile.cards[i];

        // Skip cards being dragged or animated
        if (dragState && dragState.fromPileId === pile.id && i >= dragState.fromCardIndex) {
          continue;
        }
        if (card._animating) {
          continue;
        }

        this.cardRenderer.drawCard(ctx, card, x, cy);
        this.cardPositions.push({
          pileId: pile.id,
          cardIndex: i,
          x, y: cy,
          width: this.cardWidth,
          height: this.cardHeight
        });

        cy += card.faceUp ? this.overlapFaceUp : this.overlapFaceDown;
      }
    } else {
      // Stock, waste, foundation: only show top card
      const topCard = pile.topCard();

      // For stock, show card back count indicator
      if (pile.type === 'stock' && pile.cards.length > 1) {
        // Draw slight offset to show stack depth
        const offset = Math.min(2, pile.cards.length > 5 ? 2 : 1);
        ctx.fillStyle = '#1a5276';
        this._roundRect(ctx, x + offset, y + offset, this.cardWidth, this.cardHeight, 4);
      }

      // Check if top card is being dragged or animated
      const isDragged = dragState && dragState.fromPileId === pile.id &&
                        dragState.fromCardIndex === pile.cards.length - 1;

      if (topCard._animating || isDragged) {
        // Show the card underneath or empty pile
        const visibleIndex = pile.cards.length - 2;
        if (visibleIndex >= 0) {
          this.cardRenderer.drawCard(ctx, pile.cards[visibleIndex], x, y);
        } else {
          this.cardRenderer.drawEmptyPile(ctx, x, y, pile.type);
        }
      } else {
        this.cardRenderer.drawCard(ctx, topCard, x, y);
      }
      this.cardPositions.push({
        pileId: pile.id,
        cardIndex: pile.cards.length - 1,
        x, y,
        width: this.cardWidth,
        height: this.cardHeight
      });
    }
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Hit test: find which card/pile is at the given canvas coordinates.
   * Iterates in reverse order (topmost cards first).
   */
  hitTest(x, y) {
    for (let i = this.cardPositions.length - 1; i >= 0; i--) {
      const cp = this.cardPositions[i];
      if (x >= cp.x && x <= cp.x + cp.width && y >= cp.y && y <= cp.y + cp.height) {
        return {
          pileId: cp.pileId,
          cardIndex: cp.cardIndex,
          x: cp.x,
          y: cp.y
        };
      }
    }
    return null;
  }

  /**
   * Find the pile closest to the given position for drop targeting.
   */
  findDropTarget(x, y, game) {
    let bestPile = null;
    let bestDist = Infinity;

    for (const [pileId, pos] of Object.entries(this.pilePositions)) {
      const pile = game.state.getPile(pileId);
      if (!pile) continue;
      if (pile.type === 'stock' || pile.type === 'waste') continue;

      // Calculate the effective Y of the top of the pile
      let pileTopY = pos.y;
      if (pile.type === 'tableau' && pile.cards.length > 0) {
        for (let i = 0; i < pile.cards.length; i++) {
          pileTopY += pile.cards[i].faceUp ? this.overlapFaceUp : this.overlapFaceDown;
        }
        pileTopY -= pile.cards[pile.cards.length - 1].faceUp ? this.overlapFaceUp : this.overlapFaceDown;
      }

      // Check if drop point is within expanded hit zone
      const hitPadding = this.cardWidth * 0.3;
      if (x >= pos.x - hitPadding && x <= pos.x + this.cardWidth + hitPadding &&
          y >= pos.y - hitPadding && y <= pileTopY + this.cardHeight + hitPadding) {
        const cx = pos.x + this.cardWidth / 2;
        const cy = pileTopY + this.cardHeight / 2;
        const dist = Math.hypot(x - cx, y - cy);
        if (dist < bestDist) {
          bestDist = dist;
          bestPile = pile;
        }
      }
    }

    return bestPile;
  }

  getPilePosition(pileId) {
    return this.pilePositions[pileId] || null;
  }
}
