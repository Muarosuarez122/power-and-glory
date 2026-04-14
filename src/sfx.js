/**
 * PODER & GLORIA — Sound Effects (Web Audio API)
 * Lightweight synthesized sounds for game feedback.
 */

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(freq, duration = 0.15, type = 'sine', volume = 0.12) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Silently fail if audio not available
  }
}

export const SFX = {
  /** Positive action — ascending chime */
  action() {
    playTone(520, 0.1, 'sine', 0.1);
    setTimeout(() => playTone(660, 0.12, 'sine', 0.08), 80);
  },

  /** Negative event — descending */
  negative() {
    playTone(400, 0.12, 'square', 0.06);
    setTimeout(() => playTone(300, 0.15, 'square', 0.05), 100);
  },

  /** Turn notification — bright ding */
  yourTurn() {
    playTone(880, 0.08, 'sine', 0.1);
    setTimeout(() => playTone(1100, 0.1, 'sine', 0.1), 100);
    setTimeout(() => playTone(1320, 0.15, 'sine', 0.08), 200);
  },

  /** Button click — subtle */
  click() {
    playTone(600, 0.06, 'sine', 0.05);
  },

  /** Chat message received */
  chat() {
    playTone(700, 0.08, 'triangle', 0.07);
    setTimeout(() => playTone(900, 0.1, 'triangle', 0.05), 70);
  },

  /** Victory fanfare */
  victory() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => {
      setTimeout(() => playTone(n, 0.25, 'sine', 0.12), i * 150);
    });
  },

  /** Defeat — sad */
  defeat() {
    playTone(440, 0.3, 'sine', 0.1);
    setTimeout(() => playTone(370, 0.3, 'sine', 0.08), 250);
    setTimeout(() => playTone(330, 0.5, 'sine', 0.06), 500);
  },

  /** Random event — dramatic */
  event() {
    playTone(300, 0.15, 'sawtooth', 0.05);
    setTimeout(() => playTone(500, 0.1, 'sawtooth', 0.06), 120);
    setTimeout(() => playTone(700, 0.2, 'sawtooth', 0.04), 220);
  },
};
