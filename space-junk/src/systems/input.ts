/**
 * Controls — NOT inverted.
 * Desktop: WASD move, mouse aim, LMB Fire, RMB Magnet, Space Boost, Q Scan
 * Mobile: stick LEFT (UP = camera-forward); Magnet · Boost · Fire RIGHT. Scan via HUD.
 */
export interface InputState {
  moveX: number;
  moveY: number; // +forward
  aimX: number;
  aimY: number;
  fire: boolean;
  magnet: boolean;
  boost: boolean;
  scan: boolean;
  pointerLocked: boolean;
}

export class Input {
  state: InputState = {
    moveX: 0, moveY: 0, aimX: 0, aimY: 0,
    fire: false, magnet: false, boost: false, scan: false, pointerLocked: false,
  };

  private keys = new Set<string>();
  private mouseDown = new Set<number>();
  private stick = { x: 0, y: 0, active: false };
  private mobileButtons = { boost: false, magnet: false, action: false };
  private lookAccum = { x: 0, y: 0 };
  private scanPulse = false;
  private canvas: HTMLElement;
  isTouch = false;

  constructor(canvas: HTMLElement) {
    this.canvas = canvas;
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.bind();
  }

  get touchMode() { return this.isTouch; }

  /** HUD Scan pulse button */
  pulseScan() { this.scanPulse = true; }

  private bind() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    this.canvas.addEventListener('mousedown', (e) => {
      this.mouseDown.add(e.button);
      if (!this.isTouch && e.button === 0 && document.pointerLockElement !== this.canvas) {
        this.canvas.requestPointerLock?.();
      }
    });
    window.addEventListener('mouseup', (e) => this.mouseDown.delete(e.button));
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      this.state.pointerLocked = document.pointerLockElement === this.canvas;
    });
    window.addEventListener('mousemove', (e) => {
      if (this.state.pointerLocked || this.mouseDown.has(0)) {
        this.lookAccum.x += e.movementX;
        this.lookAccum.y += e.movementY;
      }
    });
    window.addEventListener('blur', () => { this.keys.clear(); this.mouseDown.clear(); });
  }

  setStick(x: number, y: number, active: boolean) {
    this.stick = { x, y, active };
  }

  setMobileButton(name: keyof typeof this.mobileButtons, down: boolean) {
    this.mobileButtons[name] = down;
  }

  update() {
    const k = this.keys;
    let mx = 0, my = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) my += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) my -= 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) mx -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) mx += 1;
    if (this.stick.active) { mx = this.stick.x; my = this.stick.y; }
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }

    this.state.moveX = mx;
    this.state.moveY = my;
    this.state.aimX = this.lookAccum.x;
    this.state.aimY = this.lookAccum.y;
    this.lookAccum.x = 0;
    this.lookAccum.y = 0;

    this.state.fire = this.mouseDown.has(0) || this.mobileButtons.action;
    this.state.magnet = this.mouseDown.has(2) || k.has('KeyF') || this.mobileButtons.magnet;
    this.state.boost = k.has('Space') || this.mobileButtons.boost;
    this.state.scan = k.has('KeyQ') || this.scanPulse;
    this.scanPulse = false;
  }
}
