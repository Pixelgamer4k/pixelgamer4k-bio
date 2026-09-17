/** 2 — Relic Rush: grab relics before timer */
import { makeFloor, makeRing, makeBlock, makeOrb, dist2, randPoint } from '../shell/arena.js';

export default {
  id: 'relic-rush',
  title: 'Relic Rush',
  blurb: 'Grab all relics before time runs out',
  roundSeconds: 70,
  allowAttack: false,
  winText: 'All relics secured!',
  loseText: 'Time’s up — relics left.',
  cam: { dist: 10, height: 6 },

  async setup(ctx) {
    const { scene } = ctx;
    scene.add(makeFloor(32, 0xe8d24a));
    scene.add(makeRing(14, 0x202022));
    // temple pillars
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const p = makeBlock(1.1, 3.2, 1.1, 0x2a2a2c, Math.cos(a) * 9, 1.6, Math.sin(a) * 9);
      scene.add(p);
    }
    this.relics = [];
    this.need = 6;
    for (let i = 0; i < this.need; i++) {
      const orb = makeOrb(0xffc107);
      const pt = randPoint(11, 2);
      orb.position.set(pt.x, 0.9, pt.z);
      orb.userData.spin = Math.random() * 10;
      orb.userData.taken = false;
      scene.add(orb);
      this.relics.push(orb);
    }
    this.got = 0;
    ctx.shell.setStatus(`Relics: 0 / ${this.need}`);
  },

  update(ctx, dt) {
    for (const orb of this.relics) {
      if (orb.userData.taken) continue;
      orb.userData.spin += dt;
      orb.rotation.y += dt * 2;
      orb.position.y = 0.9 + Math.sin(orb.userData.spin * 3) * 0.15;
      if (dist2(ctx.player.position, orb.position) < 1.2) {
        orb.userData.taken = true;
        orb.visible = false;
        this.got++;
        ctx.sfx.pickup();
        ctx.shell.setStatus(`Relics: ${this.got} / ${this.need}`);
      }
    }
    if (this.got >= this.need) return 'win';
    return null;
  },

  onTimeout() { return this.got >= this.need ? 'win' : 'lose'; },
  dispose() { this.relics = []; },
};
