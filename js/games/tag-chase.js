/** 7 — Tag Chase: catch / avoid tag */
import { createRival, animateSoftBlock } from '../shell/softblock.js';
import { makeFloor, makeRing, makeBlock, dist2, randPoint } from '../shell/arena.js';

export default {
  id: 'tag-chase',
  title: 'Tag Chase',
  blurb: 'You are IT — tag all runners',
  roundSeconds: 75,
  allowAttack: true,
  winText: 'Everyone tagged!',
  loseText: 'Runners escaped.',
  cam: { dist: 9, height: 5.5 },

  async setup(ctx) {
    const { scene } = ctx;
    scene.add(makeFloor(32, 0xe8d246));
    scene.add(makeRing(14, 0x202022));
    // maze stubs
    for (const p of [[-5, -3], [5, 4], [-2, 6], [6, -6], [0, -8]]) {
      scene.add(makeBlock(2.5, 1.6, 0.7, 0x202022, p[0], 0.8, p[1]));
    }
    this.runners = [];
    for (let i = 0; i < 4; i++) {
      const r = createRival(0x1abc9c);
      const pt = randPoint(11, 5);
      r.position.set(pt.x, 0, pt.z);
      r.userData.ai = {
        tagged: false,
        dir: Math.random() * Math.PI * 2,
        state: { moving: true, attackTimer: 0, attackDur: 0.28, animT: 0 },
        panic: 0,
      };
      scene.add(r);
      this.runners.push(r);
    }
    this.left = 4;
    ctx.shell.setStatus('Tag runners: 4 left — attack to tag');
  },

  update(ctx, dt) {
    const { player, shell, sfx } = ctx;
    let left = 0;
    for (const r of this.runners) {
      const ai = r.userData.ai;
      if (ai.tagged) {
        r.visible = true;
        // frozen grey
        continue;
      }
      left++;
      const d = dist2(player.position, r.position);
      if (d < 7) {
        // flee
        const ang = Math.atan2(r.position.x - player.position.x, r.position.z - player.position.z);
        ai.dir = ang;
        r.position.x += Math.sin(ang) * 5.5 * dt;
        r.position.z += Math.cos(ang) * 5.5 * dt;
      } else {
        ai.dir += (Math.random() - 0.5) * 2 * dt;
        r.position.x += Math.sin(ai.dir) * 3.2 * dt;
        r.position.z += Math.cos(ai.dir) * 3.2 * dt;
      }
      // clamp
      r.position.x = Math.max(-12, Math.min(12, r.position.x));
      r.position.z = Math.max(-12, Math.min(12, r.position.z));
      r.rotation.y = ai.dir;
      animateSoftBlock(r, ai.state, dt);

      if ((d < 1.35 && shell.isAttacking()) || d < 0.95) {
        if (!ai.latch) {
          ai.latch = true;
          ai.tagged = true;
          // tint
          r.traverse((c) => {
            if (c.isMesh && c.material && c.material.color) {
              c.material = c.material.clone();
              c.material.color.setHex(0x7f8c8d);
            }
          });
          sfx.pickup();
          this.left--;
          ctx.shell.setStatus(`Tag runners: ${this.left} left`);
        }
      } else ai.latch = false;
    }
    if (left === 0) return 'win';
    return null;
  },

  onTimeout() { return 'lose'; },
  dispose() { this.runners = []; },
};
