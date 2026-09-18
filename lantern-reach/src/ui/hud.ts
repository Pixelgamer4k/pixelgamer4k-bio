/** Near-invisible chrome. No minimap / quest spam. No yellow/black Play chrome. */

export class Hud {
  root: HTMLDivElement;
  private hpFill: HTMLDivElement;
  private stamFill: HTMLDivElement;
  private fuelFill: HTMLDivElement;
  private prompt: HTMLDivElement;
  private fade: HTMLDivElement;
  private endCard: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'lr-hud';
    this.root.innerHTML = `
      <style>
        #lr-hud { position:absolute; inset:0; pointer-events:none; z-index:10;
          font-family: system-ui, -apple-system, sans-serif; color: rgba(220,210,200,0.75); }
        #lr-hud .bars {
          position:absolute; left: max(14px, env(safe-area-inset-left));
          bottom: max(16px, env(safe-area-inset-bottom));
          display:flex; flex-direction:column; gap:5px; width: 100px;
        }
        #lr-hud .bar {
          height: 4px; border-radius: 1px; background: rgba(255,255,255,0.1);
          overflow:hidden;
        }
        #lr-hud .bar > i { display:block; height:100%; width:100%; transform-origin:left center;
          background: rgba(210,190,180,0.7); }
        #lr-hud .bar.stam > i { background: rgba(150,170,190,0.65); }
        #lr-hud .bar.fuel > i { background: rgba(230,130,70,0.75); }
        #lr-hud .reticle {
          position:absolute; left:50%; top:50%; width:3px; height:3px;
          margin:-1.5px 0 0 -1.5px; border-radius:50%;
          background: rgba(230,220,210,0.35);
          box-shadow: 0 0 0 1px rgba(0,0,0,0.25);
        }
        #lr-hud .prompt {
          position:absolute; left:50%; top:54%; transform:translateX(-50%);
          font-size: 0.72rem; letter-spacing: 0.06em;
          color: rgba(230,220,210,0.7); text-shadow: 0 1px 2px rgba(0,0,0,0.6);
          opacity:0; transition: opacity 0.15s ease;
          white-space: nowrap;
        }
        #lr-hud .prompt.on { opacity:1; }
        #lr-hud .fade {
          position:absolute; inset:0; background:#0a0710; opacity:0;
          transition: opacity 0.6s ease; pointer-events:none;
        }
        #lr-hud .fade.on { opacity:1; }
        #lr-hud .end {
          position:absolute; inset:0; display:none; place-items:center;
          background: rgba(8,5,12,0.72); pointer-events:auto; text-align:center; padding:24px;
        }
        #lr-hud .end.show { display:grid; }
        #lr-hud .end h2 { margin:0 0 8px; font-weight:600; font-size:1.1rem;
          letter-spacing:0.14em; text-transform:uppercase; color:rgba(230,210,200,0.9); }
        #lr-hud .end p { margin:0 0 18px; font-size:0.85rem; color:rgba(200,190,180,0.7); max-width:280px; }
        #lr-hud .end a, #lr-hud .end button {
          pointer-events:auto; appearance:none; border:1px solid rgba(220,200,190,0.35);
          background: rgba(20,14,24,0.8); color: rgba(230,210,200,0.9);
          padding: 10px 16px; border-radius: 8px; font: inherit; font-size:0.8rem;
          letter-spacing:0.06em; cursor:pointer; text-decoration:none; margin: 0 6px;
        }
      </style>
      <div class="bars">
        <div class="bar hp" title="Health"><i id="lrHp"></i></div>
        <div class="bar stam" title="Stamina"><i id="lrStam"></i></div>
        <div class="bar fuel" title="Lantern"><i id="lrFuel"></i></div>
      </div>
      <div class="reticle"></div>
      <div class="prompt" id="lrPrompt"></div>
      <div class="fade" id="lrFade"></div>
      <div class="end" id="lrEnd">
        <div>
          <h2>Loft</h2>
          <p>The market hush holds. Opening slice — more streets later.</p>
          <button type="button" id="lrAgain">Walk again</button>
          <a href="../">Back</a>
        </div>
      </div>
    `;
    parent.appendChild(this.root);
    this.hpFill = this.root.querySelector('#lrHp') as HTMLDivElement;
    this.stamFill = this.root.querySelector('#lrStam') as HTMLDivElement;
    this.fuelFill = this.root.querySelector('#lrFuel') as HTMLDivElement;
    this.prompt = this.root.querySelector('#lrPrompt') as HTMLDivElement;
    this.fade = this.root.querySelector('#lrFade') as HTMLDivElement;
    this.endCard = this.root.querySelector('#lrEnd') as HTMLDivElement;
  }

  setVitals(hp: number, stam: number, fuel: number) {
    this.hpFill.style.transform = `scaleX(${Math.max(0, Math.min(1, hp))})`;
    this.stamFill.style.transform = `scaleX(${Math.max(0, Math.min(1, stam))})`;
    this.fuelFill.style.transform = `scaleX(${Math.max(0, Math.min(1, fuel))})`;
  }

  setPrompt(text: string | null) {
    if (!text) {
      this.prompt.classList.remove('on');
      this.prompt.textContent = '';
      return;
    }
    this.prompt.textContent = text;
    this.prompt.classList.add('on');
  }

  flashFade(ms = 500) {
    this.fade.classList.add('on');
    window.setTimeout(() => this.fade.classList.remove('on'), ms);
  }

  showEnd(onAgain: () => void) {
    this.endCard.classList.add('show');
    const btn = this.root.querySelector('#lrAgain') as HTMLButtonElement;
    btn.onclick = () => {
      this.endCard.classList.remove('show');
      onAgain();
    };
  }
}
