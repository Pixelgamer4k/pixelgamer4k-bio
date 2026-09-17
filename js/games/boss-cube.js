/** 9 — Boss Cube: duel bigger soft-block boss */
import { createSoftBlock, animateSoftBlock } from '../shell/softblock.js';
import { makeFloor, makeRing, makeBlock, makePad, dist2 } from '../shell/arena.js';

export default {
  id: 'boss-cube',
  title: 'Boss Cube',
  blurb: 'Duel the bigger soft-block boss',
  roundSeconds: 90,
  playerHp: 5,
  winText: 'Boss defeated!',
  loseText: 'The boss stood tall.',
  cam: { dist: 12, height: 7 },

  async setup(ctx) {
    const { scene } = ctx;
    scene.add(makeFloor(34, 0xe0c838));
    scene.add(makeRing(14, 0x202022));
    scene.add(makePad(3.5, 0xc0392b, 0.08));
    // arena pillars
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      scene.add(makeBlock(1.4, 4, 1.4, 0x202022, Math.cos(a) * 10, 2, Math.sin(a) * 10));
    }
    this.boss = createSoftBlock({ yellow: 0x8e44ad, ink: 0x1a1020, scale: 2.2 });
    this.boss.position.set(0, 0, -4);
    scene.add(this.boss);
    this.bossHp = 10;
    this.maxHp = 10;
    this.ai = {
      state: { moving: true, attackTimer: 0, attackDur: 0.4, animT: 0 },
      cd: 1,
      charge: 0,
      mode: 'chase',
    };
    ctx.player.position.set(0, 0, 6);
    ctx.shell.setStatus(`Boss HP ${this.bossHp}/${this.maxHp} · You ${ctx.playerState.hp}`);
  },

  update(ctx, dt) {
    const { player, shell, sfx, playerState } = ctx;
    const ai = this.ai;
    const b = this.boss;
    const d = dist2(player.position, b.position);

    ai.cd -= dt;
    if (ai.mode === 'chase') {
      const ang = Math.atan2(player.position.x - b.position.x, player.position.z - b.position.z);
      b.rotation.y = ang;
      const spd = this.bossHp < 4 ? 4.5 : 3.2;
      b.position.x += Math.sin(ang) * spd * dt;
      b.position.z += Math.cos(ang) * spd * dt;
      ai.state.moving = true;
      if (d < 2.8 && ai.cd <= 0) {
        ai.mode = 'slam';
        ai.charge = 0.45;
        ai.state.attackTimer = 0.45;
        ai.cd = 1.6;
      }
    } else if (ai.mode === 'slam') {
      ai.charge -= dt;
      ai.state.moving = false;
      if (ai.charge <= 0) {
        ai.mode = 'chase';
        if (d < 3.2) {
          const nx = (player.position.x - b.position.x) / (d || 1);
          const nz = (player.position.z - b.position.z) / (d || 1);
          shell.knockPlayer(nx, nz, 14);
          playerState.hp -= 1;
          sfx.hit();
          ctx.shell.setStatus(`Boss HP ${this.bossHp}/${this.maxHp} · You ${Math.max(0, playerState.hp)}`);
        }
      }
    }
    if (ai.state.attackTimer > 0) ai.state.attackTimer -= dt;
    animateSoftBlock(b, ai.state, dt);

    // player hits boss (scaled range)
    if (shell.attackHit(b.position, 2.8)) {
      if (!ai.latch) {
        ai.latch = true;
        this.bossHp -= 1;
        sfx.hit();
        const nx = b.position.x - player.position.x;
        const nz = b.position.z - player.position.z;
        const len = Math.hypot(nx, nz) || 1;
        b.position.x += (nx / len) * 1.5;
        b.position.z += (nz / len) * 1.5;
        ctx.shell.setStatus(`Boss HP ${this.bossHp}/${this.maxHp} · You ${playerState.hp}`);
      }
    } else ai.latch = false;

    if (playerState.hp <= 0) return 'lose';
    if (this.bossHp <= 0) return 'win';
    return null;
  },

  onTimeout() { return 'lose'; },
  dispose() { this.boss = null; },
};
