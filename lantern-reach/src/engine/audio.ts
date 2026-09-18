/** Soft ambient + cue bed — Web Audio only, no samples/CDN. */

export class AudioBed {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private drone: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private lfo: OscillatorNode | null = null;
  started = false;

  async ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return;
    }
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.22;
    this.master.connect(ctx.destination);

    // low ember drone
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 55;
    const g = ctx.createGain();
    g.gain.value = 0.35;
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.07;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 8;
    lfo.connect(lfoG);
    lfoG.connect(osc.frequency);
    osc.connect(g);
    g.connect(this.master);
    osc.start();
    lfo.start();
    this.drone = osc;
    this.droneGain = g;
    this.lfo = lfo;

    // soft high pad
    const pad = ctx.createOscillator();
    pad.type = 'triangle';
    pad.frequency.value = 110;
    const pg = ctx.createGain();
    pg.gain.value = 0.06;
    pad.connect(pg);
    pg.connect(this.master);
    pad.start();

    this.started = true;
  }

  /** Quiet tick when watchman is near / looking */
  pulseThreat(amount: number) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = 90 + amount * 40;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.04 * amount, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.2);
  }

  interactBlip() {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(420, t);
    o.frequency.exponentialRampToValueAtTime(280, t + 0.12);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.16);
  }

  softSuccess() {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    for (const [f, d] of [[330, 0], [415, 0.12], [523, 0.24]] as const) {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + d);
      g.gain.exponentialRampToValueAtTime(0.07, t + d + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.35);
      o.connect(g);
      g.connect(this.master!);
      o.start(t + d);
      o.stop(t + d + 0.4);
    }
  }

  setMutedIntensity(sprint: boolean, fuel: number) {
    if (!this.droneGain || !this.ctx) return;
    const base = 0.28 + (1 - fuel) * 0.08;
    this.droneGain.gain.setTargetAtTime(sprint ? base * 1.15 : base, this.ctx.currentTime, 0.2);
  }
}
