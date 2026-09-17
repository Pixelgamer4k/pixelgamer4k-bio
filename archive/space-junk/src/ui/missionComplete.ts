export interface MissionResult {
  cells: number;
  cellsNeeded: number;
  extracted: boolean;
  rares: number;
  raresOptional: number;
  coinsEarned: number;
  gemsEarned: number;
  bossDown: boolean;
}

export class MissionCompleteUI {
  root: HTMLDivElement;
  onContinue?: () => void;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'sj-mission';
    this.root.hidden = true;
    parent.appendChild(this.root);
    this.injectStyles();
  }

  show(r: MissionResult) {
    const ok = (v: boolean) => (v ? '✓' : '○');
    this.root.hidden = false;
    this.root.innerHTML = `
      <div class="card">
        <h2>SUCCESS</h2>
        <p class="sub">MISSION COMPLETE!</p>
        <ul>
          <li><span>${ok(r.cells >= r.cellsNeeded)}</span> Collect ${r.cellsNeeded} Power Cells (${r.cells}/${r.cellsNeeded})</li>
          <li><span>${ok(r.extracted)}</span> Reach Extraction Point</li>
          <li><span>${ok(r.rares >= r.raresOptional)}</span> Optional: Salvage ${r.raresOptional} Rare Items (${r.rares})</li>
          ${r.bossDown ? '<li><span>✓</span> Junk Behemoth defeated</li>' : ''}
        </ul>
        <div class="rewards">
          <div><strong>+${r.coinsEarned}</strong> Coins</div>
          <div><strong>+${r.gemsEarned}</strong> Gems</div>
        </div>
        <p class="unlock">New Part Unlocked! — check Upgrades</p>
        <button type="button" id="sjCont">CONTINUE</button>
      </div>
    `;
    this.root.querySelector('#sjCont')?.addEventListener('click', () => {
      this.root.hidden = true;
      this.onContinue?.();
    });
  }

  private injectStyles() {
    if (document.getElementById('sj-mission-css')) return;
    const s = document.createElement('style');
    s.id = 'sj-mission-css';
    s.textContent = `
      #sj-mission {
        position: absolute; inset: 0; z-index: 40; display: grid; place-items: center;
        background: rgba(8,12,22,0.72); pointer-events: auto; padding: 20px;
      }
      #sj-mission[hidden] { display: none !important; }
      #sj-mission .card {
        width: min(380px, 100%); background: rgba(14,18,30,0.95);
        border: 2px solid #3ddc84; border-radius: 20px; padding: 22px 18px; color: #f2f4f8;
        text-align: center;
      }
      #sj-mission h2 { color: #3ddc84; font-size: 1.1rem; letter-spacing: 0.2em; margin: 0; }
      #sj-mission .sub { font-size: 1.35rem; font-weight: 800; margin: 4px 0 16px; }
      #sj-mission ul { list-style: none; padding: 0; margin: 0 0 16px; text-align: left; }
      #sj-mission li { display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.08); font-size: 0.88rem; }
      #sj-mission li span { color: #3ddc84; font-weight: 800; width: 1.2rem; }
      #sj-mission .rewards {
        display: flex; justify-content: center; gap: 24px; margin-bottom: 10px;
        font-size: 0.95rem;
      }
      #sj-mission .rewards strong { color: #fedd04; }
      #sj-mission .unlock { font-size: 0.8rem; color: #3ad0ff; margin-bottom: 16px; }
      #sj-mission button {
        width: 100%; min-height: 52px; border: 0; border-radius: 14px;
        background: #fedd04; color: #202022; font: inherit; font-weight: 800;
        font-size: 0.95rem; letter-spacing: 0.08em; cursor: pointer;
      }
    `;
    document.head.appendChild(s);
  }
}
