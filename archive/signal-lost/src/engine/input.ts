import type { Dir } from './types';

export class Input {
  private keys = new Set<string>();
  private pressed = new Set<string>();
  private released = new Set<string>();
  /** Virtual pad axis (-1..1). */
  stick = { x: 0, y: 0 };
  actionHeld = false;
  private actionJust = false;
  private menuJust = false;

  constructor() {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd', 'e', 'z', 'x', 'enter', 'escape', 'i'].includes(k) || e.code === 'Space') {
        e.preventDefault();
      }
      if (!this.keys.has(k)) this.pressed.add(k);
      this.keys.add(k);
      if (k === 'e' || k === 'z' || k === 'enter' || k === ' ') this.actionJust = true;
      if (k === 'escape' || k === 'i' || k === 'x') this.menuJust = true;
    });
    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      this.keys.delete(k);
      this.released.add(k);
    });
  }

  endFrame() {
    this.pressed.clear();
    this.released.clear();
    this.actionJust = false;
    this.menuJust = false;
  }

  setStick(x: number, y: number) {
    this.stick.x = x;
    this.stick.y = y;
  }

  setAction(held: boolean, just = false) {
    this.actionHeld = held;
    if (just) this.actionJust = true;
  }

  pulseMenu() {
    this.menuJust = true;
  }

  consumeAction(): boolean {
    if (this.actionJust || this.pressed.has('e') || this.pressed.has('z') || this.pressed.has('enter') || this.pressed.has(' ')) {
      this.actionJust = false;
      return true;
    }
    return false;
  }

  consumeMenu(): boolean {
    if (this.menuJust) {
      this.menuJust = false;
      return true;
    }
    return false;
  }

  /** Prefer stick, then WASD / arrows. Returns null if idle. */
  moveDir(): Dir | null {
    const ax = Math.abs(this.stick.x);
    const ay = Math.abs(this.stick.y);
    if (ax > 0.35 || ay > 0.35) {
      if (ax > ay) return this.stick.x < 0 ? 'left' : 'right';
      return this.stick.y < 0 ? 'up' : 'down';
    }
    if (this.keys.has('arrowleft') || this.keys.has('a')) return 'left';
    if (this.keys.has('arrowright') || this.keys.has('d')) return 'right';
    if (this.keys.has('arrowup') || this.keys.has('w')) return 'up';
    if (this.keys.has('arrowdown') || this.keys.has('s')) return 'down';
    return null;
  }
}
