/** B-12 — boxy yellow-eyed companion dialogue beats. */

const LINES: { id: string; text: string }[] = [
  { id: 'welcome', text: "B-12 online. Pioneer MK-I green across the board. Stick up flies camera-forward — trust it." },
  { id: 'scan', text: "Hit Scan on the HUD (or Q) to pulse the field. Power Cells light gold when marked." },
  { id: 'magnet', text: "Hold Magnet to reel salvage in. Coins for scrap, gems for the rare stuff." },
  { id: 'cells', text: "Main job: collect 3 Power Cells near the KEEP FLYING wreck, then hit Extraction." },
  { id: 'combat', text: "Scrap drones! Fire to pop them. Boost if you need space." },
  { id: 'boss', text: "Junk Behemoth rising — three phases. Punish the glowing eye when it stuns." },
  { id: 'done', text: "More than just trash out here. Every piece has a story… Let's see what we can find." },
];

export class B12Tutorial {
  root: HTMLDivElement;
  private textEl: HTMLElement;
  private queue: string[] = ['welcome'];
  done = false;

  constructor(parent: HTMLElement, skip = false) {
    this.root = document.createElement('div');
    this.root.id = 'sj-b12';
    this.root.innerHTML = `
      <div class="b12-card">
        <div class="b12-avatar" aria-hidden="true">
          <div class="ant"></div>
          <div class="face"><i></i><i></i></div>
        </div>
        <div class="b12-body">
          <div class="name">B-12</div>
          <p id="b12Text"></p>
          <button type="button" id="b12Ok">Got it</button>
        </div>
      </div>
    `;
    parent.appendChild(this.root);
    this.textEl = this.root.querySelector('#b12Text') as HTMLElement;
    this.injectStyles();
    this.root.querySelector('#b12Ok')?.addEventListener('click', () => this.dismiss());
    if (skip) {
      this.done = true;
      this.root.style.display = 'none';
    } else this.show('welcome');
  }

  enqueue(id: string) {
    if (!this.queue.includes(id)) this.queue.push(id);
    if (this.root.style.display === 'none') this.pump();
  }

  private show(id: string) {
    const line = LINES.find((l) => l.id === id) || LINES[0];
    this.textEl.textContent = line.text;
    this.root.style.display = 'block';
    if (id === 'done') this.done = true;
  }

  dismiss() {
    this.root.style.display = 'none';
    this.queue.shift();
    setTimeout(() => this.pump(), 300);
  }

  private pump() {
    if (this.queue.length) this.show(this.queue[0]);
  }

  private injectStyles() {
    if (document.getElementById('sj-b12-css')) return;
    const s = document.createElement('style');
    s.id = 'sj-b12-css';
    s.textContent = `
      #sj-b12 {
        position: absolute; left: max(12px, env(safe-area-inset-left));
        bottom: max(150px, calc(env(safe-area-inset-bottom) + 140px));
        z-index: 20; max-width: min(360px, 92vw); pointer-events: auto;
      }
      #sj-b12 .b12-card {
        display: flex; gap: 12px; align-items: flex-start;
        background: rgba(10,14,26,0.9); border: 2px solid #fedd04;
        border-radius: 16px; padding: 12px; color: #f2f4f8;
      }
      #sj-b12 .b12-avatar {
        width: 52px; height: 52px; border-radius: 12px; background: #c9ccd1;
        border: 2px solid #202022; position: relative; flex-shrink: 0;
      }
      #sj-b12 .b12-avatar::before {
        content: ""; position: absolute; inset: 6px 6px auto; height: 18px;
        background: #fedd04; border-radius: 4px;
      }
      #sj-b12 .ant {
        position: absolute; top: -10px; left: 50%; width: 3px; height: 10px;
        background: #202022; transform: translateX(-50%);
      }
      #sj-b12 .ant::after {
        content: ""; position: absolute; top: -5px; left: -3px;
        width: 9px; height: 9px; border-radius: 50%; background: #fedd04;
      }
      #sj-b12 .face {
        position: absolute; left: 10px; right: 10px; bottom: 10px;
        display: flex; justify-content: space-between;
      }
      #sj-b12 .face i {
        width: 10px; height: 10px; background: #fedd04; border-radius: 2px;
        box-shadow: 0 0 6px #fedd04;
      }
      #sj-b12 .name {
        font-size: 0.65rem; font-weight: 800; letter-spacing: 0.12em;
        color: #fedd04; text-transform: uppercase;
      }
      #sj-b12 p { margin: 4px 0 10px; font-size: 0.86rem; line-height: 1.35; }
      #sj-b12 button {
        border: 0; background: #fedd04; color: #202022; font: inherit;
        font-weight: 750; font-size: 0.75rem; padding: 6px 12px;
        border-radius: 999px; cursor: pointer;
      }
    `;
    document.head.appendChild(s);
  }
}
