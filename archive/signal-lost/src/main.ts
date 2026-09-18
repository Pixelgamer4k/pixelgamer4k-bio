import { Game } from './game';

const app = document.getElementById('app') || document.body;

const boot = document.createElement('div');
boot.id = 'sl-boot';
boot.innerHTML = `
  <style>
    #sl-boot {
      position: fixed; inset: 0; z-index: 100; display: grid; place-items: center;
      background: #121212; color: #FEDD04;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace; text-align: center; padding: 24px;
    }
    #sl-boot h1 { font-size: clamp(1.6rem, 5vw, 2.4rem); letter-spacing: 0.12em; margin: 0 0 8px; }
    #sl-boot p { color: #FFF8D0; opacity: 0.85; margin: 0 0 18px; }
    #sl-boot button {
      min-width: 220px; min-height: 54px; border: 3px solid #FEDD04; border-radius: 12px;
      background: #FEDD04; color: #121212; font: inherit; font-weight: 800;
      letter-spacing: 0.08em; cursor: pointer;
    }
    #sl-boot button:active { transform: scale(0.98); }
    #sl-boot .hint {
      margin: 18px auto 0; max-width: 420px; text-align: left; font-size: 0.72rem;
      color: #FFF8D0; line-height: 1.5;
      border: 2px solid #FEDD04; border-radius: 12px; padding: 12px 14px;
    }
    #sl-boot a { color: #FEDD04; }
  </style>
  <div>
    <h1>SIGNAL LOST</h1>
    <p>reclaim the arcade · opening slice</p>
    <button type="button" id="slStart">PRESS START</button>
    <div class="hint">
      <div><strong>Desktop:</strong> WASD / arrows move · E / Z / Space Action · I / Esc Pause</div>
      <div style="margin-top:6px"><strong>Touch:</strong> D-pad · Action · Menu</div>
      <div style="margin-top:6px">Town → side quest → Static Depths → Glitch Warden (2 phases)</div>
    </div>
    <p style="margin-top:16px"><a href="../">← Back to bio</a></p>
  </div>
`;
app.appendChild(boot);

boot.querySelector('#slStart')?.addEventListener('click', async () => {
  boot.remove();
  const game = new Game(app);
  await game.start();
});
