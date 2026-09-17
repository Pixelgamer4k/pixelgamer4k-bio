import * as THREE from 'three';
import { randRange } from '../util/math';

/** Zone 1 Orbital Debris backdrop + KEEP FLYING wreck landmark. */
export function buildZone1Environment(scene: THREE.Scene) {
  scene.background = new THREE.Color(0x0a0e1a);
  scene.fog = new THREE.FogExp2(0x0b1224, 0.011);

  // Soft ambient + key
  scene.add(new THREE.AmbientLight(0x6a7aaa, 0.55));
  const key = new THREE.DirectionalLight(0xffe6c8, 1.15);
  key.position.set(40, 60, 20);
  key.castShadow = true;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x6688ff, 0.45);
  fill.position.set(-30, 10, -40);
  scene.add(fill);
  const rim = new THREE.PointLight(0xfedd04, 0.8, 120);
  rim.position.set(0, 20, -50);
  scene.add(rim);

  // Starfield
  const starGeo = new THREE.BufferGeometry();
  const starCount = 1200;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    positions[i * 3] = randRange(-200, 200);
    positions[i * 3 + 1] = randRange(-120, 120);
    positions[i * 3 + 2] = randRange(-200, 200);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.35, sizeAttenuation: true })));

  // Distant planet
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(48, 32, 24),
    new THREE.MeshStandardMaterial({ color: 0x3a6ea5, roughness: 0.85, metalness: 0.05, emissive: 0x102238, emissiveIntensity: 0.3 }),
  );
  planet.position.set(-90, -20, -160);
  scene.add(planet);
  const atmos = new THREE.Mesh(
    new THREE.SphereGeometry(51, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0x7ec8ff, transparent: true, opacity: 0.12, side: THREE.BackSide }),
  );
  atmos.position.copy(planet.position);
  scene.add(atmos);

  // Asteroid rocks
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x6a7078, roughness: 0.9, metalness: 0.15 });
  for (let i = 0; i < 55; i++) {
    const s = randRange(0.8, 4.5);
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockMat);
    rock.position.set(randRange(-95, 95), randRange(-35, 35), randRange(-95, 95));
    if (rock.position.length() < 18) rock.position.setLength(22);
    rock.rotation.set(randRange(0, 6), randRange(0, 6), 0);
    rock.castShadow = true;
    scene.add(rock);
  }

  // Colorful shipping containers
  const colors = [0xfedd04, 0x3ad0ff, 0xe22b2b, 0x3ddc84, 0xff8a2a];
  for (let i = 0; i < 28; i++) {
    const c = new THREE.Mesh(
      new THREE.BoxGeometry(randRange(1.2, 2.4), randRange(1, 1.8), randRange(2.5, 4)),
      new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.55, metalness: 0.3 }),
    );
    c.position.set(randRange(-70, 70), randRange(-25, 25), randRange(-70, 70));
    if (c.position.length() < 20) c.position.setLength(25);
    c.rotation.y = randRange(0, Math.PI);
    scene.add(c);
  }

  const wreck = buildKeepFlyingWreck();
  wreck.position.set(0, 2, -42);
  scene.add(wreck);

  return { wreck };
}

function buildKeepFlyingWreck(): THREE.Group {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x8a929c, roughness: 0.65, metalness: 0.55 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 0.7, metalness: 0.4 });
  const accent = new THREE.MeshStandardMaterial({ color: 0xfedd04, emissive: 0x665500, emissiveIntensity: 0.25 });

  // Modular station blocks
  const hull = new THREE.Mesh(new THREE.BoxGeometry(28, 10, 14), metal);
  g.add(hull);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(40, 2.5, 8), dark);
  wing.position.set(0, -2, 2);
  g.add(wing);
  for (const x of [-16, 16]) {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(4, 16, 4), metal);
    tower.position.set(x, 4, -2);
    g.add(tower);
  }
  // Girder lattice
  for (let i = 0; i < 8; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 18), dark);
    beam.position.set(-12 + i * 3.4, 6, 0);
    beam.rotation.z = (i % 2) * 0.4;
    g.add(beam);
  }

  // KEEP FLYING sign panel
  const panel = new THREE.Mesh(new THREE.BoxGeometry(14, 3.2, 0.4), dark);
  panel.position.set(0, 3, 7.2);
  g.add(panel);

  // Letter blocks spelling KEEP FLYING (chunky low-poly)
  const letters = makeKeepFlyingLetters(accent);
  letters.position.set(0, 3, 7.5);
  g.add(letters);

  // Planet-ring logo
  const logo = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), accent);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.85, 0.08, 6, 20),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }),
  );
  ring.rotation.x = Math.PI / 2.6;
  logo.add(ball, ring);
  logo.position.set(-6.5, 3, 7.6);
  g.add(logo);

  // Salvage arms
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 10), metal);
    arm.position.set(side * 10, -1, 8);
    arm.rotation.y = side * 0.35;
    g.add(arm);
    const claw = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.8, 1.2), dark);
    claw.position.set(side * 14, -1, 12);
    g.add(claw);
  }

  return g;
}

function makeKeepFlyingLetters(mat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  // Simplified: two text-like bars + emissive plate with canvas texture
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#2a3038';
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = '#fedd04';
  ctx.font = 'bold 52px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('KEEP FLYING', 256, 64);
  const tex = new THREE.CanvasTexture(canvas);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 2.6),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
  );
  g.add(sign);
  return g;
}
