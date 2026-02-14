export class AnimationManager {
  constructor(cardRenderer) {
    this.cardRenderer = cardRenderer;
    this.animations = [];
    this.running = false;
    this.onComplete = null;
  }

  animate(cards, fromX, fromY, toX, toY, overlapY, duration = 350) {
    const startTime = performance.now();
    for (let i = 0; i < cards.length; i++) {
      cards[i]._animating = true;
      this.animations.push({
        card: cards[i],
        fromX,
        fromY: fromY + i * overlapY,
        toX,
        toY: toY + i * overlapY,
        startTime,
        duration
      });
    }
  }

  isAnimating() {
    return this.animations.length > 0;
  }

  render(ctx, dpr) {
    if (this.animations.length === 0) return false;

    const now = performance.now();
    let stillRunning = false;

    for (let i = this.animations.length - 1; i >= 0; i--) {
      const a = this.animations[i];
      let t = (now - a.startTime) / a.duration;

      if (t >= 1) {
        t = 1;
        a.card._animating = false;
        this.animations.splice(i, 1);
      } else {
        stillRunning = true;
      }

      // Ease out quad
      const ease = t * (2 - t);

      const x = a.fromX + (a.toX - a.fromX) * ease;
      const y = a.fromY + (a.toY - a.fromY) * ease;

      this.cardRenderer.drawCard(ctx, a.card, x, y);
    }

    if (!stillRunning && this.onComplete) {
      const cb = this.onComplete;
      this.onComplete = null;
      cb();
    }

    return stillRunning;
  }
}
