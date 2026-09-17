/**
 * Turn-ish punch combat — Glitch Warden with REAL phase change at 50% HP.
 */
export type BattlePhase = 'intro' | 'player' | 'enemy' | 'phase_flash' | 'win' | 'lose';

export interface BattleState {
  active: boolean;
  enemyName: string;
  enemyHp: number;
  enemyMaxHp: number;
  phase: 1 | 2;
  mode: BattlePhase;
  timer: number;
  flash: number;
  log: string;
  playerHurt: boolean;
  playerAttack: boolean;
  enemyFrame: number;
}

export function startBossBattle(): BattleState {
  return {
    active: true,
    enemyName: 'Glitch Warden',
    enemyHp: 40,
    enemyMaxHp: 40,
    phase: 1,
    mode: 'intro',
    timer: 1.2,
    flash: 0,
    log: 'Glitch Warden boots up…',
    playerHurt: false,
    playerAttack: false,
    enemyFrame: 0,
  };
}

export function battleUpdate(
  b: BattleState,
  dt: number,
  opts: {
    playerHp: number;
    onPlayerHit: (dmg: number) => void;
    wantAttack: boolean;
    wantItem: boolean;
    onUseItem: () => boolean;
  },
): void {
  if (!b.active) return;
  b.enemyFrame += dt * (b.phase === 2 ? 10 : 6);
  b.timer -= dt;
  if (b.flash > 0) b.flash -= dt;

  if (b.mode === 'intro') {
    if (b.timer <= 0) {
      b.mode = 'player';
      b.log = 'Punch! (Action) · Item (I/Menu)';
    }
    return;
  }

  if (b.mode === 'phase_flash') {
    b.flash = Math.max(b.flash, 0.05);
    if (b.timer <= 0) {
      b.phase = 2;
      b.mode = 'player';
      b.log = 'PHASE 2 — yellow rage!';
    }
    return;
  }

  if (b.mode === 'player') {
    b.playerHurt = false;
    if (opts.wantItem) {
      if (opts.onUseItem()) {
        b.log = 'Pixel Soda! HP up.';
        b.mode = 'enemy';
        b.timer = 0.7;
      }
      return;
    }
    if (opts.wantAttack) {
      b.playerAttack = true;
      const dmg = b.phase === 2 ? 5 + Math.floor(Math.random() * 3) : 6 + Math.floor(Math.random() * 4);
      b.enemyHp = Math.max(0, b.enemyHp - dmg);
      b.log = `Nova punches for ${dmg}!`;
      b.timer = 0.45;
      b.mode = 'enemy';
      // phase change at half
      if (b.phase === 1 && b.enemyHp <= b.enemyMaxHp * 0.5 && b.enemyHp > 0) {
        b.mode = 'phase_flash';
        b.timer = 1.4;
        b.flash = 1.4;
        b.log = '…signal fractures — PHASE CHANGE!';
        b.playerAttack = false;
        return;
      }
      if (b.enemyHp <= 0) {
        b.mode = 'win';
        b.timer = 1.5;
        b.log = 'Glitch Warden crashed!';
      }
    }
    return;
  }

  if (b.mode === 'enemy') {
    if (b.timer > 0.2) b.playerAttack = false;
    if (b.timer <= 0) {
      const dmg = b.phase === 2 ? 5 + Math.floor(Math.random() * 3) : 3 + Math.floor(Math.random() * 3);
      opts.onPlayerHit(dmg);
      b.playerHurt = true;
      b.log = `${b.enemyName} hits for ${dmg}!`;
      if (opts.playerHp - dmg <= 0) {
        // caller applies damage; check after
      }
      b.mode = 'player';
      b.timer = 0.3;
      b.log += ' Your turn.';
    }
  }

  if (b.mode === 'win' || b.mode === 'lose') {
    // linger
  }
}

export function checkBattleEnd(b: BattleState, playerHp: number): 'win' | 'lose' | null {
  if (!b.active) return null;
  if (b.mode === 'win' && b.timer <= 0) return 'win';
  if (playerHp <= 0) {
    b.mode = 'lose';
    b.log = 'Signal faded…';
    return 'lose';
  }
  return null;
}
