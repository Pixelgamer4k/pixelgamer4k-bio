/** Storefront HUD: logo+tagline TL · Main Objective TC · coins/gems+pause TR · radar mid-right.
 *  Labels: Hull · Shield · Cargo · Scan · Magnet (+ Objective strip). */

export interface HudModel {
  hull: number;
  maxHull: number;
  shield: number;
  maxShield: number;
  cargo: number;
  cargoMax: number;
  coins: number;
  gems: number;
  scanReady: boolean;
  scanCd: number;
  magnetOn: boolean;
  magnetLevel: number;
  objective: string;
  objectiveProgress?: string;
  bossHp?: number;
  bossMax?: number;
  bossLabel?: string;
  toast?: string;
  paused?: boolean;
  radarBlips?: { x: number; y: number; kind: 'salvage' | 'enemy' | 'objective' | 'extract' }[];
}

export class Hud {
  root: HTMLDivElement;
  private el: Record<string, HTMLElement> = {};
  onPause?: () => void;
  onScan?: () => void;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'sj-hud';
    this.root.innerHTML = `
      <div class="brand">
        <div class="logo-mark">SJ</div>
        <div class="brand-text">
          <strong>SPACE JUNK</strong>
          <span>SALVAGERS</span>
        </div>
      </div>
      <div class="obj-strip">
        <span class="obj-k">Main Objective</span>
        <span class="obj-v" id="hudObjText">Collect 3 Power Cells (0/3)</span>
      </div>
      <div class="top-right">
        <div class="currency"><span class="coin" id="hudCoins">0</span></div>
        <div class="currency gem"><span id="hudGems">0</span></div>
        <button type="button" class="pause" id="hudPause" aria-label="Pause">❚❚</button>
      </div>
      <div class="boss-bar" id="hudBoss" hidden>
        <div class="boss-label" id="hudBossLabel">Junk Behemoth</div>
        <div class="boss-track"><i id="hudBossFill"></i></div>
      </div>
      <div class="stats">
        <div class="stat"><span class="k">Hull</span><div class="bar hull"><i id="hudHull"></i></div></div>
        <div class="stat"><span class="k">Shield</span><div class="bar shield"><i id="hudShield"></i></div></div>
        <div class="stat"><span class="k">Cargo</span><span class="n" id="hudCargo">0/12</span></div>
        <div class="stat scan-row">
          <span class="k">Scan</span>
          <button type="button" class="scan-btn" id="hudScanBtn">Pulse</button>
          <span class="n" id="hudScan">Ready</span>
        </div>
        <div class="stat"><span class="k">Magnet</span><span class="n" id="hudMagnet">Off</span></div>
      </div>
      <div class="radar" id="hudRadar"><canvas id="hudRadarCv" width="120" height="120"></canvas></div>
      <div class="toast" id="hudToast" hidden></div>
      <div class="hints" id="hudHints">
        <span>WASD Move</span><span>Mouse Aim</span><span>LMB Fire</span><span>RMB Magnet</span><span>Space Boost</span><span>Q Scan</span>
      </div>
    `;
    parent.appendChild(this.root);
    this.injectStyles();
    for (const id of [
      'hudObjText', 'hudHull', 'hudShield', 'hudCargo', 'hudCoins', 'hudGems',
      'hudScan', 'hudMagnet', 'hudToast', 'hudBoss', 'hudBossLabel', 'hudBossFill',
      'hudHints', 'hudPause', 'hudScanBtn', 'hudRadarCv',
    ]) {
      this.el[id] = this.root.querySelector('#' + id) as HTMLElement;
    }
    this.el.hudPause.addEventListener('click', () => this.onPause?.());
    this.el.hudScanBtn.addEventListener('click', () => this.onScan?.());
  }

  setTouchMode(touch: boolean) {
    this.el.hudHints.style.display = touch ? 'none' : 'flex';
  }

  update(m: HudModel) {
    this.el.hudObjText.textContent = m.objectiveProgress
      ? `${m.objective} (${m.objectiveProgress})`
      : m.objective;
    (this.el.hudHull as HTMLElement).style.width = `${(m.hull / m.maxHull) * 100}%`;
    (this.el.hudShield as HTMLElement).style.width = `${(m.shield / m.maxShield) * 100}%`;
    this.el.hudCargo.textContent = `${m.cargo}/${m.cargoMax}`;
    this.el.hudCoins.textContent = m.coins.toLocaleString();
    this.el.hudGems.textContent = String(m.gems);
    this.el.hudScan.textContent = m.scanReady ? 'Ready' : `${m.scanCd.toFixed(1)}s`;
    (this.el.hudScanBtn as HTMLButtonElement).disabled = !m.scanReady;
    this.el.hudMagnet.textContent = m.magnetOn ? `ON · Lv${m.magnetLevel}` : `Off · Lv${m.magnetLevel}`;

    if (m.bossMax && m.bossMax > 0 && m.bossHp !== undefined) {
      this.el.hudBoss.hidden = false;
      this.el.hudBossLabel.textContent = m.bossLabel || 'Junk Behemoth';
      (this.el.hudBossFill as HTMLElement).style.width = `${Math.max(0, (m.bossHp / m.bossMax) * 100)}%`;
    } else {
      this.el.hudBoss.hidden = true;
    }

    if (m.toast) {
      this.el.hudToast.hidden = false;
      this.el.hudToast.textContent = m.toast;
    } else this.el.hudToast.hidden = true;

    this.drawRadar(m.radarBlips || []);
  }

  private drawRadar(blips: HudModel['radarBlips']) {
    const cv = this.el.hudRadarCv as HTMLCanvasElement;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const w = cv.width;
    const h = cv.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(10,14,26,0.55)';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(254,221,4,0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 4, 0, Math.PI * 2);
    ctx.stroke();
    // player
    ctx.fillStyle = '#3ad0ff';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 3, 0, Math.PI * 2);
    ctx.fill();
    const colors = { salvage: '#3ddc84', enemy: '#ff4455', objective: '#fedd04', extract: '#ffffff' };
    for (const b of blips || []) {
      const px = w / 2 + b.x * (w / 2 - 8);
      const py = h / 2 + b.y * (h / 2 - 8);
      ctx.fillStyle = colors[b.kind];
      ctx.beginPath();
      ctx.arc(px, py, b.kind === 'objective' ? 4 : 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private injectStyles() {
    if (document.getElementById('sj-hud-css')) return;
    const s = document.createElement('style');
    s.id = 'sj-hud-css';
    s.textContent = `
      #sj-hud {
        position: absolute; inset: 0; pointer-events: none; z-index: 10;
        font-family: "SF Pro Display", system-ui, -apple-system, sans-serif; color: #f2f4f8;
      }
      #sj-hud button { pointer-events: auto; }
      #sj-hud .brand {
        position: absolute; top: max(10px, env(safe-area-inset-top));
        left: max(10px, env(safe-area-inset-left));
        display: flex; align-items: center; gap: 8px;
      }
      #sj-hud .logo-mark {
        width: 36px; height: 36px; border-radius: 10px; background: #fedd04; color: #202022;
        font-weight: 900; font-size: 0.75rem; display: grid; place-items: center;
        border: 2px solid #202022;
      }
      #sj-hud .brand-text { line-height: 1.05; }
      #sj-hud .brand-text strong { display: block; font-size: 0.78rem; letter-spacing: 0.06em; }
      #sj-hud .brand-text span { font-size: 0.58rem; letter-spacing: 0.18em; color: #fedd04; font-weight: 750; }
      #sj-hud .obj-strip {
        position: absolute; top: max(12px, env(safe-area-inset-top)); left: 50%;
        transform: translateX(-50%);
        background: rgba(10,14,26,0.72); border: 1.5px solid rgba(254,221,4,0.55);
        border-radius: 12px; padding: 8px 16px; backdrop-filter: blur(8px);
        max-width: min(70vw, 380px); text-align: center;
      }
      #sj-hud .obj-k {
        display: block; font-size: 0.58rem; font-weight: 750;
        letter-spacing: 0.14em; text-transform: uppercase; color: #fedd04;
      }
      #sj-hud .obj-v { display: block; margin-top: 2px; font-size: 0.84rem; font-weight: 650; }
      #sj-hud .top-right {
        position: absolute; top: max(10px, env(safe-area-inset-top));
        right: max(10px, env(safe-area-inset-right));
        display: flex; align-items: center; gap: 8px;
      }
      #sj-hud .currency {
        background: rgba(10,14,26,0.7); border: 1px solid rgba(254,221,4,0.4);
        border-radius: 999px; padding: 6px 12px; font-weight: 800; font-size: 0.85rem;
        color: #fedd04;
      }
      #sj-hud .currency.gem { color: #3ad0ff; border-color: rgba(58,208,255,0.45); }
      #sj-hud .currency .coin::before { content: "◉ "; }
      #sj-hud .currency.gem span::before { content: "◆ "; }
      #sj-hud .pause {
        width: 40px; height: 40px; border-radius: 12px; border: 1.5px solid rgba(255,255,255,0.35);
        background: rgba(10,14,26,0.7); color: #fff; font-size: 0.7rem; cursor: pointer;
      }
      #sj-hud .boss-bar {
        position: absolute; top: max(68px, calc(env(safe-area-inset-top) + 56px));
        left: 50%; transform: translateX(-50%); width: min(70vw, 360px);
      }
      #sj-hud .boss-label {
        text-align: center; font-size: 0.7rem; font-weight: 750;
        letter-spacing: 0.08em; text-transform: uppercase; color: #ff6a6a; margin-bottom: 4px;
      }
      #sj-hud .boss-track {
        height: 10px; border-radius: 6px; background: rgba(0,0,0,0.45);
        border: 1px solid rgba(255,80,80,0.5); overflow: hidden;
      }
      #sj-hud .boss-track i { display: block; height: 100%; background: linear-gradient(90deg,#ff3344,#ff8866); }
      #sj-hud .stats {
        position: absolute; top: max(56px, calc(env(safe-area-inset-top) + 48px));
        left: max(10px, env(safe-area-inset-left));
        display: flex; flex-direction: column; gap: 5px;
        background: rgba(10,14,26,0.68); border: 1px solid rgba(255,255,255,0.12);
        border-radius: 12px; padding: 8px 10px; backdrop-filter: blur(8px); min-width: 150px;
      }
      #sj-hud .stat { display: grid; grid-template-columns: 52px 1fr auto; align-items: center; gap: 6px; }
      #sj-hud .stat.scan-row { grid-template-columns: 40px auto 1fr; }
      #sj-hud .stat .k {
        font-size: 0.6rem; font-weight: 750; letter-spacing: 0.06em;
        text-transform: uppercase; color: rgba(242,244,248,0.65);
      }
      #sj-hud .stat .n { font-size: 0.76rem; font-weight: 700; text-align: right; }
      #sj-hud .bar { height: 6px; border-radius: 4px; background: rgba(255,255,255,0.12); overflow: hidden; }
      #sj-hud .bar i { display: block; height: 100%; width: 100%; }
      #sj-hud .bar.hull i { background: #3ddc84; }
      #sj-hud .bar.shield i { background: #3ad0ff; }
      #sj-hud .scan-btn {
        border: 1px solid #fedd04; background: rgba(254,221,4,0.15); color: #fedd04;
        font: inherit; font-size: 0.62rem; font-weight: 750; border-radius: 8px;
        padding: 3px 8px; cursor: pointer;
      }
      #sj-hud .scan-btn:disabled { opacity: 0.4; cursor: default; }
      #sj-hud .radar {
        position: absolute; top: 40%; right: max(12px, env(safe-area-inset-right));
        transform: translateY(-50%); width: 120px; height: 120px;
        border-radius: 50%; overflow: hidden; border: 2px solid rgba(254,221,4,0.35);
        background: rgba(10,14,26,0.4);
      }
      #sj-hud .toast {
        position: absolute; bottom: 28%; left: 50%; transform: translateX(-50%);
        background: rgba(254,221,4,0.92); color: #202022; font-weight: 750;
        padding: 10px 18px; border-radius: 12px; font-size: 0.9rem;
      }
      #sj-hud .hints {
        position: absolute; bottom: max(14px, env(safe-area-inset-bottom));
        left: 50%; transform: translateX(-50%);
        display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;
        max-width: 90vw; opacity: 0.7;
      }
      #sj-hud .hints span {
        font-size: 0.62rem; font-weight: 650; letter-spacing: 0.04em;
        background: rgba(10,14,26,0.55); border: 1px solid rgba(255,255,255,0.15);
        border-radius: 999px; padding: 4px 8px;
      }
      @media (max-width: 700px) {
        #sj-hud .radar { width: 88px; height: 88px; top: 36%; }
        #sj-hud .radar canvas { width: 88px; height: 88px; }
        #sj-hud .brand-text span { display: none; }
      }
    `;
    document.head.appendChild(s);
  }
}
