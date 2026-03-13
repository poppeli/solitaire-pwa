/**
 * SoundManager — generates all sounds programmatically via Web Audio API.
 * No audio files needed. AudioContext is created lazily on first use
 * (browsers require a user gesture before allowing audio).
 */
export class SoundManager {
  constructor() {
    this._ctx = null;
  }

  _getCtx() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this._ctx;
  }

  // Pre-filled white noise buffer of given duration
  _noiseBuffer(ctx, durationSec) {
    const length = Math.ceil(ctx.sampleRate * durationSec);
    const buf = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  // Card drawn from stock: very short bandpass noise burst (~35ms) — paper rustle (A)
  playCardFlip() {
    try {
      const ctx = this._getCtx();
      if (ctx.state === 'suspended') ctx.resume();
      const t = ctx.currentTime;
      const dur = 0.035;

      const source = ctx.createBufferSource();
      source.buffer = this._noiseBuffer(ctx, dur);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2500;
      filter.Q.value = 1.2;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start(t);
      source.stop(t + dur);
    } catch (e) { /* AudioContext unavailable */ }
  }

  // Card moved to tableau: bandpass noise rustle (A, ~55ms) + snap click (D, ~8ms burst)
  playCardMove() {
    try {
      const ctx = this._getCtx();
      if (ctx.state === 'suspended') ctx.resume();
      const t = ctx.currentTime;

      // A: noise rustle
      const srcA = ctx.createBufferSource();
      srcA.buffer = this._noiseBuffer(ctx, 0.055);
      const fltA = ctx.createBiquadFilter();
      fltA.type = 'bandpass';
      fltA.frequency.value = 2000;
      fltA.Q.value = 0.8;
      const gainA = ctx.createGain();
      gainA.gain.setValueAtTime(0.22, t);
      gainA.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
      srcA.connect(fltA);
      fltA.connect(gainA);
      gainA.connect(ctx.destination);
      srcA.start(t);
      srcA.stop(t + 0.055);

      // D: snap click (short burst with highpass, longer decay)
      const srcD = ctx.createBufferSource();
      srcD.buffer = this._noiseBuffer(ctx, 0.008);
      const fltD = ctx.createBiquadFilter();
      fltD.type = 'highpass';
      fltD.frequency.value = 1000;
      const gainD = ctx.createGain();
      gainD.gain.setValueAtTime(0.38, t);
      gainD.gain.exponentialRampToValueAtTime(0.001, t + 0.075);
      srcD.connect(fltD);
      fltD.connect(gainD);
      gainD.connect(ctx.destination);
      srcD.start(t);
      srcD.stop(t + 0.008);
    } catch (e) { /* AudioContext unavailable */ }
  }

  // Card placed on foundation: crisp snap (D dominant) + short rustle (A, ~40ms)
  playFoundation() {
    try {
      const ctx = this._getCtx();
      if (ctx.state === 'suspended') ctx.resume();
      const t = ctx.currentTime;

      // A: shorter, slightly lower rustle
      const srcA = ctx.createBufferSource();
      srcA.buffer = this._noiseBuffer(ctx, 0.040);
      const fltA = ctx.createBiquadFilter();
      fltA.type = 'bandpass';
      fltA.frequency.value = 1800;
      fltA.Q.value = 1.0;
      const gainA = ctx.createGain();
      gainA.gain.setValueAtTime(0.18, t);
      gainA.gain.exponentialRampToValueAtTime(0.001, t + 0.040);
      srcA.connect(fltA);
      fltA.connect(gainA);
      gainA.connect(ctx.destination);
      srcA.start(t);
      srcA.stop(t + 0.040);

      // D: stronger snap — more prominent than in playCardMove
      const srcD = ctx.createBufferSource();
      srcD.buffer = this._noiseBuffer(ctx, 0.010);
      const fltD = ctx.createBiquadFilter();
      fltD.type = 'highpass';
      fltD.frequency.value = 800;
      const gainD = ctx.createGain();
      gainD.gain.setValueAtTime(0.50, t);
      gainD.gain.exponentialRampToValueAtTime(0.001, t + 0.085);
      srcD.connect(fltD);
      fltD.connect(gainD);
      gainD.connect(ctx.destination);
      srcD.start(t);
      srcD.stop(t + 0.010);
    } catch (e) { /* AudioContext unavailable */ }
  }

  // Two-note ascending signal at the start of auto-complete
  playAutoComplete() {
    this._tone(784, 0.14, 'sine', 0.25);
    setTimeout(() => this._tone(1047, 0.16, 'sine', 0.30), 160);
  }

  // Rising C major arpeggio on game win
  playWin() {
    const notes = [523, 659, 784, 1047, 1319]; // C5 E5 G5 C6 E6
    notes.forEach((freq, i) => {
      setTimeout(() => this._tone(freq, 0.14, 'sine', 0.40), i * 100);
    });
  }

  _tone(freq, gain, type, duration) {
    try {
      const ctx = this._getCtx();
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.type = type;
      osc.frequency.value = freq;
      gainNode.gain.setValueAtTime(gain, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (e) { /* AudioContext unavailable */ }
  }
}
