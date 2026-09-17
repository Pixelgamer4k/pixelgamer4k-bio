/** 10 — Point Storm: score until buzzer */
import { makeFloor, makeRing, makeOrb, makeBlock, dist2, randPoint } from '../shell/arena.js';
import { createRival, animateSoftBlock } from '../shell/softblock.js';

export default {
  id: 'point-storm',
  title: 'Point Storm',
  blurb: 'Rack score until the buzzer',
  roundSeconds: 60,
  winText: 'Storm survived — high score!',
  loseText: 'Not enough points.',
  cam: { dist: 10, height: 6 },

  async setup(ctx) {
    const { scene } = ctx;
    scene.add(makeFloor(30, 0xf5e060));
    scene.add(makeRing(13, 0x202022));
    // score gates / arches
    for (const x of [-6, 0, 6]) {
      scene.add(makeBlock(0.4, 2.5, 0.4, 0x202022, x - 1.2, 1.25, -6));
      scene.add(makeBlock(0.4, 2.5, 0.4, 0x202022, x + 1.2, 1.25, -6));
      scene.add(makeBlock(2.8, 0.35, 0.4, 0xf39c12, x, 2.5, -6));
    }
    this.score = 0;
    this.target = 25;
    this.pickups = [];
    this.spawnTimer = 0;
    this.rivals = [];
    for (let i = 0; i < 2; i++) {
      const r = createRival(0x34495e);
      r.position.set(i === 0 ? -5 : 5, 0, 0);
      r.userData.ai = { state: { moving: true, attackTimer: 0, attackDur: 0.28, animT: 0 } };
      scene.add(r);
      this.rivals.push(r);
    }
    ctx.shell.setStatus(`Score 0 / ${this.target}`);
  },

  spawnPickup(ctx) {
    const o = makeOrb(Math.random() > 0.7 ? 0xe74c3c : 0xf1c40f);
    const pt = randPoint(10, 1);
    o.position.set(pt.x, 0.85, pt.z);
    o.userData.value = o.material.color.getHex() === 0xe74c3c ? 3 : 1;
    o.userData.life = 8;
    ctx.scene.add(o);
    this.pickups.push(o);
  },

  update(ctx, dt) {
    const { player, shell, sfx } = ctx;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.pickups.length < 8) {
      this.spawnTimer = 0.9;
      this.spawnPickup(ctx);
    }

    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const o = this.pickups[i];
      o.userData.life -= dt;
      o.rotation.y += dt * 3;
      o.position.y = 0.85 + Math.sin(performance.now() * 0.006 + i) * 0.12;
      if (o.userData.life <= 0) {
        ctx.scene.remove(o);
        this.pickups.splice(i, 1);
        continue;
      }
      if (dist2(player.position, o.position) < 1.2) {
        this.score += o.userData.value;
        sfx.score();
        ctx.scene.remove(o);
        this.pickups.splice(i, 1);
        ctx.shell.setStatus(`Score ${this.score} / ${this.target}`);
      }
    }

    // rivals steal / bump
    for (const r of this.rivals) {
      const ai = r.userData.ai;
      // chase nearest pickup or player
      let target = player.position;
      if (this.pickups[0]) target = this.pickups[0].position;
      const ang = Math.atan2(target.x - r.position.x, target.z - r.position.z);
      r.rotation.y = ang;
      r.position.x += Math.sin(ang) * 3.4 * dt;
      r.position.z += Math.cos(ang) * 3.4 * dt;
      animateSoftBlock(r, ai.state, dt);

      if (shell.attackHit(r.position)) {
        if (!ai.latch) {
          ai.latch = true;
          sfx.hit();
          this.score += 1;
          ctx.shell.setStatus(`Score ${this.score} / ${this.target}`);
          const nx = r.position.x - player.position.x;
          const nz = r.position.z - player.position.z;
          const len = Math.hypot(nx, nz) || 1;
          r.position.x += (nx / len) * 2;
          r.position.z += (nz / len) * 2;
        }
      } else ai.latch = false;

      if (dist2(player.position, r.position) < 1.2) {
        shell.knockPlayer(
          (player.position.x - r.position.x),
          (player.position.z - r.position.z),
          4
        );
      }
    }

    // crossing under arches gives bonus once per approach
    if (player.position.z < -5.5 && player.position.z > -6.5 && Math.abs(player.position.x) < 8) {
      if (!this.gateLatch) {
        this.gateLatch = true;
        this.score += 2;
        sfx.pickup();
        ctx.shell.setStatus(`Score ${this.score} / ${this.target}`);
      }
    } else if (player.position.z > -4) {
      this.gateLatch = false;
    }

    if (this.score >= this.target) return 'win';
    return null;
  },

  onTimeout() {
    return this.score >= this.target ? 'win' : 'lose';
  },
  dispose() { this.pickups = []; this.rivals = []; },
};
