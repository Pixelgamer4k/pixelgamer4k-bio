import { Game } from './game';

const app = document.getElementById('app') || document.body;
const boot = document.createElement('div');
boot.id = 'sj-boot';
boot.innerHTML = `
  <style>
    #sj-boot {
      position: fixed; inset: 0; z-index: 100; display: grid; place-items: center;
      background: #0a0e1a; color: #f2f4f8;
      font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 24px;
    }
    #sj-boot h1 { font-size: clamp(1.4rem, 4vw, 2rem); letter-spacing: 0.08em; margin: 0 0 6px; }
    #sj-boot h1 span { color: #fedd04; }
    #sj-boot p { opacity: 0.7; margin: 0 0 22px; }
    #sj-boot button {
      min-width: 200px; min-height: 54px; border: 0; border-radius: 14px;
      background: #fedd04; color: #202022; font: inherit; font-weight: 800;
      letter-spacing: 0.06em; cursor: pointer;
    }
    #sj-boot .ref {
      margin-top: 18px; font-size: 0.72rem; opacity: 0.45;
    }
  </style>
  <div>
    <h1>SPACE JUNK: <span>SALVAGERS</span></h1>
    <p>Zone 1 — Orbital Debris</p>
    <button type="button" id="sjStart">LAUNCH PIONEER MK-I</button>
    <div class="ref">Stick up = forward · Magnet · Boost · Fire</div>
    <p style="margin-top:14px"><a href="../" style="color:#fedd04">← Back to bio</a></p>
  </div>
`;
app.appendChild(boot);

boot.querySelector('#sjStart')?.addEventListener('click', async () => {
  boot.remove();
  const game = new Game(app);
  await game.start();
});
