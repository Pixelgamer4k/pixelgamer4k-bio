import type { Input } from '../systems/input';

/** Mobile: stick LEFT; Magnet · Boost · Fire RIGHT only (THREE buttons). Scan = HUD pulse. */
export class MobileControls {
  root: HTMLDivElement;
  private knob: HTMLDivElement;
  private stick: HTMLDivElement;
  private activeId: number | null = null;
  private cx = 0;
  private cy = 0;
  private readonly R = 48;

  constructor(parent: HTMLElement, private input: Input) {
    this.root = document.createElement('div');
    this.root.id = 'sj-touch';
    this.root.innerHTML = `
      <div class="stick" id="sjStick"><div class="knob" id="sjKnob"></div></div>
      <div class="btns">
        <button type="button" data-btn="magnet" class="tb">Magnet</button>
        <button type="button" data-btn="boost" class="tb">Boost</button>
        <button type="button" data-btn="action" class="tb fire">Fire</button>
      </div>
    `;
    parent.appendChild(this.root);
    this.stick = this.root.querySelector('#sjStick') as HTMLDivElement;
    this.knob = this.root.querySelector('#sjKnob') as HTMLDivElement;
    this.injectStyles();
    this.bind();
    this.root.style.display = input.touchMode ? 'block' : 'none';
  }

  private injectStyles() {
    if (document.getElementById('sj-touch-css')) return;
    const s = document.createElement('style');
    s.id = 'sj-touch-css';
    s.textContent = `
      #sj-touch { position: absolute; inset: 0; z-index: 12; pointer-events: none; }
      #sj-touch .stick {
        pointer-events: auto; position: absolute;
        left: max(16px, env(safe-area-inset-left));
        bottom: max(20px, env(safe-area-inset-bottom));
        width: 120px; height: 120px; border-radius: 50%;
        border: 2.5px solid rgba(254,221,4,0.55);
        background: rgba(10,14,26,0.4);
      }
      #sj-touch .knob {
        position: absolute; left: 50%; top: 50%; width: 48px; height: 48px;
        margin: -24px 0 0 -24px; border-radius: 50%;
        background: #fedd04; border: 2px solid #202022;
      }
      #sj-touch .btns {
        pointer-events: auto; position: absolute;
        right: max(12px, env(safe-area-inset-right));
        bottom: max(18px, env(safe-area-inset-bottom));
        display: flex; flex-direction: column; gap: 10px; width: 86px;
      }
      #sj-touch .tb {
        height: 58px; border-radius: 16px; border: 2px solid rgba(254,221,4,0.7);
        background: rgba(10,14,26,0.65); color: #fedd04;
        font: inherit; font-weight: 800; font-size: 0.65rem;
        letter-spacing: 0.06em; text-transform: uppercase; touch-action: none;
      }
      #sj-touch .tb.fire { background: rgba(226,43,43,0.85); color: #fff; border-color: #fff; }
      #sj-touch .tb.pressed { transform: scale(0.94); filter: brightness(1.15); }
      @media (hover: hover) and (pointer: fine) {
        #sj-touch { opacity: 0; pointer-events: none !important; }
      }
    `;
    document.head.appendChild(s);
  }

  private bind() {
    const setStickFrom = (clientX: number, clientY: number) => {
      const dx = clientX - this.cx;
      // Finger UP → +y forward (camera-forward). Never inverted.
      const dy = this.cy - clientY;
      const len = Math.hypot(dx, dy);
      const max = this.R;
      const nx = len > max ? (dx / len) * max : dx;
      const ny = len > max ? (dy / len) * max : dy;
      this.knob.style.transform = `translate(${nx}px, ${-ny}px)`;
      this.input.setStick(nx / max, ny / max, true);
    };
    const endStick = () => {
      this.activeId = null;
      this.knob.style.transform = 'translate(0,0)';
      this.input.setStick(0, 0, false);
    };
    this.stick.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.stick.setPointerCapture(e.pointerId);
      this.activeId = e.pointerId;
      const r = this.stick.getBoundingClientRect();
      this.cx = r.left + r.width / 2;
      this.cy = r.top + r.height / 2;
      setStickFrom(e.clientX, e.clientY);
    });
    this.stick.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.activeId) return;
      setStickFrom(e.clientX, e.clientY);
    });
    this.stick.addEventListener('pointerup', endStick);
    this.stick.addEventListener('pointercancel', endStick);

    this.root.querySelectorAll('[data-btn]').forEach((btn) => {
      const name = btn.getAttribute('data-btn') as 'boost' | 'magnet' | 'action';
      const down = (e: Event) => {
        e.preventDefault();
        (btn as HTMLElement).classList.add('pressed');
        this.input.setMobileButton(name, true);
      };
      const up = () => {
        (btn as HTMLElement).classList.remove('pressed');
        this.input.setMobileButton(name, false);
      };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointerleave', up);
      btn.addEventListener('pointercancel', up);
    });
  }
}
