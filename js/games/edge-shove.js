/** 8 — Edge Shove: knock rivals off platform */
import { createRival, animateSoftBlock } from '../shell/softblock.js';
import { makeFloor, makeRing, dist2 } from '../shell/arena.js';
import THREE from '../shell/three.js';

export default {
  id: 'edge-shove',
  title: 'Edge Shove',
  blurb: 'Knock rivals off the floating platform',
  roundSeconds: 80,
  arenaHalf: 7.5,
  winText: 'Platform cleared!',
  loseText: 'You fell — or rivals remain.',
  cam: { dist: 11, height: 7.5 },

  async setup(ctx) {
    const { scene } = ctx;
    // smaller platform, void below (dark fog)
    scene.fog = new THREE.Fog(0x1a1a1c, 14, 36);
    ctx.shell.renderer.setClearColor(0x1a1a1c, 1);
    const floor = makeFloor(16, 0xfedd04);
    scene.add(floor);
    scene.add(makeRing(7.8, 0x202022));
    this.platformR = 7.5;
    this.rivals = [];
    for (let i = 0; i < 4; i++) {
      const r = createRival(0xe74c3c);
      const a = (i / 4) * Math.PI * 2 + 0.4;
      r.position.set(Math.cos(a) * 4, 0, Math.sin(a) * 4);
      r.userData.ai = {
        alive: true,
        vx: 0,
        vz: 0,
        state: { moving: true, attackTimer: 0, attackDur: 0.28, animT: 0 },
      };
      scene.add(r);
      this.rivals.push(r);
    }
    ctx.player.position.set(0, 0, 2);
    ctx.shell.arenaHalf = 7.2;
    this.fallen = 0;
    ctx.shell.setStatus('Shove rivals off — 4 left');
  },

  update(ctx, dt) {
    const { player, shell, sfx, playerState } = ctx;

    // player falls?
    if (Math.hypot(player.position.x, player.position.z) > this.platformR) {
      player.position.y -= 8 * dt;
      if (player.position.y < -3) return 'lose';
    }

    let alive = 0;
    for (const r of this.rivals) {
      const ai = r.userData.ai;
      if (!ai.alive) continue;
      alive++;

      // chase / shove player
      const d = dist2(player.position, r.position);
      const ang = Math.atan2(player.position.x - r.position.x, player.position.z - r.position.z);
      r.rotation.y = ang;
      ai.vx += Math.sin(ang) * 10 * dt;
      ai.vz += Math.cos(ang) * 10 * dt;
      ai.vx *= 0.92;
      ai.vz *= 0.92;
      r.position.x += ai.vx * dt;
      r.position.z += ai.vz * dt;
      animateSoftBlock(r, ai.state, dt);

      if (d < 1.4) {
        // mutual push
        const nx = (player.position.x - r.position.x) / (d || 1);
        const nz = (player.position.z - r.position.z) / (d || 1);
        shell.knockPlayer(nx, nz, 5);
        ai.vx -= nx * 6;
        ai.vz -= nz * 6;
      }

      if (shell.attackHit(r.position, 2.1)) {
        if (!ai.latch) {
          ai.latch = true;
          sfx.hit();
          const fx = Math.sin(player.rotation.y);
          const fz = Math.cos(player.rotation.y);
          ai.vx += fx * 14;
          ai.vz += fz * 14;
        }
      } else ai.latch = false;

      if (Math.hypot(r.position.x, r.position.z) > this.platformR) {
        r.position.y -= 10 * dt;
        if (r.position.y < -2) {
          ai.alive = false;
          r.visible = false;
          this.fallen++;
          sfx.score();
          ctx.shell.setStatus(`Shove rivals off — ${4 - this.fallen} left`);
        }
      }
    }

    if (alive === 0) return 'win';
    return null;
  },

  onTimeout() { return 'lose'; },
  dispose() { this.rivals = []; },
};
