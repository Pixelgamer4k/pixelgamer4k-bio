/** Lightweight procedural Web Audio SFX */
let ctx;

function ac() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function beep({ freq = 440, dur = 0.08, type = 'square', gain = 0.08, slide = 0 }) {
  const c = ac();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), c.currentTime + dur);
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start();
  o.stop(c.currentTime + dur + 0.02);
}

export const sfx = {
  attack() { beep({ freq: 180, dur: 0.1, type: 'square', gain: 0.07, slide: -80 }); },
  hit() { beep({ freq: 120, dur: 0.12, type: 'sawtooth', gain: 0.09, slide: -60 }); },
  pickup() { beep({ freq: 660, dur: 0.09, type: 'triangle', gain: 0.07, slide: 220 }); },
  win() {
    beep({ freq: 523, dur: 0.1, type: 'triangle', gain: 0.08 });
    setTimeout(() => beep({ freq: 659, dur: 0.1, type: 'triangle', gain: 0.08 }), 90);
    setTimeout(() => beep({ freq: 784, dur: 0.18, type: 'triangle', gain: 0.09 }), 180);
  },
  lose() { beep({ freq: 200, dur: 0.25, type: 'sawtooth', gain: 0.08, slide: -140 }); },
  plant() { beep({ freq: 90, dur: 0.15, type: 'square', gain: 0.06 }); },
  boom() { beep({ freq: 60, dur: 0.35, type: 'sawtooth', gain: 0.12, slide: -40 }); },
  tick() { beep({ freq: 880, dur: 0.04, type: 'square', gain: 0.04 }); },
  score() { beep({ freq: 740, dur: 0.06, type: 'triangle', gain: 0.06, slide: 100 }); },
};
