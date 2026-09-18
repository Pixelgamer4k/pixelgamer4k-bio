/** Soft floating lines — no quest log. */

const LINES: Record<string, string[]> = {
  ash: [
    'Ash: Keep the flame low past the bend.',
    'Ash: Watchman hears sprint before he sees.',
  ],
  mira: [
    'Mira: Door sticks. Lean into it.',
    'Mira: Loft’s quiet if you wait the turn.',
  ],
};

export class Dialogue {
  el: HTMLDivElement;
  private queue: string[] = [];
  private showing = false;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.id = 'lr-dlg';
    this.el.innerHTML = `
      <style>
        #lr-dlg {
          position:absolute; left:50%; bottom:18%; transform:translateX(-50%);
          max-width: min(420px, 88vw); z-index:11; pointer-events:none;
          opacity:0; transition: opacity 0.2s ease;
          font-family: system-ui, -apple-system, sans-serif;
        }
        #lr-dlg.on { opacity:1; }
        #lr-dlg .card {
          background: rgba(12,10,18,0.55); border: 1px solid rgba(220,200,190,0.18);
          border-radius: 10px; padding: 12px 14px;
          color: rgba(225,215,205,0.88); font-size: 0.84rem; line-height: 1.45;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        }
      </style>
      <div class="card" id="lrDlgText"></div>
    `;
    parent.appendChild(this.el);
  }

  talk(id: 'ash' | 'mira') {
    this.queue = [...(LINES[id] || ['…'])];
    this.next();
  }

  next() {
    const text = this.queue.shift();
    if (!text) {
      this.showing = false;
      this.el.classList.remove('on');
      return false;
    }
    this.showing = true;
    this.el.classList.add('on');
    (this.el.querySelector('#lrDlgText') as HTMLDivElement).textContent = text;
    return true;
  }

  get active() { return this.showing; }

  /** Advance or close on interact */
  tryAdvance() {
    if (!this.showing) return false;
    if (!this.next()) return true;
    return true;
  }
}
