/** 5 — Hill King: hold high pad vs rivals */
import { createRival, animateSoftBlock } from '../shell/softblock.js';
import { makeFloor, makeRing, makeBlock, makePad, dist2, randPoint } from '../shell/arena.js';

export default {
  id: 'hill-king',
  title: 'Hill King',
  blurb: 'Hold the high pad longer than rivals',
  roundSeconds: 70,
  winText: 'You ruled the hill!',
  loseText: 'Lost the crown.',
  cam: { dist: 11, height: 7 },

  async setup(ctx) {
    const { scene } = ctx;
    scene.add(makeFloor(30, 0xedd64a));
    scene.add(makeRing(13, 0x202022));
    // raised hill
    const hill = makeBlock(6, 1.4, 6, 0x3d3d40, 0, 0.7, 0);
    scene.add(hill);
    this.pad = makePad(2.0, 0x2ecc71, 1.5);
    this.pad.position.set(0, 1.48, 0);
    scene.add(this.pad);
    this.playerHold = 0;
    this.rivalHold = 0;
    this.need = 12; // seconds of control to win
    this.rivals = [];
    for (let i = 0; i < 3; i++) {
      const r = createRival(0x55555c);
      const pt = randPoint(10, 4);
      r.position.set(pt.x, 0, pt.z);
      r.userData.ai = { state: { moving: true, attackTimer: 0, attackDur: 0.28, animT: 0 }, cd: 0 };
      scene.add(r);
      this.rivals.push(r);
    }
    ctx.player.position.set(0, 1.4, 5);
    ctx.shell.setStatus('Hold green pad — 0s / 12s');
  },

  onPad(pos) {
    return Math.abs(pos.x) < 2.2 && Math.abs(pos.z) < 2.2 && pos.y >= 0;
  },

  update(ctx, dt) {
    const { player, shell } = ctx;
    // climb onto hill when near
    const onHill = Math.abs(player.position.x) < 3.2 && Math.abs(player.position.z) < 3.2;
    player.position.y = onHill ? 1.4 : 0;

    let rivalOn = false;
    for (const r of this.rivals) {
      const ai = r.userData.ai;
      const ang = Math.atan2(-r.position.x, -r.position.z); // toward center
      r.rotation.y = ang;
      r.position.x += Math.sin(ang) * 3.5 * dt;
      r.position.z += Math.cos(ang) * 3.5 * dt;
      const rHill = Math.abs(r.position.x) < 3.2 && Math.abs(r.position.z) < 3.2;
      r.position.y = rHill ? 1.4 : 0;
      if (Math.hypot(r.position.x, r.position.z) < 2.0) rivalOn = true;
      animateSoftBlock(r, ai.state, dt);

      if (shell.attackHit(r.position, 2)) {
        if (!ai.latch) {
          ai.latch = true;
          ctx.sfx.hit();
          const nx = r.position.x - player.position.x;
          const nz = r.position.z - player.position.z;
          const len = Math.hypot(nx, nz) || 1;
          r.position.x += (nx / len) * 2.5;
          r.position.z += (nz / len) * 2.5;
        }
      } else ai.latch = false;

      // rival bumps player
      if (dist2(player.position, r.position) < 1.3) {
        const nx = player.position.x - r.position.x;
        const nz = player.position.z - r.position.z;
        const len = Math.hypot(nx, nz) || 1;
        shell.knockPlayer(nx / len, nz / len, 6);
      }
    }

    const playerOn = Math.hypot(player.position.x, player.position.z) < 2.0 && onHill;
    if (playerOn && !rivalOn) {
      this.playerHold += dt;
      this.pad.material.emissiveIntensity = 0.45;
    } else if (rivalOn && !playerOn) {
      this.rivalHold += dt;
      this.pad.material.emissiveIntensity = 0.1;
    } else {
      this.pad.material.emissiveIntensity = 0.2;
    }
    ctx.shell.setStatus(`Your hold ${this.playerHold.toFixed(1)}s / ${this.need}s`);
    if (this.playerHold >= this.need) return 'win';
    if (this.rivalHold >= this.need) return 'lose';
    return null;
  },

  onTimeout(ctx) {
    return this.playerHold > this.rivalHold ? 'win' : 'lose';
  },
  dispose() { this.rivals = []; },
};
