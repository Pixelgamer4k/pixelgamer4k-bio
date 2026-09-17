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
    #sj-boot p { opacity: 0.7; margin: 0 0 12px; }
    #sj-boot button {
      min-width: 200px; min-height: 54px; border: 0; border-radius: 14px;
      background: #fedd04; color: #202022; font: inherit; font-weight: 800;
      letter-spacing: 0.06em; cursor: pointer;
    }
    #sj-boot .scheme {
      margin: 14px auto 0; max-width: 420px; text-align: left; font-size: 0.72rem;
      opacity: 0.75; line-height: 1.45;
      background: rgba(255,255,255,0.04); border: 1px solid rgba(254,221,4,0.25);
      border-radius: 12px; padding: 12px 14px;
    }
    #sj-boot .scheme strong { color: #fedd04; }
  </style>
  <div>
    <h1>SPACE JUNK: <span>SALVAGERS</span></h1>
    <p>Zone 1 — Orbital Debris · 6DOF flight</p>
    <button type="button" id="sjStart">LAUNCH PIONEER MK-I</button>
    <div class="scheme">
      <div><strong>Desktop:</strong> WASD thrust/strafe · Mouse look (pitch/yaw) · LMB Fire · RMB Magnet · Space Boost · Q Scan</div>
      <div style="margin-top:6px"><strong>Touch:</strong> Left stick move · Right stick look · Magnet · Boost · Fire · Scan = Pulse</div>
      <div style="margin-top:6px">Pitch up and fly over wrecks. Hard collision — don’t clip the KEEP FLYING hull.</div>
    </div>
    <p style="margin-top:14px"><a href="../" style="color:#fedd04">← Back to bio</a></p>
  </div>
`;
app.appendChild(boot);

boot.querySelector('#sjStart')?.addEventListener('click', async () => {
  boot.remove();
  const game = new Game(app);
  await game.start();
});
