/** 4 — Fuse Run: plant charges then get clear */
import { makeFloor, makeRing, makeBlock, makePad, dist2 } from '../shell/arena.js';
import THREE from '../shell/three.js';

export default {
  id: 'fuse-run',
  title: 'Fuse Run',
  blurb: 'Plant 3 charges, then clear the blast zone',
  roundSeconds: 85,
  winText: 'Charges detonated — you cleared!',
  loseText: 'Caught in the blast or out of time.',
  cam: { dist: 10, height: 6 },

  async setup(ctx) {
    const { scene } = ctx;
    scene.add(makeFloor(30, 0xe6ce40));
    scene.add(makeRing(13, 0x202022));
    // hazard barrels as plant spots markers
    this.sites = [];
    const spots = [[-7, -5], [7, -5], [0, 7]];
    for (const [x, z] of spots) {
      const pad = makePad(1.4, 0xe67e22, 0.08);
      pad.position.set(x, 0.08, z);
      scene.add(pad);
      const marker = makeBlock(0.7, 0.9, 0.7, 0xc0392b, x, 0.45, z);
      scene.add(marker);
      this.sites.push({ x, z, planted: false, pad, marker, charge: null });
    }
    this.planted = 0;
    this.phase = 'plant'; // plant -> fuse -> boom
    this.fuse = 0;
    this.blastR = 5.5;
    ctx.shell.setStatus('Attack near orange pads to plant (0/3)');
  },

  update(ctx, dt) {
    const { player, shell, scene, sfx } = ctx;

    if (this.phase === 'plant') {
      for (const s of this.sites) {
        if (s.planted) continue;
        if (dist2(player.position, s) < 1.6 && shell.isAttacking()) {
          if (!s.latch) {
            s.latch = true;
            s.planted = true;
            this.planted++;
            s.marker.material.color.setHex(0x27ae60);
            sfx.plant();
            const charge = makeBlock(0.5, 0.5, 0.5, 0xf1c40f, s.x, 0.9, s.z);
            scene.add(charge);
            s.charge = charge;
            ctx.shell.setStatus(`Planted ${this.planted}/3`);
          }
        } else {
          s.latch = false;
        }
      }
      if (this.planted >= 3) {
        this.phase = 'fuse';
        this.fuse = 4.5;
        ctx.shell.setStatus('GET CLEAR — blast in 4.5s!');
      }
    } else if (this.phase === 'fuse') {
      this.fuse -= dt;
      ctx.shell.setStatus(`GET CLEAR — ${this.fuse.toFixed(1)}s`);
      for (const s of this.sites) {
        if (s.charge) {
          s.charge.rotation.y += dt * 8;
          s.charge.scale.setScalar(1 + Math.sin(this.fuse * 12) * 0.1);
        }
      }
      if (this.fuse <= 0) {
        this.phase = 'boom';
        sfx.boom();
        // check distance to any site
        let hit = false;
        for (const s of this.sites) {
          if (dist2(player.position, s) < this.blastR) hit = true;
          if (s.charge) s.charge.visible = false;
          s.pad.material.emissiveIntensity = 0.8;
        }
        return hit ? 'lose' : 'win';
      }
    }
    return null;
  },

  onTimeout() { return 'lose'; },
  dispose() { this.sites = []; },
};
