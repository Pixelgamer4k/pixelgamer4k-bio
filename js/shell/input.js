/** Keyboard, touch stick + attack, optional gamepad */
export function createInput(dom) {
  const keys = Object.create(null);
  const stick = { x: 0, y: 0, active: false };
  let attackPressed = false;
  let attackHeld = false;

  const onKey = (e, down) => {
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'j', 'k'].includes(k)) {
      e.preventDefault();
    }
    keys[k] = down;
    if (down && (k === ' ' || k === 'j' || k === 'k' || k === 'enter')) {
      attackPressed = true;
      attackHeld = true;
    }
    if (!down && (k === ' ' || k === 'j' || k === 'k' || k === 'enter')) {
      attackHeld = false;
    }
  };

  window.addEventListener('keydown', (e) => onKey(e, true));
  window.addEventListener('keyup', (e) => onKey(e, false));

  // Touch stick
  const stickEl = dom.stick;
  const knobEl = dom.knob;
  const atkEl = dom.attack;
  let stickId = null;
  const stickRadius = 48;

  function setKnob(nx, ny) {
    if (!knobEl) return;
    knobEl.style.transform = `translate(${nx * stickRadius * 0.55}px, ${ny * stickRadius * 0.55}px)`;
  }

  function stickFromEvent(ev, touch) {
    const rect = stickEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = touch.clientX - cx;
    let dy = touch.clientY - cy;
    const len = Math.hypot(dx, dy) || 1;
    const max = stickRadius;
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    stick.x = dx / max;
    stick.y = dy / max;
    stick.active = true;
    setKnob(stick.x, stick.y);
  }

  if (stickEl) {
    stickEl.addEventListener('pointerdown', (e) => {
      stickId = e.pointerId;
      stickEl.setPointerCapture(e.pointerId);
      stickFromEvent(e, e);
    });
    stickEl.addEventListener('pointermove', (e) => {
      if (e.pointerId !== stickId) return;
      stickFromEvent(e, e);
    });
    const endStick = (e) => {
      if (e.pointerId !== stickId) return;
      stickId = null;
      stick.x = 0;
      stick.y = 0;
      stick.active = false;
      setKnob(0, 0);
    };
    stickEl.addEventListener('pointerup', endStick);
    stickEl.addEventListener('pointercancel', endStick);
  }

  if (atkEl) {
    const down = (e) => {
      e.preventDefault();
      attackPressed = true;
      attackHeld = true;
      atkEl.classList.add('pressed');
    };
    const up = () => {
      attackHeld = false;
      atkEl.classList.remove('pressed');
    };
    atkEl.addEventListener('pointerdown', down);
    atkEl.addEventListener('pointerup', up);
    atkEl.addEventListener('pointercancel', up);
    atkEl.addEventListener('pointerleave', up);
  }

  function readMove() {
    let x = stick.x;
    let y = stick.y;
    if (keys['a'] || keys['arrowleft']) x -= 1;
    if (keys['d'] || keys['arrowright']) x += 1;
    if (keys['w'] || keys['arrowup']) y -= 1;
    if (keys['s'] || keys['arrowdown']) y += 1;

    // Gamepad
    const pads = navigator.getGamepads?.() || [];
    for (const pad of pads) {
      if (!pad) continue;
      const ax = pad.axes[0] || 0;
      const ay = pad.axes[1] || 0;
      if (Math.abs(ax) > 0.18) x += ax;
      if (Math.abs(ay) > 0.18) y += ay;
      if (pad.buttons[0]?.pressed || pad.buttons[2]?.pressed) {
        if (!pad._atkLatch) {
          attackPressed = true;
          pad._atkLatch = true;
        }
        attackHeld = true;
      } else {
        pad._atkLatch = false;
        // don't clear attackHeld from keyboard
      }
    }

    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y, moving: len > 0.08 };
  }

  function consumeAttack() {
    const v = attackPressed;
    attackPressed = false;
    return v;
  }

  function peekAttack() {
    return attackHeld;
  }

  function dispose() {
    // listeners stay on window for shell lifetime; shell owns teardown via replace
  }

  return { readMove, consumeAttack, peekAttack, dispose, keys };
}
