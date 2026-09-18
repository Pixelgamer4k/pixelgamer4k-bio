/**
 * Procedural chiptune / MIDI-style Web Audio.
 * Original synthesis — no ripped MIDI/OGG.
 */

type Voice = { osc: OscillatorNode; gain: GainNode };

export class AudioBus {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private musicKind: 'town' | 'dungeon' | 'battle' | 'title' | null = null;

  async unlock() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.22;
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol = 0.35, when = 0) {
    if (!this.ctx || !this.master || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  sfx(kind: 'step' | 'talk' | 'confirm' | 'hurt' | 'heal' | 'hit' | 'win' | 'menu' | 'pickup' | 'deny' | 'quest' | 'wipe') {
    switch (kind) {
      case 'step':
        // sharper footstep snap
        this.tone(70 + Math.random() * 20, 0.035, 'triangle', 0.14);
        this.tone(140 + Math.random() * 40, 0.025, 'square', 0.07, 0.01);
        break;
      case 'talk':
        this.tone(420 + Math.random() * 80, 0.05, 'square', 0.12);
        break;
      case 'confirm':
        this.tone(520, 0.06, 'square', 0.18);
        this.tone(780, 0.08, 'square', 0.14, 0.05);
        break;
      case 'hurt':
        this.tone(180, 0.12, 'sawtooth', 0.25);
        this.tone(110, 0.18, 'sawtooth', 0.2, 0.04);
        break;
      case 'heal':
        this.tone(440, 0.08, 'sine', 0.2);
        this.tone(660, 0.1, 'sine', 0.16, 0.06);
        this.tone(880, 0.12, 'sine', 0.12, 0.12);
        break;
      case 'hit':
        this.tone(240, 0.07, 'square', 0.22);
        this.tone(160, 0.1, 'triangle', 0.18, 0.03);
        break;
      case 'win':
        [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.14, 'square', 0.16, i * 0.09));
        break;
      case 'menu':
        this.tone(330, 0.05, 'triangle', 0.12);
        break;
      case 'pickup':
        this.tone(660, 0.06, 'square', 0.15);
        this.tone(990, 0.1, 'square', 0.12, 0.05);
        break;
      case 'deny':
        this.tone(140, 0.12, 'sawtooth', 0.15);
        break;
      case 'quest':
        [523, 659, 784].forEach((f, i) => this.tone(f, 0.1, 'square', 0.18, i * 0.07));
        this.tone(1046, 0.18, 'sine', 0.12, 0.22);
        break;
      case 'wipe':
        this.tone(200, 0.08, 'triangle', 0.1);
        this.tone(90, 0.12, 'sine', 0.08, 0.05);
        break;
    }
  }

  playMusic(kind: 'town' | 'dungeon' | 'battle' | 'title') {
    if (this.musicKind === kind) return;
    this.stopMusic();
    this.musicKind = kind;
    this.musicStep = 0;
    const patterns: Record<string, number[]> = {
      title: [262, 330, 392, 523, 392, 330, 294, 262],
      town: [392, 440, 494, 523, 494, 440, 392, 349, 330, 349, 392, 440, 392, 349, 330, 294],
      dungeon: [196, 185, 175, 165, 175, 185, 196, 147, 165, 175, 185, 196, 175, 165, 147, 131],
      battle: [311, 311, 370, 311, 415, 370, 311, 277, 311, 370, 415, 466, 415, 370, 311, 277],
    };
    const seq = patterns[kind];
    const beat = kind === 'battle' ? 180 : kind === 'dungeon' ? 260 : 300;
    const tick = () => {
      if (!this.ctx || this.muted || this.musicKind !== kind) return;
      const f = seq[this.musicStep % seq.length];
      const type: OscillatorType = kind === 'battle' ? 'sawtooth' : kind === 'dungeon' ? 'triangle' : 'square';
      this.tone(f, beat / 1000 * 0.85, type, kind === 'title' ? 0.1 : 0.08);
      if (kind === 'town' && this.musicStep % 4 === 0) this.tone(f / 2, beat / 1000, 'triangle', 0.05);
      this.musicStep++;
      this.musicTimer = window.setTimeout(tick, beat);
    };
    tick();
  }

  stopMusic() {
    if (this.musicTimer != null) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
    this.musicKind = null;
  }
}
