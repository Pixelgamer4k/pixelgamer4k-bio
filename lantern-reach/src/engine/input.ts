export interface InputState {
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  sprint: boolean;
  interact: boolean;
  interactPressed: boolean;
  pointerLocked: boolean;
}

export class Input {
  state: InputState = {
    moveX: 0, moveY: 0, aimX: 0, aimY: 0,
    sprint: false, interact: false, interactPressed: false, pointerLocked: false,
  };

  private keys = new Set<string>();
  private lookAccum = { x: 0, y: 0 };
  private stick = { x: 0, y: 0, active: false };
  private lookStick = { x: 0, y: 0, active: false };
  private interactWas = false;
  private mobileInteract = false;
  private mobileSprint = false;
  canvas: HTMLElement;
  isTouch = false;

  constructor(canvas: HTMLElement) {
    this.canvas = canvas;
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.bind();
  }

  private bind() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    this.canvas.addEventListener('mousedown', (e) => {
      if (!this.isTouch && e.button === 0 && document.pointerLockElement !== this.canvas) {
        this.canvas.requestPointerLock?.();
      }
    });
    document.addEventListener('pointerlockchange', () => {
      this.state.pointerLocked = document.pointerLockElement === this.canvas;
    });
    window.addEventListener('mousemove', (e) => {
      if (this.state.pointerLocked) {
        this.lookAccum.x += e.movementX;
        this.lookAccum.y += e.movementY;
      }
    });
    window.addEventListener('blur', () => this.keys.clear());
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  setStick(x: number, y: number, active: boolean) { this.stick = { x, y, active }; }
  setLookStick(x: number, y: number, active: boolean) { this.lookStick = { x, y, active }; }
  setMobileInteract(v: boolean) { this.mobileInteract = v; }
  setMobileSprint(v: boolean) { this.mobileSprint = v; }

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

    let ax = this.lookAccum.x;
    let ay = this.lookAccum.y;
    this.lookAccum.x = 0;
    this.lookAccum.y = 0;
    if (this.lookStick.active) {
      ax += this.lookStick.x * 14;
      ay += this.lookStick.y * 14;
    }
    this.state.aimX = ax;
    this.state.aimY = ay;

    this.state.sprint = k.has('ShiftLeft') || k.has('ShiftRight') || this.mobileSprint;
    const interactHeld = k.has('KeyE') || k.has('KeyF') || k.has('Space') || this.mobileInteract;
    this.state.interact = interactHeld;
    this.state.interactPressed = interactHeld && !this.interactWas;
    this.interactWas = interactHeld;
  }
}
