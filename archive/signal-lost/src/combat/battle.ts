/**
 * Turn-ish punch combat — Glitch Warden with REAL phase change at 50% HP.
 * Phase 2 is spicier but beatable once with soda + telegraphs (no cheese required).
 */
export type BattlePhase = 'intro' | 'player' | 'enemy' | 'enemy_telegraph' | 'phase_flash' | 'win' | 'lose';

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
  /** Upcoming enemy hit shown during telegraph. */
  pendingDmg: number;
}

export function startBossBattle(): BattleState {
  return {
    active: true,
    enemyName: 'Glitch Warden',
    enemyHp: 36,
    enemyMaxHp: 36,
    phase: 1,
    mode: 'intro',
    timer: 1.2,
    flash: 0,
    log: 'Glitch Warden boots up…',
    playerHurt: false,
    playerAttack: false,
    enemyFrame: 0,
    pendingDmg: 0,
  };
}

function rollEnemyDmg(phase: 1 | 2): number {
  // P1: 2–4 · P2: 3–5 (was 5–7 — lethal). Competent player with 1 soda clears once.
  if (phase === 2) return 3 + Math.floor(Math.random() * 3);
  return 2 + Math.floor(Math.random() * 3);
}

function rollPlayerDmg(phase: 1 | 2): number {
  if (phase === 2) return 6 + Math.floor(Math.random() * 3); // 6–8
  return 6 + Math.floor(Math.random() * 4); // 6–9
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
      b.log = 'PHASE 2 — yellow rage! Watch telegraphs.';
    }
    return;
  }

  if (b.mode === 'player') {
    b.playerHurt = false;
    if (opts.wantItem) {
      if (opts.onUseItem()) {
        b.log = 'Pixel Soda! HP up.';
        b.mode = 'enemy_telegraph';
        b.pendingDmg = rollEnemyDmg(b.phase);
        b.timer = 0.55;
        b.log += ` Warden winds up (${b.pendingDmg})…`;
      }
      return;
    }
    if (opts.wantAttack) {
      b.playerAttack = true;
      const dmg = rollPlayerDmg(b.phase);
      b.enemyHp = Math.max(0, b.enemyHp - dmg);
      b.log = `Nova punches for ${dmg}!`;
      b.timer = 0.4;
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
        return;
      }
      b.mode = 'enemy_telegraph';
      b.pendingDmg = rollEnemyDmg(b.phase);
      b.log += ` Warden winds up (${b.pendingDmg})…`;
      b.timer = b.phase === 2 ? 0.7 : 0.55;
    }
    return;
  }

  if (b.mode === 'enemy_telegraph') {
    if (b.timer > 0.15) b.playerAttack = false;
    if (b.timer <= 0) {
      b.mode = 'enemy';
      b.timer = 0.05;
    }
    return;
  }

  if (b.mode === 'enemy') {
    if (b.timer <= 0) {
      const dmg = b.pendingDmg || rollEnemyDmg(b.phase);
      opts.onPlayerHit(dmg);
      b.playerHurt = true;
      b.log = `${b.enemyName} hits for ${dmg}! Your turn.`;
      b.pendingDmg = 0;
      b.mode = 'player';
      b.timer = 0.25;
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
