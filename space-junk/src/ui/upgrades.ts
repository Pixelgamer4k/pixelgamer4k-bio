import type { SaveData, Upgrades } from '../util/save';

const CATS: { key: keyof Upgrades; label: string; desc: string; cost: number }[] = [
  { key: 'hull', label: 'Hull', desc: 'Increases max hull integrity', cost: 400 },
  { key: 'thruster', label: 'Thruster', desc: 'Increases thrust & boost', cost: 500 },
  { key: 'magnet', label: 'Magnet', desc: 'Increases salvage range', cost: 800 },
  { key: 'cargo', label: 'Cargo', desc: 'Increases cargo capacity', cost: 450 },
  { key: 'weapons', label: 'Weapons', desc: 'Increases firepower', cost: 600 },
];

export class UpgradePanel {
  root: HTMLDivElement;
  private save: SaveData;
  onChanged?: () => void;
  onClose?: () => void;

  constructor(parent: HTMLElement, save: SaveData) {
    this.save = save;
    this.root = document.createElement('div');
    this.root.id = 'sj-upgrades';
    this.root.hidden = true;
    parent.appendChild(this.root);
    this.injectStyles();
  }

  open() {
    this.root.hidden = false;
    this.render();
  }

  close() {
    this.root.hidden = true;
    this.onClose?.();
  }

  private render() {
    const u = this.save.upgrades;
    this.root.innerHTML = `
      <div class="panel">
        <div class="head">
          <h2>Upgrades</h2>
          <button type="button" class="x" id="upClose">✕</button>
        </div>
        <div class="wallet">◉ ${this.save.coins} &nbsp; ◆ ${this.save.gems}</div>
        <div class="strip" id="upStrip"></div>
        <div class="detail" id="upDetail"></div>
      </div>
    `;
    const strip = this.root.querySelector('#upStrip')!;
    let selected: keyof Upgrades = 'magnet';
    const paintDetail = () => {
      const cat = CATS.find((c) => c.key === selected)!;
      const lvl = u[selected];
      const cost = cat.cost * lvl;
      const detail = this.root.querySelector('#upDetail')!;
      detail.innerHTML = `
        <h3>${cat.label}</h3>
        <p>${cat.desc}</p>
        <div class="pips">${'<i class="on"></i>'.repeat(lvl)}${'<i></i>'.repeat(Math.max(0, 5 - lvl))}</div>
        <div class="cost">Cost: ${cost} coins</div>
        <button type="button" id="upBuy" ${this.save.coins < cost || lvl >= 5 ? 'disabled' : ''}>UPGRADE</button>
      `;
      detail.querySelector('#upBuy')?.addEventListener('click', () => {
        if (this.save.coins < cost || lvl >= 5) return;
        this.save.coins -= cost;
        u[selected]++;
        this.onChanged?.();
        this.render();
      });
    };
    for (const c of CATS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cat' + (c.key === selected ? ' on' : '');
      b.textContent = c.label;
      b.addEventListener('click', () => {
        selected = c.key;
        strip.querySelectorAll('.cat').forEach((el) => el.classList.remove('on'));
        b.classList.add('on');
        paintDetail();
      });
      strip.appendChild(b);
    }
    this.root.querySelector('#upClose')?.addEventListener('click', () => this.close());
    paintDetail();
  }

  private injectStyles() {
    if (document.getElementById('sj-up-css')) return;
    const s = document.createElement('style');
    s.id = 'sj-up-css';
    s.textContent = `
      #sj-upgrades {
        position: absolute; inset: 0; z-index: 35; display: grid; place-items: end center;
        background: rgba(8,12,22,0.55); pointer-events: auto; padding: 16px;
      }
      #sj-upgrades[hidden] { display: none !important; }
      #sj-upgrades .panel {
        width: min(420px, 100%); background: rgba(14,18,30,0.96);
        border: 2px solid #fedd04; border-radius: 18px 18px 12px 12px;
        padding: 16px; color: #f2f4f8;
      }
      #sj-upgrades .head { display: flex; justify-content: space-between; align-items: center; }
      #sj-upgrades .x { border: 0; background: transparent; color: #fff; font-size: 1.1rem; cursor: pointer; }
      #sj-upgrades .wallet { margin: 8px 0 12px; color: #fedd04; font-weight: 700; }
      #sj-upgrades .strip { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
      #sj-upgrades .cat {
        border: 1.5px solid rgba(255,255,255,0.25); background: transparent; color: #ccc;
        border-radius: 10px; padding: 8px 10px; font: inherit; font-size: 0.72rem;
        font-weight: 750; cursor: pointer; text-transform: uppercase; letter-spacing: 0.04em;
      }
      #sj-upgrades .cat.on { border-color: #3ad0ff; color: #3ad0ff; background: rgba(58,208,255,0.12); }
      #sj-upgrades .detail h3 { margin: 0 0 4px; }
      #sj-upgrades .detail p { margin: 0 0 10px; color: #99a; font-size: 0.85rem; }
      #sj-upgrades .pips { display: flex; gap: 4px; margin-bottom: 10px; }
      #sj-upgrades .pips i { width: 14px; height: 10px; border-radius: 3px; background: #333; display: block; }
      #sj-upgrades .pips i.on { background: #3ad0ff; }
      #sj-upgrades .cost { font-size: 0.8rem; margin-bottom: 10px; color: #fedd04; }
      #sj-upgrades #upBuy {
        width: 100%; min-height: 48px; border: 0; border-radius: 12px;
        background: #3ddc84; color: #102010; font: inherit; font-weight: 800; cursor: pointer;
      }
      #sj-upgrades #upBuy:disabled { opacity: 0.4; cursor: default; }
    `;
    document.head.appendChild(s);
  }
}
