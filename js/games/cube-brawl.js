/** 1 — Cube Brawl: clear rivals with attacks */
import { createRival, animateSoftBlock } from '../shell/softblock.js';
import { makeFloor, makeRing, makeBlock, dist2, randPoint } from '../shell/arena.js';

const RIVAL_COLORS = [0x3a3a3e, 0x5c4a3a, 0x2f3d4a, 0x4a2f3a, 0x3d4a2f];

export default {
  id: 'cube-brawl',
  title: 'Cube Brawl',
  blurb: 'Clear every rival with attacks',
  roundSeconds: 75,
  winText: 'Arena cleared!',
  loseText: 'Rivals remain.',
  cam: { dist: 9, height: 5.5 },

  async setup(ctx) {
    const { scene, THREE } = ctx;
    scene.add(makeFloor(30, 0xf0dc58));
    scene.add(makeRing(13, 0x202022));
    // crates as cover
    for (const p of [[-6, 0, -4], [7, 0, 3], [-3, 0, 6], [5, 0, -7]]) {
      scene.add(makeBlock(1.4, 1.2, 1.4, 0x202022, p[0], 0.6, p[2]));
    }
    this.rivals = [];
    for (let i = 0; i < 5; i++) {
      const r = createRival(RIVAL_COLORS[i % RIVAL_COLORS.length]);
      const pt = randPoint(10, 3);
      r.position.set(pt.x, 0, pt.z);
      r.userData.ai = {
        hp: 2,
        cd: 0.5 + Math.random(),
        dir: Math.random() * Math.PI * 2,
        state: { moving: false, attackTimer: 0, attackDur: 0.28, animT: 0 },
        alive: true,
      };
      scene.add(r);
      this.rivals.push(r);
    }
    this.cleared = 0;
    ctx.shell.setStatus(`Rivals left: ${this.rivals.length}`);
  },

  update(ctx, dt) {
    const { player, shell, sfx } = ctx;
    let alive = 0;
    for (const r of this.rivals) {
      const ai = r.userData.ai;
      if (!ai.alive) {
        r.visible = false;
        continue;
      }
      alive++;
      ai.cd -= dt;
      // wander / chase
      const d = dist2(player.position, r.position);
      if (d < 8) {
        const ang = Math.atan2(player.position.x - r.position.x, player.position.z - r.position.z);
        r.rotation.y = ang;
        r.position.x += Math.sin(ang) * 3.2 * dt;
        r.position.z += Math.cos(ang) * 3.2 * dt;
        ai.state.moving = true;
        if (d < 1.6 && ai.cd <= 0) {
          ai.cd = 1.2;
          ai.state.attackTimer = 0.28;
          // bump player
          const nx = (player.position.x - r.position.x) / (d || 1);
          const nz = (player.position.z - r.position.z) / (d || 1);
          shell.knockPlayer(nx, nz, 8);
          ctx.playerState.hp -= 0.35;
        }
      } else {
        ai.dir += (Math.random() - 0.5) * dt;
        r.rotation.y = ai.dir;
        r.position.x += Math.sin(ai.dir) * 2 * dt;
        r.position.z += Math.cos(ai.dir) * 2 * dt;
        ai.state.moving = true;
      }
      if (ai.state.attackTimer > 0) ai.state.attackTimer -= dt;
      animateSoftBlock(r, ai.state, dt);

      if (shell.attackHit(r.position)) {
        if (!ai._hitLatch) {
          ai._hitLatch = true;
          ai.hp -= 1;
          sfx.hit();
          const nx = (r.position.x - player.position.x);
          const nz = (r.position.z - player.position.z);
          const len = Math.hypot(nx, nz) || 1;
          r.position.x += (nx / len) * 1.2;
          r.position.z += (nz / len) * 1.2;
          if (ai.hp <= 0) {
            ai.alive = false;
            this.cleared++;
            ctx.shell.setStatus(`Rivals left: ${5 - this.cleared}`);
          }
        }
      } else {
        ai._hitLatch = false;
      }
    }
    if (ctx.playerState.hp <= 0) return 'lose';
    if (alive === 0) return 'win';
    return null;
  },

  onTimeout() { return 'lose'; },
  dispose() { this.rivals = []; },
};
