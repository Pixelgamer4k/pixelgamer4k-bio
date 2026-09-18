import type { Input } from '../engine/input';

export class MobileControls {
  root: HTMLDivElement;
  private moveKnob: HTMLDivElement;
  private lookKnob: HTMLDivElement;
  private readonly R = 46;

  constructor(parent: HTMLElement, private input: Input) {
    this.root = document.createElement('div');
    this.root.id = 'lr-touch';
    this.root.innerHTML = `
      <style>
        #lr-touch { position:absolute; inset:0; z-index:12; pointer-events:none; }
        #lr-touch .stick {
          pointer-events:auto; position:absolute; width:110px; height:110px; border-radius:50%;
          border: 1.5px solid rgba(220,200,190,0.28); background: rgba(10,8,16,0.28);
        }
        #lr-touch .stick.move {
          left: max(12px, env(safe-area-inset-left));
          bottom: max(18px, env(safe-area-inset-bottom));
        }
        #lr-touch .stick.look {
          right: max(96px, calc(env(safe-area-inset-right) + 84px));
          bottom: max(18px, env(safe-area-inset-bottom));
        }
        #lr-touch .knob {
          position:absolute; left:50%; top:50%; width:42px; height:42px;
          margin:-21px 0 0 -21px; border-radius:50%;
          background: rgba(210,195,185,0.45); border: 1px solid rgba(0,0,0,0.35);
        }
        #lr-touch .btns {
          pointer-events:auto; position:absolute;
          right: max(10px, env(safe-area-inset-right));
          bottom: max(16px, env(safe-area-inset-bottom));
          display:flex; flex-direction:column; gap:8px; width:78px;
        }
        #lr-touch .tb {
          height:50px; border-radius:14px; border:1px solid rgba(220,200,190,0.3);
          background: rgba(12,10,18,0.5); color: rgba(220,205,195,0.8);
          font: inherit; font-weight:600; font-size:0.62rem;
          letter-spacing:0.08em; text-transform:uppercase; touch-action:none;
        }
        @media (hover: hover) and (pointer: fine) {
          #lr-touch { opacity:0; pointer-events:none !important; }
        }
      </style>
      <div class="stick move" id="lrMove"><div class="knob" id="lrMoveK"></div></div>
      <div class="stick look" id="lrLook"><div class="knob" id="lrLookK"></div></div>
      <div class="btns">
        <button type="button" class="tb" data-act="sprint">Sprint</button>
        <button type="button" class="tb" data-act="use">Use</button>
      </div>
    `;
    parent.appendChild(this.root);
    this.moveKnob = this.root.querySelector('#lrMoveK') as HTMLDivElement;
    this.lookKnob = this.root.querySelector('#lrLookK') as HTMLDivElement;
    this.bindStick(this.root.querySelector('#lrMove') as HTMLDivElement, this.moveKnob, false);
    this.bindStick(this.root.querySelector('#lrLook') as HTMLDivElement, this.lookKnob, true);
    this.root.querySelectorAll('.tb').forEach((btn) => {
      const el = btn as HTMLButtonElement;
      const act = el.dataset.act;
      const set = (v: boolean) => {
        if (act === 'sprint') this.input.setMobileSprint(v);
        if (act === 'use') this.input.setMobileInteract(v);
      };
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); set(true); });
      el.addEventListener('pointerup', () => set(false));
      el.addEventListener('pointercancel', () => set(false));
    });
    this.root.style.display = input.isTouch ? 'block' : 'none';
  }

  private bindStick(el: HTMLDivElement, knob: HTMLDivElement, isLook: boolean) {
    let pid: number | null = null;
    let cx = 0, cy = 0;
    const apply = (x: number, y: number, active: boolean) => {
      if (isLook) this.input.setLookStick(x, y, active);
      else this.input.setStick(x, y, active);
    };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      pid = e.pointerId;
      el.setPointerCapture(pid);
      const r = el.getBoundingClientRect();
      cx = r.left + r.width / 2;
      cy = r.top + r.height / 2;
      move(e.clientX, e.clientY);
    });
    const move = (clientX: number, clientY: number) => {
      const dx = clientX - cx;
      const dy = cy - clientY;
      const len = Math.hypot(dx, dy);
      const max = this.R;
      const nx = len > max ? (dx / len) * max : dx;
      const ny = len > max ? (dy / len) * max : dy;
      knob.style.transform = `translate(${nx}px, ${-ny}px)`;
      apply(nx / max, isLook ? -(ny / max) : ny / max, true);
    };
    el.addEventListener('pointermove', (e) => {
      if (pid !== e.pointerId) return;
      move(e.clientX, e.clientY);
    });
    const end = (e: PointerEvent) => {
      if (pid !== e.pointerId) return;
      pid = null;
      knob.style.transform = 'translate(0,0)';
      apply(0, 0, false);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }
}
