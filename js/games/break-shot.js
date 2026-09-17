/** 3 — Break Shot: smash target blocks */
import { makeFloor, makeRing, makeBlock, dist2, randPoint } from '../shell/arena.js';

export default {
  id: 'break-shot',
  title: 'Break Shot',
  blurb: 'Smash every glowing target block',
  roundSeconds: 80,
  winText: 'All targets smashed!',
  loseText: 'Targets remain.',
  cam: { dist: 9.5, height: 5.8 },

  async setup(ctx) {
    const { scene } = ctx;
    scene.add(makeFloor(28, 0xf2d84e));
    scene.add(makeRing(12.5, 0x202022));
    // walls forming lanes
    scene.add(makeBlock(18, 1.5, 0.6, 0x303034, 0, 0.75, -8));
    scene.add(makeBlock(18, 1.5, 0.6, 0x303034, 0, 0.75, 8));
    this.targets = [];
    for (let i = 0; i < 8; i++) {
      const pt = randPoint(9, 2);
      const t = makeBlock(1.1, 1.1, 1.1, 0xe74c3c, pt.x, 0.55, pt.z);
      t.material.emissive = t.material.color.clone();
      t.material.emissiveIntensity = 0.25;
      t.userData.hp = 2;
      t.userData.alive = true;
      scene.add(t);
      this.targets.push(t);
    }
    this.left = this.targets.length;
    ctx.shell.setStatus(`Targets: ${this.left}`);
  },

  update(ctx, dt) {
    const { shell, player, sfx } = ctx;
    for (const t of this.targets) {
      if (!t.userData.alive) continue;
      t.rotation.y += dt * 0.8;
      if (shell.attackHit(t.position, 2.0)) {
        if (!t.userData.latch) {
          t.userData.latch = true;
          t.userData.hp -= 1;
          sfx.hit();
          t.scale.multiplyScalar(0.92);
          if (t.userData.hp <= 0) {
            t.userData.alive = false;
            t.visible = false;
            this.left--;
            ctx.shell.setStatus(`Targets: ${this.left}`);
          }
        }
      } else {
        t.userData.latch = false;
      }
    }
    if (this.left <= 0) return 'win';
    return null;
  },

  onTimeout() { return 'lose'; },
  dispose() { this.targets = []; },
};
