import type { Input } from '../systems/input';

/**
 * Dual sticks: LEFT move (thrust/strafe) · RIGHT look/pitch
 * Magnet · Boost · Fire remain on the right cluster (unchanged labels).
 */
export class MobileControls {
  root: HTMLDivElement;
  private moveKnob: HTMLDivElement;
  private moveStick: HTMLDivElement;
  private lookKnob: HTMLDivElement;
  private lookStick: HTMLDivElement;
  private moveId: number | null = null;
  private lookId: number | null = null;
  private mcx = 0;
  private mcy = 0;
  private lcx = 0;
  private lcy = 0;
  private readonly R = 48;

  constructor(parent: HTMLElement, private input: Input) {
    this.root = document.createElement('div');
    this.root.id = 'sj-touch';
    this.root.innerHTML = `
      <div class="stick move" id="sjStick"><div class="knob" id="sjKnob"></div><span class="lbl">Move</span></div>
      <div class="stick look" id="sjLook"><div class="knob look-knob" id="sjLookKnob"></div><span class="lbl">Look</span></div>
      <div class="btns">
        <button type="button" data-btn="magnet" class="tb">Magnet</button>
        <button type="button" data-btn="boost" class="tb">Boost</button>
        <button type="button" data-btn="action" class="tb fire">Fire</button>
      </div>
    `;
    parent.appendChild(this.root);
    this.moveStick = this.root.querySelector('#sjStick') as HTMLDivElement;
    this.moveKnob = this.root.querySelector('#sjKnob') as HTMLDivElement;
    this.lookStick = this.root.querySelector('#sjLook') as HTMLDivElement;
    this.lookKnob = this.root.querySelector('#sjLookKnob') as HTMLDivElement;
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
        width: 118px; height: 118px; border-radius: 50%;
        border: 2.5px solid rgba(254,221,4,0.55);
        background: rgba(10,14,26,0.4);
      }
      #sj-touch .stick.move {
        left: max(14px, env(safe-area-inset-left));
        bottom: max(20px, env(safe-area-inset-bottom));
      }
      #sj-touch .stick.look {
        right: max(108px, calc(env(safe-area-inset-right) + 96px));
        bottom: max(20px, env(safe-area-inset-bottom));
        border-color: rgba(58,208,255,0.55);
      }
      #sj-touch .stick .lbl {
        position: absolute; top: -16px; left: 0; right: 0; text-align: center;
        font-size: 0.55rem; font-weight: 750; letter-spacing: 0.1em; text-transform: uppercase;
        color: rgba(254,221,4,0.7); pointer-events: none;
      }
      #sj-touch .stick.look .lbl { color: rgba(58,208,255,0.75); }
      #sj-touch .knob {
        position: absolute; left: 50%; top: 50%; width: 46px; height: 46px;
        margin: -23px 0 0 -23px; border-radius: 50%;
        background: #fedd04; border: 2px solid #202022;
      }
      #sj-touch .look-knob { background: #3ad0ff; }
      #sj-touch .btns {
        pointer-events: auto; position: absolute;
        right: max(12px, env(safe-area-inset-right));
        bottom: max(18px, env(safe-area-inset-bottom));
        display: flex; flex-direction: column; gap: 10px; width: 86px;
      }
      #sj-touch .tb {
        height: 56px; border-radius: 16px; border: 2px solid rgba(254,221,4,0.7);
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

  private bindStick(
    el: HTMLDivElement,
    knob: HTMLDivElement,
    getId: () => number | null,
    setId: (id: number | null) => void,
    onMove: (nx: number, ny: number, active: boolean) => void,
    invertYForLook: boolean,
  ) {
    const setFrom = (clientX: number, clientY: number, cx: number, cy: number) => {
      const dx = clientX - cx;
      const dy = cy - clientY; // finger up = +
      const len = Math.hypot(dx, dy);
      const max = this.R;
      const nx = len > max ? (dx / len) * max : dx;
      const ny = len > max ? (dy / len) * max : dy;
      knob.style.transform = `translate(${nx}px, ${-ny}px)`;
      const sx = nx / max;
      const sy = invertYForLook ? -ny / max : ny / max; // look: finger up = pitch up = negative aimY in our ship (we subtract aimY)
      // For look stick: finger up should pitch up → aimY negative in ship (pitch -= aimY), so sy should be negative when finger up
      // Finger up → dy positive → we want pitch up → pitch -= aimY → aimY negative → pass negative
      onMove(sx, invertYForLook ? -(ny / max) : ny / max, true);
    };
    let cx = 0, cy = 0;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      setId(e.pointerId);
      const r = el.getBoundingClientRect();
      cx = r.left + r.width / 2;
      cy = r.top + r.height / 2;
      setFrom(e.clientX, e.clientY, cx, cy);
    });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerId !== getId()) return;
      setFrom(e.clientX, e.clientY, cx, cy);
    });
    const end = () => {
      setId(null);
      knob.style.transform = 'translate(0,0)';
      onMove(0, 0, false);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  private bind() {
    this.bindStick(
      this.moveStick, this.moveKnob,
      () => this.moveId, (id) => { this.moveId = id; },
      (x, y, a) => this.input.setStick(x, y, a),
      false,
    );
    this.bindStick(
      this.lookStick, this.lookKnob,
      () => this.lookId, (id) => { this.lookId = id; },
      (x, y, a) => this.input.setLookStick(x, y, a),
      true,
    );

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
