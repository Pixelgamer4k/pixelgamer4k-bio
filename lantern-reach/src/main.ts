import { Game } from './game';

const app = document.getElementById('app') || document.body;

const boot = document.createElement('div');
boot.id = 'lr-boot';
boot.innerHTML = `
  <style>
    #lr-boot {
      position: fixed; inset: 0; z-index: 100; display: grid; place-items: center;
      background: #0a0710; color: rgba(220,210,200,0.88);
      font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 24px;
    }
    #lr-boot h1 {
      font-size: clamp(1.35rem, 4vw, 1.85rem); font-weight: 600;
      letter-spacing: 0.22em; text-transform: uppercase; margin: 0 0 8px;
      color: rgba(230,215,205,0.92);
    }
    #lr-boot p { margin: 0 0 6px; opacity: 0.65; font-size: 0.9rem; }
    #lr-boot .hint {
      margin: 16px auto 0; max-width: 400px; text-align: left; font-size: 0.72rem;
      line-height: 1.5; opacity: 0.62;
      background: rgba(255,255,255,0.03); border: 1px solid rgba(220,200,190,0.14);
      border-radius: 12px; padding: 12px 14px;
    }
    #lr-boot button {
      margin-top: 18px; min-width: 200px; min-height: 50px; border: 0; border-radius: 12px;
      background: rgba(200,110,70,0.85); color: rgba(20,12,14,0.95);
      font: inherit; font-weight: 700; letter-spacing: 0.08em; cursor: pointer;
    }
    #lr-boot a { color: rgba(200,180,170,0.7); font-size: 0.8rem; }
  </style>
  <div>
    <h1>Lantern Reach</h1>
    <p>Night market · opening slice</p>
    <button type="button" id="lrStart">Enter the street</button>
    <div class="hint">
      <div><strong>Walk</strong> WASD · <strong>Look</strong> mouse · <strong>Sprint</strong> Shift · <strong>Use</strong> E</div>
      <div style="margin-top:6px">Touch: move stick · look stick · Sprint · Use</div>
      <div style="margin-top:6px">Your lantern is the light. Keep quiet past the watchman.</div>
    </div>
    <p style="margin-top:16px"><a href="../">← Bio</a></p>
  </div>
`;
app.appendChild(boot);

boot.querySelector('#lrStart')?.addEventListener('click', async () => {
  boot.remove();
  const game = new Game(app);
  await game.start();
});
