/**
 * Virtual N64 gamepad — iOS Safari + Android Chrome.
 * Uses touch + pointer events (no hover-only). preventDefault on touchstart
 * (passive:false) to stop scroll/zoom while playing.
 *
 * controls: 14 chars UD L R A B Start Z L R CUP CDOWN CLEFT CRIGHT
 * axis0 = X (-1..1), axis1 = Y (-1..1)
 */
(function (global) {
  const state = {
    up: false, down: false, left: false, right: false,
    a: false, b: false, start: false, z: false,
    l: false, r: false,
    cup: false, cdown: false, cleft: false, cright: false,
    axisX: 0, axisY: 0,
  };

  function bit(v) { return v ? '1' : '0'; }

  function buildControlsString() {
    return (
      bit(state.up) + bit(state.down) + bit(state.left) + bit(state.right) +
      bit(state.a) + bit(state.b) + bit(state.start) + bit(state.z) +
      bit(state.l) + bit(state.r) +
      bit(state.cup) + bit(state.cdown) + bit(state.cleft) + bit(state.cright)
    );
  }

  function setBtn(name, pressed) {
    if (name in state) state[name] = !!pressed;
  }

  function setAxes(x, y) {
    state.axisX = Math.max(-1, Math.min(1, x || 0));
    state.axisY = Math.max(-1, Math.min(1, y || 0));
  }

  function updateMobileControls() {
    const app = global.myApp;
    if (!app || typeof app.sendMobileControls !== 'function') return;
    app.sendMobileControls(
      buildControlsString(),
      String(state.axisX),
      String(state.axisY)
    );
  }

  function bindPressable(el, name) {
    let active = false;
    const down = (e) => {
      if (e.cancelable) e.preventDefault();
      if (e.stopPropagation) e.stopPropagation();
      active = true;
      el.classList.add('active');
      setBtn(name, true);
    };
    const up = (e) => {
      if (!active) return;
      if (e && e.cancelable) e.preventDefault();
      active = false;
      el.classList.remove('active');
      setBtn(name, false);
    };
    // Touch (iOS) — must be non-passive to preventDefault
    el.addEventListener('touchstart', down, { passive: false });
    el.addEventListener('touchend', up, { passive: false });
    el.addEventListener('touchcancel', up, { passive: false });
    // Pointer (modern Android / desktop)
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return; // already handled
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      down(e);
    });
    el.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'touch') return;
      up(e);
    });
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
    // Mouse fallback
    el.addEventListener('mousedown', (e) => { if (!('ontouchstart' in window)) down(e); });
    el.addEventListener('mouseup', (e) => { if (!('ontouchstart' in window)) up(e); });
    // Release if touch ends anywhere while this button is active (finger slid off)
    const docUp = (e) => {
      if (!active) return;
      // Ignore if the touch target is still this element
      const t = e && e.target;
      if (t === el || (el.contains && el.contains(t))) return;
      up({ cancelable: false });
    };
    document.addEventListener('touchend', docUp, { passive: true });
  }

  function bindUI(root) {
    root.querySelectorAll('[data-btn]').forEach((el) => {
      bindPressable(el, el.getAttribute('data-btn'));
    });

    const base = root.querySelector('.stick-base');
    const knob = root.querySelector('#stickKnob');
    if (!base) return;

    let trackingId = null;
    const radius = () => base.clientWidth * 0.5 * 0.55;

    function clientXY(e) {
      if (e.touches && e.touches.length) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      if (e.changedTouches && e.changedTouches.length) {
        return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
      }
      return { x: e.clientX, y: e.clientY };
    }

    function applyAt(clientX, clientY) {
      const rect = base.getBoundingClientRect();
      const px = clientX - rect.left - rect.width / 2;
      const py = clientY - rect.top - rect.height / 2;
      const r = radius();
      const mag = Math.hypot(px, py) || 1;
      const nx = (mag > r ? (px / mag) * r : px) / r;
      const ny = (mag > r ? (py / mag) * r : py) / r;
      setAxes(nx, ny);
      if (knob) {
        knob.style.transform =
          'translate(calc(-50% + ' + (nx * r) + 'px), calc(-50% + ' + (ny * r) + 'px))';
      }
    }

    function start(e) {
      if (e.cancelable) e.preventDefault();
      trackingId = e.pointerId != null ? e.pointerId : 'touch';
      const p = clientXY(e);
      applyAt(p.x, p.y);
    }
    function move(e) {
      if (trackingId === null) return;
      if (e.pointerId != null && e.pointerId !== trackingId) return;
      if (e.cancelable) e.preventDefault();
      const p = clientXY(e);
      applyAt(p.x, p.y);
    }
    function end(e) {
      if (trackingId === null) return;
      if (e && e.pointerId != null && e.pointerId !== trackingId && trackingId !== 'touch') return;
      if (e && e.cancelable) e.preventDefault();
      trackingId = null;
      setAxes(0, 0);
      if (knob) knob.style.transform = 'translate(-50%, -50%)';
    }

    base.addEventListener('touchstart', start, { passive: false });
    base.addEventListener('touchmove', move, { passive: false });
    base.addEventListener('touchend', end, { passive: false });
    base.addEventListener('touchcancel', end, { passive: false });
    base.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return;
      try { base.setPointerCapture(e.pointerId); } catch (_) {}
      start(e);
    });
    base.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      move(e);
    });
    base.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'touch') return;
      end(e);
    });
    base.addEventListener('pointercancel', end);

    // Keyboard (desktop / Bluetooth)
    const keyMap = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      KeyZ: 'a', KeyX: 'b', Enter: 'start', KeyA: 'z',
      KeyQ: 'l', KeyE: 'r',
      KeyI: 'cup', KeyK: 'cdown', KeyJ: 'cleft', KeyL: 'cright',
    };
    window.addEventListener('keydown', (e) => {
      const b = keyMap[e.code];
      if (b) { e.preventDefault(); setBtn(b, true); }
    });
    window.addEventListener('keyup', (e) => {
      const b = keyMap[e.code];
      if (b) { e.preventDefault(); setBtn(b, false); }
    });
  }

  global.VirtualPad = { state, setBtn, setAxes, buildControlsString, updateMobileControls, bindUI };
})(typeof window !== 'undefined' ? window : globalThis);
