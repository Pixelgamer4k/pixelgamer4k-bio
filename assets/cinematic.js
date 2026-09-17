/* PixelGamer4k opening — denser 3D cinematic (Switch-style handheld, no captions/logo) */
(function () {
  const DROP_AT = 18;
  const FIELD = 0xfedd04;
  const INK = 0x202022;
  const INK2 = 0x2c2c2e;
  const ACCENT = 0xf5d400;

  const cinema = document.getElementById("cinema");
  const canvas = document.getElementById("cine");
  const bio = document.getElementById("bio");
  const progBar = document.getElementById("progBar");
  const bed = new Audio("assets/bed.mp3");
  bed.loop = true;
  bed.preload = "auto";

  let started = false;
  let finished = false;
  let renderer, scene, camera;
  let groups = {};
  let startTime = 0;
  let raf = 0;
  const lookTarget = new THREE.Vector3();

  function matInk(extra) {
    return new THREE.MeshPhysicalMaterial(
      Object.assign(
        {
          color: INK,
          roughness: 0.38,
          metalness: 0.22,
          clearcoat: 0.35,
          clearcoatRoughness: 0.4,
        },
        extra || {}
      )
    );
  }
  function matSoft(extra) {
    return new THREE.MeshPhysicalMaterial(
      Object.assign(
        {
          color: INK2,
          roughness: 0.62,
          metalness: 0.08,
          clearcoat: 0.15,
        },
        extra || {}
      )
    );
  }
  function matField(extra) {
    return new THREE.MeshPhysicalMaterial(
      Object.assign(
        {
          color: FIELD,
          roughness: 0.42,
          metalness: 0.05,
          clearcoat: 0.55,
          clearcoatRoughness: 0.25,
        },
        extra || {}
      )
    );
  }
  function matScreen() {
    return new THREE.MeshPhysicalMaterial({
      color: 0x111114,
      roughness: 0.18,
      metalness: 0.35,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      emissive: 0x1a1808,
      emissiveIntensity: 0.35,
    });
  }

  function roundedBox(w, h, d, r, seg) {
    // approximate rounded slab with beveled box + corner cylinders
    const g = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.BoxGeometry(w - r * 2, h - r * 2, d),
      matInk()
    );
    g.add(core);
    // simpler: high-seg box is fine; use Cylinder ends for rails elsewhere
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d, 2, 2, 2),
      matInk()
    );
    return mesh;
  }

  function makeJoyCon(side) {
    // side: -1 left, 1 right — Switch-like rail
    const g = new THREE.Group();
    const sign = side;
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 1.55, 0.28, 2, 4, 2),
      matSoft({ color: sign < 0 ? 0x242426 : 0x1e1e20 })
    );
    // rounded top/bottom caps
    const capGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.28, 32);
    const capT = new THREE.Mesh(capGeo, body.material);
    capT.rotation.z = Math.PI / 2;
    capT.position.y = 0.775;
    const capB = capT.clone();
    capB.position.y = -0.775;
    // rail attachment ridge
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 1.35, 0.16, 1, 4, 1),
      matInk({ metalness: 0.45, roughness: 0.28 })
    );
    rail.position.x = -sign * 0.22;

    const stickBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.14, 0.04, 32),
      matInk({ metalness: 0.4 })
    );
    stickBase.position.set(sign * 0.02, sign < 0 ? 0.28 : -0.22, 0.16);
    const stick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.075, 0.1, 28),
      matField()
    );
    stick.position.copy(stickBase.position);
    stick.position.z += 0.07;
    const stickCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 24, 16),
      matField({ clearcoat: 0.8 })
    );
    stickCap.position.copy(stick.position);
    stickCap.position.z += 0.05;

    g.add(body, capT, capB, rail, stickBase, stick, stickCap);

    if (sign < 0) {
      // D-pad
      const dpad = new THREE.Group();
      const armH = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.09, 0.05, 2, 1, 1),
        matInk({ metalness: 0.3 })
      );
      const armV = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.28, 0.05, 1, 2, 1),
        matInk({ metalness: 0.3 })
      );
      dpad.add(armH, armV);
      dpad.position.set(0.02, -0.32, 0.16);
      // minus
      const minus = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.03, 0.03),
        matField()
      );
      minus.position.set(0.05, 0.62, 0.15);
      g.add(dpad, minus);
    } else {
      // ABXY cluster
      const mkBtn = (x, y, c) => {
        const b = new THREE.Mesh(
          new THREE.CylinderGeometry(0.055, 0.055, 0.04, 24),
          matField({ color: c })
        );
        b.rotation.x = Math.PI / 2;
        b.position.set(x, y, 0.16);
        return b;
      };
      g.add(
        mkBtn(0.02, 0.4, ACCENT),
        mkBtn(-0.08, 0.3, 0xe8c800),
        mkBtn(0.12, 0.3, 0xffe566),
        mkBtn(0.02, 0.2, 0xd4b800)
      );
      const plus = new THREE.Group();
      const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.03), matField());
      const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.03), matField());
      plus.add(p1, p2);
      plus.position.set(-0.02, 0.62, 0.15);
      // home
      const home = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, 0.03, 24),
        matInk({ metalness: 0.5 })
      );
      home.rotation.x = Math.PI / 2;
      home.position.set(0.02, -0.55, 0.15);
      g.add(plus, home);
    }

    // shoulder trigger hint
    const trigger = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.12, 0.1, 2, 1, 1),
      matInk({ roughness: 0.5 })
    );
    trigger.position.set(0, 0.72, -0.08);
    g.add(trigger);

    g.position.x = sign * 1.05;
    return g;
  }

  function makeSwitch() {
    const g = new THREE.Group();
    // tablet body
    const shell = new THREE.Mesh(
      new THREE.BoxGeometry(1.55, 1.05, 0.14, 3, 3, 2),
      matInk({ roughness: 0.32, metalness: 0.28, clearcoat: 0.5 })
    );
    const bezel = new THREE.Mesh(
      new THREE.BoxGeometry(1.42, 0.92, 0.02),
      matInk({ color: 0x141416, roughness: 0.25 })
    );
    bezel.position.z = 0.075;
    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(1.28, 0.78, 0.015),
      matScreen()
    );
    screen.position.z = 0.09;
    // screen content bars (abstract UI)
    const ui = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(0.12 + i * 0.06, 0.35 - i * 0.04, 0.01),
        matField({ emissive: FIELD, emissiveIntensity: 0.25 })
      );
      bar.position.set(-0.35 + i * 0.2, -0.05, 0.1);
      ui.add(bar);
    }
    // speakers
    for (let i = 0; i < 6; i++) {
      const hole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.02, 10),
        matInk({ color: 0x0a0a0a })
      );
      hole.rotation.x = Math.PI / 2;
      hole.position.set(-0.55 + i * 0.04, -0.48, 0.08);
      g.add(hole);
    }

    const left = makeJoyCon(-1);
    const right = makeJoyCon(1);
    g.add(shell, bezel, screen, ui, left, right);
    g.userData.left = left;
    g.userData.right = right;
    g.userData.ui = ui;
    return g;
  }

  function makeCabinet() {
    const g = new THREE.Group();
    const mat = matInk({ roughness: 0.4, clearcoat: 0.25 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.22, 1.25, 2, 1, 2), mat);
    base.position.y = -1.15;
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.55, 0.95, 2, 2, 2), matSoft());
    pedestal.position.y = -0.75;
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.55, 0.9, 2, 3, 2), mat);
    body.position.y = 0.15;
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.35, 0.55, 2, 1, 2), mat);
    hood.position.set(0, 1.05, 0.2);
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.7, 0.05),
      new THREE.MeshPhysicalMaterial({
        color: 0x0c0c10,
        roughness: 0.12,
        metalness: 0.2,
        transmission: 0.15,
        thickness: 0.2,
        clearcoat: 1,
        emissive: 0x221e08,
        emissiveIntensity: 0.4,
      })
    );
    glass.position.set(0, 0.45, 0.46);
    // control panel
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 0.08, 0.45),
      matSoft({ roughness: 0.55 })
    );
    panel.position.set(0, -0.2, 0.55);
    panel.rotation.x = -0.35;
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.32, 20), matInk());
    stick.position.set(-0.28, -0.05, 0.62);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 16), matField({ clearcoat: 0.9 }));
    ball.position.set(-0.28, 0.12, 0.62);
    const mk = (x) => {
      const b = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 0.045, 24),
        matField()
      );
      b.rotation.x = Math.PI / 2;
      b.position.set(x, -0.12, 0.68);
      return b;
    };
    // side art panels
    const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.4, 0.75), matField({ roughness: 0.5 }));
    sideL.position.set(-0.63, 0.1, 0);
    const sideR = sideL.clone();
    sideR.position.x = 0.63;

    g.add(base, pedestal, body, hood, glass, panel, stick, ball, mk(0.15), mk(0.32), mk(0.49), sideL, sideR);
    g.userData.stick = stick;
    g.userData.ball = ball;
    return g;
  }

  function makeCharts() {
    const g = new THREE.Group();
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 1.7, 0.12, 2, 2, 1),
      matInk({ roughness: 0.45 })
    );
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(2.35, 1.45, 0.03),
      new THREE.MeshPhysicalMaterial({
        color: 0x151518,
        roughness: 0.2,
        metalness: 0.25,
        clearcoat: 0.8,
      })
    );
    glass.position.z = 0.08;
    g.add(frame, glass);
    const heights = [0.5, 0.85, 0.42, 1.1, 0.7, 0.95];
    g.userData.bars = [];
    heights.forEach((h, i) => {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, h, 0.24, 1, 4, 1),
        matField({
          emissive: FIELD,
          emissiveIntensity: 0.15,
          clearcoat: 0.6,
        })
      );
      bar.position.set(-1.0 + i * 0.38, -0.55 + h / 2, 0.22);
      bar.scale.y = 0.06;
      bar.userData.full = h;
      bar.userData.baseY = -0.55;
      g.add(bar);
      g.userData.bars.push(bar);
    });
    // grid lines
    for (let i = 0; i < 4; i++) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.012, 0.01),
        matField({ transparent: true, opacity: 0.35 })
      );
      line.position.set(0, -0.4 + i * 0.28, 0.1);
      g.add(line);
    }
    return g;
  }

  function makeChip() {
    const g = new THREE.Group();
    const substrate = new THREE.Mesh(
      new THREE.BoxGeometry(1.55, 0.08, 1.55, 2, 1, 2),
      matInk({ color: 0x1a1a1c, metalness: 0.55, roughness: 0.35 })
    );
    const die = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.14, 0.95, 2, 1, 2),
      matInk({ metalness: 0.65, roughness: 0.25, clearcoat: 0.4 })
    );
    die.position.y = 0.1;
    // die grid
    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 2; z++) {
        if (Math.abs(x) + Math.abs(z) > 3) continue;
        const cell = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.02, 0.12),
          matField({
            emissive: FIELD,
            emissiveIntensity: 0.2 + ((x + z + 4) % 3) * 0.05,
          })
        );
        cell.position.set(x * 0.16, 0.18, z * 0.16);
        g.add(cell);
      }
    }
    const lid = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.05, 0.5),
      matField({ metalness: 0.2, clearcoat: 0.7 })
    );
    lid.position.y = 0.2;
    // pins
    for (let i = -4; i <= 4; i++) {
      [
        [i * 0.15, -0.78],
        [i * 0.15, 0.78],
      ].forEach(([x, z]) => {
        const pin = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.05, 0.22),
          matInk({ metalness: 0.7, roughness: 0.3, color: 0x2a2a2c })
        );
        pin.position.set(x, -0.01, z);
        g.add(pin);
      });
      [
        [-0.78, i * 0.15],
        [0.78, i * 0.15],
      ].forEach(([x, z]) => {
        const pin = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.05, 0.05),
          matInk({ metalness: 0.7, roughness: 0.3, color: 0x2a2a2c })
        );
        pin.position.set(x, -0.01, z);
        g.add(pin);
      });
    }
    g.add(substrate, die, lid);
    return g;
  }

  function setGroupOpacity(group, o) {
    group.traverse((obj) => {
      if (!obj.material) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => {
        m.transparent = true;
        m.opacity = o;
        m.depthWrite = o > 0.92;
      });
    });
    group.visible = o > 0.02;
  }

  function easeInOut(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function lerpVec(out, a, b, t) {
    out.x = lerp(a.x, b.x, t);
    out.y = lerp(a.y, b.y, t);
    out.z = lerp(a.z, b.z, t);
  }

  const beats = [
    {
      t0: 0.15,
      t1: 4.5,
      pos0: { x: 0.15, y: 1.35, z: 4.6 },
      pos1: { x: -1.55, y: 0.65, z: 3.05 },
      look0: { x: 0, y: 0.05, z: 0 },
      look1: { x: 0.1, y: 0.02, z: 0 },
      key: "handheld",
    },
    {
      t0: 4.5,
      t1: 8.8,
      pos0: { x: 3.1, y: 1.7, z: 3.8 },
      pos1: { x: 0.55, y: 0.45, z: 2.85 },
      look0: { x: 0, y: 0, z: 0 },
      look1: { x: 0, y: 0.15, z: 0.15 },
      key: "cabinet",
    },
    {
      t0: 8.8,
      t1: 13.1,
      pos0: { x: 0.2, y: 0.35, z: 4.8 },
      pos1: { x: -0.85, y: 0.55, z: 2.95 },
      look0: { x: 0, y: 0, z: 0 },
      look1: { x: 0.15, y: -0.05, z: 0 },
      key: "charts",
    },
    {
      t0: 13.1,
      t1: 17.7,
      pos0: { x: 1.9, y: 1.75, z: 2.35 },
      pos1: { x: 0.85, y: 0.95, z: 1.45 },
      look0: { x: 0, y: 0.08, z: 0 },
      look1: { x: 0, y: 0.1, z: 0 },
      key: "chip",
    },
  ];

  const _pos = new THREE.Vector3();
  const _look = new THREE.Vector3();

  function initThree() {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setClearColor(FIELD, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(FIELD);
    scene.fog = new THREE.Fog(FIELD, 8, 22);

    camera = new THREE.PerspectiveCamera(
      38,
      window.innerWidth / window.innerHeight,
      0.05,
      80
    );

    const hemi = new THREE.HemisphereLight(0xfff6c8, 0x2a2a2c, 0.95);
    const key = new THREE.DirectionalLight(0xffffff, 1.35);
    key.position.set(4.5, 7, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 24;
    key.shadow.camera.left = -6;
    key.shadow.camera.right = 6;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    const rim = new THREE.DirectionalLight(0xffe066, 0.55);
    rim.position.set(-5, 2.5, -3);
    const fill = new THREE.DirectionalLight(0xffffff, 0.25);
    fill.position.set(-2, 3, 4);
    scene.add(hemi, key, rim, fill);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(16, 96),
      new THREE.MeshStandardMaterial({
        color: FIELD,
        roughness: 0.78,
        metalness: 0.02,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.25;
    floor.receiveShadow = true;
    scene.add(floor);

    groups.handheld = makeSwitch();
    groups.handheld.position.y = 0.05;
    groups.cabinet = makeCabinet();
    groups.charts = makeCharts();
    groups.charts.position.y = 0.15;
    groups.chip = makeChip();
    groups.chip.position.y = 0.2;

    Object.values(groups).forEach((g) => {
      g.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      scene.add(g);
      setGroupOpacity(g, 0);
    });

    window.addEventListener("resize", onResize);
  }

  function onResize() {
    if (!renderer) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  function activeBeat(t) {
    for (let i = 0; i < beats.length; i++) {
      if (t >= beats[i].t0 && t < beats[i].t1) return beats[i];
    }
    return beats[beats.length - 1];
  }

  function update(t) {
    const beat = activeBeat(t);
    const span = Math.max(0.001, beat.t1 - beat.t0);
    const u = easeInOut(Math.min(1, Math.max(0, (t - beat.t0) / span)));

    lerpVec(_pos, beat.pos0, beat.pos1, u);
    lerpVec(_look, beat.look0, beat.look1, u);
    // subtle handheld breathing on camera
    _pos.y += Math.sin(t * 0.9) * 0.03;
    camera.position.lerp(_pos, 0.18);
    lookTarget.lerp(_look, 0.18);
    camera.lookAt(lookTarget);

    Object.keys(groups).forEach((key) => {
      const g = groups[key];
      let target = 0;
      if (key === beat.key) {
        const fadeIn = Math.min(1, (t - beat.t0) / 0.65);
        const fadeOut = Math.min(1, (beat.t1 - t) / 0.55);
        target = Math.min(fadeIn, fadeOut);
        if (t - beat.t0 > 0.65 && beat.t1 - t > 0.55) target = 1;
      }
      const cur = g.userData.op || 0;
      const next = lerp(cur, target, 0.1);
      g.userData.op = next;
      setGroupOpacity(g, next);
    });

    // handheld motion — slight float + joy-con breathe
    const hh = groups.handheld;
    hh.rotation.y = Math.sin(t * 0.45) * 0.28;
    hh.rotation.x = Math.sin(t * 0.55) * 0.06;
    hh.position.y = 0.05 + Math.sin(t * 1.1) * 0.04;
    if (hh.userData.left) {
      hh.userData.left.rotation.z = Math.sin(t * 1.3) * 0.03;
      hh.userData.right.rotation.z = Math.sin(t * 1.3 + 1) * -0.03;
    }

    groups.cabinet.rotation.y = Math.sin(t * 0.32) * 0.28;
    if (groups.cabinet.userData.ball) {
      groups.cabinet.userData.stick.rotation.z = Math.sin(t * 2.1) * 0.25;
      groups.cabinet.userData.ball.position.x = -0.28 + Math.sin(t * 2.1) * 0.04;
    }

    groups.chip.rotation.y = t * 0.65;
    groups.chip.rotation.x = 0.4 + Math.sin(t * 0.5) * 0.1;

    if (groups.charts.userData.bars) {
      const local = Math.max(0, Math.min(1, (t - 8.8) / 2.0));
      groups.charts.userData.bars.forEach((bar, i) => {
        const h = bar.userData.full;
        const s = easeInOut(Math.max(0, Math.min(1, local * 1.25 - i * 0.07)));
        bar.scale.y = 0.06 + s * 0.94;
        bar.position.y = bar.userData.baseY + (h * bar.scale.y) / 2;
      });
    }

    if (progBar) progBar.style.width = Math.min(100, (t / DROP_AT) * 100).toFixed(2) + "%";
  }

  function frame() {
    if (finished) return;
    raf = requestAnimationFrame(frame);
    const t = (performance.now() - startTime) / 1000;
    update(t);
    renderer.render(scene, camera);
    if (t >= DROP_AT) finishOpening();
  }

  function rampVolume(to, ms) {
    const from = bed.volume;
    const t0 = performance.now();
    (function tick(now) {
      const p = Math.min(1, (now - t0) / ms);
      const e = p * p * (3 - 2 * p);
      bed.volume = from + (to - from) * e;
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  function finishOpening() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    cinema.classList.add("done");
    bio.setAttribute("aria-hidden", "false");
    bio.classList.add("live");
    setTimeout(() => {
      if (renderer) {
        renderer.dispose();
        canvas.style.display = "none";
      }
    }, 900);
  }

  async function startCinema() {
    if (started) return;
    started = true;
    cinema.classList.add("playing");
    if (!renderer) initThree();
    try {
      bed.currentTime = 0;
      bed.volume = 0;
      await bed.play();
      rampVolume(1, 700);
    } catch (_) {}
    startTime = performance.now();
    camera.position.set(0.15, 1.35, 4.6);
    lookTarget.set(0, 0.05, 0);
    const hold = new URLSearchParams(location.search).get('hold');
    if (hold === 'handheld') {
      update(2.2);
      setGroupOpacity(groups.handheld, 1);
      groups.handheld.userData.op = 1;
      Object.keys(groups).forEach((k) => {
        if (k !== 'handheld') { setGroupOpacity(groups[k], 0); groups[k].userData.op = 0; }
      });
      renderer.render(scene, camera);
      return;
    }
    frame();
  }

  function skipCinema(e) {
    e.stopPropagation();
    if (!started) return;
    try {
      if (bed.currentTime < DROP_AT - 0.4) bed.currentTime = DROP_AT - 0.15;
    } catch (_) {}
    finishOpening();
  }

  cinema.addEventListener("click", (e) => {
    if (e.target.id === "skipBtn") return;
    startCinema();
  });
  cinema.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") startCinema();
  });
  document.getElementById("skipBtn").addEventListener("click", skipCinema);

  window.__pgBed = bed;
  window.__pgRamp = rampVolume;
})();
