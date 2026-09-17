/** 6 — Guard Grab: collect orbs then defend stash */
import { createRival, animateSoftBlock } from '../shell/softblock.js';
import { makeFloor, makeRing, makePad, makeOrb, makeBlock, dist2, randPoint } from '../shell/arena.js';

export default {
  id: 'guard-grab',
  title: 'Guard Grab',
  blurb: 'Collect orbs, then defend the stash',
  roundSeconds: 90,
  winText: 'Stash defended!',
  loseText: 'Stash was emptied.',
  cam: { dist: 10, height: 6 },

  async setup(ctx) {
    const { scene } = ctx;
    scene.add(makeFloor(30, 0xf0d850));
    scene.add(makeRing(13, 0x202022));
    this.stash = makePad(2.4, 0x3498db, 0.1);
    this.stash.position.set(0, 0.1, 0);
    scene.add(this.stash);
    scene.add(makeBlock(1.2, 0.8, 1.2, 0x2980b9, 0, 0.5, 0));

    this.orbs = [];
    for (let i = 0; i < 5; i++) {
      const o = makeOrb(0x5dade2);
      const pt = randPoint(11, 4);
      o.position.set(pt.x, 0.8, pt.z);
      o.userData.taken = false;
      scene.add(o);
      this.orbs.push(o);
    }
    this.collected = 0;
    this.stashHp = 5;
    this.phase = 'collect';
    this.rivals = [];
    ctx.shell.setStatus('Collect orbs: 0/5');
  },

  spawnRaiders(ctx) {
    const { scene } = ctx;
    for (let i = 0; i < 4; i++) {
      const r = createRival(0x6c3483);
      const a = (i / 4) * Math.PI * 2;
      r.position.set(Math.cos(a) * 11, 0, Math.sin(a) * 11);
      r.userData.ai = {
        state: { moving: true, attackTimer: 0, attackDur: 0.28, animT: 0 },
        stealCd: 0,
        alive: true,
      };
      scene.add(r);
      this.rivals.push(r);
    }
  },

  update(ctx, dt) {
    const { player, shell, sfx } = ctx;

    if (this.phase === 'collect') {
      for (const o of this.orbs) {
        if (o.userData.taken) continue;
        o.rotation.y += dt * 2;
        if (dist2(player.position, o.position) < 1.15) {
          o.userData.taken = true;
          o.visible = false;
          this.collected++;
          sfx.pickup();
          ctx.shell.setStatus(`Collect orbs: ${this.collected}/5`);
        }
      }
      if (this.collected >= 5) {
        this.phase = 'defend';
        this.defendTime = 20;
        this.spawnRaiders(ctx);
        ctx.shell.setStatus(`Defend stash ${this.stashHp} HP — ${this.defendTime.toFixed(0)}s`);
      }
      return null;
    }

    // defend
    this.defendTime -= dt;
    let raiders = 0;
    for (const r of this.rivals) {
      const ai = r.userData.ai;
      if (!ai.alive) continue;
      raiders++;
      const ang = Math.atan2(-r.position.x, -r.position.z);
      r.rotation.y = ang;
      r.position.x += Math.sin(ang) * 3.8 * dt;
      r.position.z += Math.cos(ang) * 3.8 * dt;
      animateSoftBlock(r, ai.state, dt);

      if (Math.hypot(r.position.x, r.position.z) < 2.2) {
        ai.stealCd -= dt;
        if (ai.stealCd <= 0) {
          ai.stealCd = 1.0;
          this.stashHp -= 1;
          sfx.hit();
          ctx.shell.setStatus(`Defend stash ${this.stashHp} HP — ${Math.max(0, this.defendTime).toFixed(0)}s`);
          // knock rival back a bit
          r.position.x *= 1.4;
          r.position.z *= 1.4;
        }
      }

      if (shell.attackHit(r.position)) {
        if (!ai.latch) {
          ai.latch = true;
          ai.alive = false;
          r.visible = false;
          sfx.hit();
        }
      } else ai.latch = false;
    }

    if (this.stashHp <= 0) return 'lose';
    if (this.defendTime <= 0 || raiders === 0) return 'win';
    return null;
  },

  onTimeout() {
    if (this.phase === 'collect') return 'lose';
    return this.stashHp > 0 ? 'win' : 'lose';
  },
  dispose() { this.orbs = []; this.rivals = []; },
};
