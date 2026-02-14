export class HUD {
  constructor(gameController) {
    this.gc = gameController;
    this.timerInterval = null;

    this.moveCountEl = document.getElementById('move-count');
    this.timerEl = document.getElementById('timer');
    this.btnUndo = document.getElementById('btn-undo');
    this.btnNew = document.getElementById('btn-new');

    this.btnUndo.addEventListener('click', () => this.gc.undo());
    this.btnNew.addEventListener('click', () => this.gc.newGame());
  }

  startTimer() {
    this.stopTimer();
    this.timerInterval = setInterval(() => this.updateTimer(), 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  update() {
    const game = this.gc.game;
    if (!game) return;

    this.moveCountEl.textContent = `Siirrot: ${game.state.moveCount}`;
    this.btnUndo.disabled = !game.state.canUndo();
    this.updateTimer();
  }

  updateTimer() {
    const game = this.gc.game;
    if (!game || !game.state.startTime) return;

    const elapsed = Math.floor((Date.now() - game.state.startTime) / 1000);
    const min = Math.floor(elapsed / 60);
    const sec = elapsed % 60;
    this.timerEl.textContent = `${min}:${sec.toString().padStart(2, '0')}`;
  }
}
