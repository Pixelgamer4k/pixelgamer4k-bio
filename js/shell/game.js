/**
 * Shared Three.js game shell — soft-block hero, chase cam, HUD, win/lose, music duck.
 */
import THREE from './three.js';
import { createSoftBlock, animateSoftBlock } from './softblock.js';
import { createInput } from './input.js';
import { createChaseCam } from './camera.js';
import { clampToArena } from './arena.js';
import { sfx } from './sfx.js';

const DEFAULT_MOVE = 7.2;
const ATTACK_DUR = 0.28;
const ATTACK_COOLDOWN = 0.35;
const ATTACK_RANGE = 1.85;

export class GameShell {
  /**
   * @param {object} opts
   * @param {HTMLElement} opts.root — #gameRoot
   * @param {HTMLCanvasElement} opts.canvas
   * @param {object} opts.hud — { timer, status, title, overlay, result, detail, exitBtn, againBtn }
   * @param {object} opts.touch — { stick, knob, attack }
   * @param {(v:number,ms?:number)=>void} opts.setBedVolume
   * @param {()=>void} [opts.onExit]
   */
  constructor(opts) {
    this.opts = opts;
    this.running = false;
    this.paused = false;
    this.ended = false;
    this.module = null;
    this.raf = 0;
    this.lastT = 0;
    this.timeLeft = 75;
    this.roundSeconds = 75;
    this.playerState = {
      moving: false,
      attackTimer: 0,
      attackDur: ATTACK_DUR,
      attackCd: 0,
      hp: 3,
      score: 0,
      vx: 0,
      vz: 0,
      knock: new THREE.Vector3(),
      animT: 0,
    };
    this.moveSpeed = DEFAULT_MOVE;
    this.arenaHalf = 12;
    this.allowMove = true;
    this.allowAttack = true;
    this._visHandler = () => {
      this.paused = document.hidden;
      if (!document.hidden) this.lastT = performance.now();
    };
  }

  async start(gameModule) {
    this.stop(false);
    this.module = gameModule;
    this.ended = false;
    this.paused = false;
    this.roundSeconds = gameModule.roundSeconds ?? 75;
    this.timeLeft = this.roundSeconds;
    this.playerState.hp = gameModule.playerHp ?? 3;
    this.playerState.score = 0;
    this.playerState.attackTimer = 0;
    this.playerState.attackCd = 0;
    this.playerState.knock.set(0, 0, 0);
    this.arenaHalf = gameModule.arenaHalf ?? 12;
    this.moveSpeed = gameModule.moveSpeed ?? DEFAULT_MOVE;
    this.allowMove = gameModule.allowMove !== false;
    this.allowAttack = gameModule.allowAttack !== false;

    const { root, canvas, hud, touch, setBedVolume } = this.opts;
    root.classList.add('active');
    root.setAttribute('aria-hidden', 'false');
    hud.overlay.classList.remove('show');
    hud.title.textContent = gameModule.title || 'Game';
    hud.status.textContent = gameModule.blurb || '';
    hud.timer.textContent = String(Math.ceil(this.timeLeft));
    hud.result.textContent = '';
    hud.detail.textContent = '';

    // Duck bed music
    setBedVolume?.(0.1, 500);

    // Renderer
    const isMobile = matchMedia('(max-width: 820px), (pointer: coarse)').matches;
    const dprCap = isMobile ? 1.5 : 2;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.setClearColor(0xfedd04, 1);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xfedd04, 22, 48);

    this.camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 120);
    this.chase = createChaseCam(this.camera);

    // Lights
    const hemi = new THREE.HemisphereLight(0xfff6c2, 0x4a4630, 0.85);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 0.85);
    sun.position.set(8, 18, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 50;
    sun.shadow.camera.left = -20;
    sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 20;
    sun.shadow.camera.bottom = -20;
    this.scene.add(sun);

    // Player
    this.player = createSoftBlock({ scale: 1 });
    this.player.position.set(0, 0, 4);
    this.scene.add(this.player);

    this.input = createInput(touch);
    this.ctx = {
      THREE,
      scene: this.scene,
      player: this.player,
      playerState: this.playerState,
      camera: this.camera,
      sfx,
      arenaHalf: this.arenaHalf,
      hud: this.opts.hud,
      shell: this,
    };

    if (typeof gameModule.setup === 'function') {
      await gameModule.setup(this.ctx);
    }

    this.chase.snap(this.player, gameModule.cam || {});
    this.running = true;
    this.lastT = performance.now();
    document.addEventListener('visibilitychange', this._visHandler);
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);

    // Bind overlay buttons once per start
    hud.exitBtn.onclick = () => this.exit();
    hud.againBtn.onclick = () => this.start(gameModule);

    this.loop(this.lastT);
  }

  resize() {
    if (!this.renderer) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const isMobile = matchMedia('(max-width: 820px), (pointer: coarse)').matches;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
    this.renderer.setSize(w, h, false);
  }

  loop(now) {
    if (!this.running) return;
    this.raf = requestAnimationFrame((t) => this.loop(t));
    if (this.paused || this.ended) {
      this.lastT = now;
      return;
    }
    const dt = Math.min(0.05, (now - this.lastT) / 1000);
    this.lastT = now;
    this.tick(dt);
  }

  tick(dt) {
    const move = this.input.readMove();
    const ps = this.playerState;

    // Attack
    if (this.allowAttack && ps.attackCd <= 0 && this.input.consumeAttack()) {
      ps.attackTimer = ATTACK_DUR;
      ps.attackCd = ATTACK_COOLDOWN;
      sfx.attack();
      this.module?.onAttack?.(this.ctx);
    }
    if (ps.attackTimer > 0) ps.attackTimer -= dt;
    if (ps.attackCd > 0) ps.attackCd -= dt;

    // Movement relative to camera yaw (N64 feel: stick relative to view)
    ps.moving = false;
    if (this.allowMove && (move.moving || ps.knock.lengthSq() > 0.01)) {
      const camYaw = Math.atan2(
        this.player.position.x - this.camera.position.x,
        this.player.position.z - this.camera.position.z
      );
      // Actually chase cam is behind player facing — use player facing from stick in camera space
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

      let mx = 0;
      let mz = 0;
      if (move.moving) {
        // stick y is screen-forward (negative y = up = forward)
        mx = right.x * move.x + forward.x * -move.y;
        mz = right.z * move.x + forward.z * -move.y;
        const len = Math.hypot(mx, mz) || 1;
        mx /= len;
        mz /= len;
        this.player.rotation.y = Math.atan2(mx, mz);
        ps.moving = true;
      }

      this.player.position.x += mx * this.moveSpeed * dt + ps.knock.x * dt;
      this.player.position.z += mz * this.moveSpeed * dt + ps.knock.z * dt;
      ps.knock.multiplyScalar(Math.max(0, 1 - dt * 8));
      clampToArena(this.player.position, this.arenaHalf);
    }

    animateSoftBlock(this.player, ps, dt);
    this.chase.update(this.player, dt, this.module?.cam || {});

    this.timeLeft -= dt;
    const { hud } = this.opts;
    hud.timer.textContent = String(Math.max(0, Math.ceil(this.timeLeft)));

    let result = null;
    if (typeof this.module?.update === 'function') {
      result = this.module.update(this.ctx, dt);
    }

    if (result === 'win' || result === 'lose') {
      this.end(result);
      return;
    }
    if (this.timeLeft <= 0) {
      const onTimeout = this.module?.onTimeout?.(this.ctx);
      this.end(onTimeout === 'win' ? 'win' : 'lose');
      return;
    }

    this.renderer.render(this.scene, this.camera);
  }

  /** Public helpers for modules */
  isAttacking() {
    return this.playerState.attackTimer > 0.08;
  }

  attackHit(targetPos, range = ATTACK_RANGE) {
    if (!this.isAttacking()) return false;
    const dx = targetPos.x - this.player.position.x;
    const dz = targetPos.z - this.player.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > range) return false;
    // must be roughly in front
    const facing = this.player.rotation.y;
    const ang = Math.atan2(dx, dz);
    let diff = ang - facing;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return Math.abs(diff) < 1.1;
  }

  knockPlayer(dx, dz, force = 10) {
    this.playerState.knock.x += dx * force;
    this.playerState.knock.z += dz * force;
  }

  setStatus(text) {
    this.opts.hud.status.textContent = text;
  }

  end(result) {
    if (this.ended) return;
    this.ended = true;
    const win = result === 'win';
    if (win) sfx.win();
    else sfx.lose();
    const { hud } = this.opts;
    hud.result.textContent = win ? 'You win' : 'Round over';
    hud.detail.textContent = win
      ? (this.module?.winText || 'Nice clear.')
      : (this.module?.loseText || 'Try again.');
    hud.overlay.classList.add('show');
    this.module?.onEnd?.(this.ctx, result);
    // Keep last frame
    if (this.renderer) this.renderer.render(this.scene, this.camera);
  }

  exit() {
    this.opts.setBedVolume?.(1.0, 500);
    this.stop(true);
    this.opts.onExit?.();
  }

  stop(hideRoot = true) {
    this.running = false;
    cancelAnimationFrame(this.raf);
    document.removeEventListener('visibilitychange', this._visHandler);
    if (this._onResize) window.removeEventListener('resize', this._onResize);
    try {
      this.module?.dispose?.(this.ctx);
    } catch (_) {}
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    this.scene = null;
    this.module = null;
    if (hideRoot) {
      this.opts.root.classList.remove('active');
      this.opts.root.setAttribute('aria-hidden', 'true');
    }
  }
}
