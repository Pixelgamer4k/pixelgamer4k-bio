import * as THREE from 'three';
import { randRange } from '../util/math';
import { CollisionWorld } from '../systems/collision';
import { loadGlb, ASSET } from '../assets/loader';

export interface EnvBuildResult {
  wreck: THREE.Group;
  world: CollisionWorld;
  debrisRoot: THREE.Group;
}

/** Zone 1 Orbital Debris — Kenney CC0 meshes + KEEP FLYING landmark + collision. */
export async function buildZone1Environment(scene: THREE.Scene): Promise<EnvBuildResult> {
  const world = new CollisionWorld();
  const debrisRoot = new THREE.Group();
  debrisRoot.name = 'debrisRoot';
  scene.add(debrisRoot);

  scene.background = new THREE.Color(0x070b16);
  scene.fog = new THREE.FogExp2(0x0b1224, 0.0095);

  scene.add(new THREE.AmbientLight(0x6a7aaa, 0.5));
  const key = new THREE.DirectionalLight(0xffe6c8, 1.25);
  key.position.set(40, 70, 25);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x6688ff, 0.5);
  fill.position.set(-35, 15, -45);
  scene.add(fill);
  const rim = new THREE.PointLight(0xfedd04, 1.1, 140);
  rim.position.set(0, 18, -48);
  scene.add(rim);
  const hemi = new THREE.HemisphereLight(0x9eb6ff, 0x1a1520, 0.35);
  scene.add(hemi);

  // Starfield
  const starGeo = new THREE.BufferGeometry();
  const starCount = 1600;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    positions[i * 3] = randRange(-220, 220);
    positions[i * 3 + 1] = randRange(-140, 140);
    positions[i * 3 + 2] = randRange(-220, 220);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.32, sizeAttenuation: true })));

  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(52, 32, 24),
    new THREE.MeshStandardMaterial({
      color: 0x3a6ea5, roughness: 0.85, metalness: 0.05, emissive: 0x102238, emissiveIntensity: 0.35,
    }),
  );
  planet.position.set(-95, -25, -170);
  scene.add(planet);
  const atmos = new THREE.Mesh(
    new THREE.SphereGeometry(55, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0x7ec8ff, transparent: true, opacity: 0.12, side: THREE.BackSide }),
  );
  atmos.position.copy(planet.position);
  scene.add(atmos);

  // Prefetch common meshes
  const [
    meteor, meteorD, rockA, rockB, rockS, barrel, hangar, structure, structureD,
    dish, platform, cargo, speeder, rocketBase, rocketTop, rocketFins, hangarRound,
  ] = await Promise.all([
    loadGlb(ASSET.meteor),
    loadGlb(ASSET.meteorDetailed),
    loadGlb(ASSET.rockLargeA),
    loadGlb(ASSET.rockLargeB),
    loadGlb(ASSET.rocksSmallA),
    loadGlb(ASSET.barrel),
    loadGlb(ASSET.hangarLarge),
    loadGlb(ASSET.structure),
    loadGlb(ASSET.structureDetailed),
    loadGlb(ASSET.dishLarge),
    loadGlb(ASSET.platformLarge),
    loadGlb(ASSET.cargoA),
    loadGlb(ASSET.speederB),
    loadGlb(ASSET.rocketBase),
    loadGlb(ASSET.rocketTop),
    loadGlb(ASSET.rocketFins),
    loadGlb(ASSET.hangarRound),
  ]);

  // Asteroid field — meaningful size get colliders
  const rockProtos = [meteor, meteorD, rockA, rockB, rockS];
  for (let i = 0; i < 48; i++) {
    const proto = rockProtos[i % rockProtos.length];
    const rock = proto.clone(true);
    const s = randRange(1.8, 6.5);
    rock.scale.setScalar(s * 0.55);
    rock.position.set(randRange(-90, 90), randRange(-38, 38), randRange(-90, 90));
    if (rock.position.length() < 22) rock.position.setLength(24 + Math.random() * 10);
    rock.rotation.set(randRange(0, 6), randRange(0, 6), randRange(0, 6));
    rock.name = `asteroid_${i}`;
    debrisRoot.add(rock);
    if (s > 2.4) world.addMeshBounds(rock, 0.2, rock.name);
  }

  // Barrels / containers floating
  for (let i = 0; i < 22; i++) {
    const b = barrel.clone(true);
    b.scale.setScalar(randRange(1.2, 2.2));
    b.position.set(randRange(-70, 70), randRange(-28, 28), randRange(-70, 70));
    if (b.position.length() < 18) b.position.setLength(20);
    b.rotation.y = randRange(0, Math.PI);
    b.name = `barrel_${i}`;
    debrisRoot.add(b);
  }

  // Derelict ships (visual wrecks)
  for (let i = 0; i < 6; i++) {
    const w = (i % 2 === 0 ? cargo : speeder).clone(true);
    w.scale.setScalar(randRange(1.4, 2.4));
    w.position.set(randRange(-65, 65), randRange(-20, 22), randRange(-65, 65));
    if (w.position.length() < 25) w.position.setLength(28);
    w.rotation.set(randRange(-0.4, 0.4), randRange(0, 6), randRange(-0.3, 0.3));
    w.name = `wreckShip_${i}`;
    debrisRoot.add(w);
    world.addMeshBounds(w, 0.3, w.name);
  }

  // Station pieces away from spawn
  const stations: { mesh: THREE.Group; pos: THREE.Vector3; scale: number }[] = [
    { mesh: hangar.clone(true), pos: new THREE.Vector3(45, -2, -30), scale: 2.2 },
    { mesh: hangarRound.clone(true), pos: new THREE.Vector3(-50, 4, 20), scale: 2.0 },
    { mesh: structureD.clone(true), pos: new THREE.Vector3(30, 8, 40), scale: 2.5 },
    { mesh: structure.clone(true), pos: new THREE.Vector3(-35, -6, -55), scale: 2.2 },
    { mesh: platform.clone(true), pos: new THREE.Vector3(55, 12, 10), scale: 3.0 },
    { mesh: dish.clone(true), pos: new THREE.Vector3(-20, 15, 50), scale: 2.0 },
  ];
  for (const s of stations) {
    s.mesh.scale.setScalar(s.scale);
    s.mesh.position.copy(s.pos);
    s.mesh.rotation.y = randRange(0, Math.PI);
    debrisRoot.add(s.mesh);
    world.addMeshBounds(s.mesh, 0.4, 'station');
  }

  const wreck = await buildKeepFlyingWreck(rocketBase, rocketTop, rocketFins, structure, hangar, dish, platform);
  wreck.position.set(0, 2, -42);
  wreck.name = 'keepFlyingWreck';
  scene.add(wreck);
  world.addMeshBounds(wreck, 0.5, 'keepFlying');
  // Extra AABBs for main hull volumes (more reliable than single mesh bounds)
  world.addAABB(
    new THREE.Vector3(-16, -4, -50),
    new THREE.Vector3(16, 12, -34),
    'keepFlyingHull',
  );
  world.addAABB(
    new THREE.Vector3(-22, -5, -48),
    new THREE.Vector3(22, 0, -36),
    'keepFlyingWing',
  );

  return { wreck, world, debrisRoot };
}

async function buildKeepFlyingWreck(
  rocketBase: THREE.Group,
  rocketTop: THREE.Group,
  rocketFins: THREE.Group,
  structure: THREE.Group,
  hangar: THREE.Group,
  dish: THREE.Group,
  platform: THREE.Group,
): Promise<THREE.Group> {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x8a929c, roughness: 0.65, metalness: 0.55 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 0.7, metalness: 0.4 });

  // Core hull blocks (collision-backed)
  const hull = new THREE.Mesh(new THREE.BoxGeometry(28, 10, 14), metal);
  hull.visible = false; // visual from Kenney pieces
  g.add(hull);

  const mid = structure.clone(true);
  mid.scale.set(3.5, 2.5, 3);
  mid.position.set(0, 0, 0);
  g.add(mid);

  const left = hangar.clone(true);
  left.scale.setScalar(1.6);
  left.position.set(-14, -1, 2);
  left.rotation.y = 0.4;
  g.add(left);

  const right = hangar.clone(true);
  right.scale.setScalar(1.6);
  right.position.set(14, -1, 2);
  right.rotation.y = -0.4;
  g.add(right);

  const deck = platform.clone(true);
  deck.scale.set(4, 1, 2.5);
  deck.position.set(0, -3, 4);
  g.add(deck);

  // Rocket stack landmark
  const rb = rocketBase.clone(true);
  rb.scale.setScalar(2);
  rb.position.set(-8, 6, -2);
  g.add(rb);
  const rt = rocketTop.clone(true);
  rt.scale.setScalar(2);
  rt.position.set(-8, 12, -2);
  g.add(rt);
  const rf = rocketFins.clone(true);
  rf.scale.setScalar(2);
  rf.position.set(-8, 4, -2);
  g.add(rf);

  const d = dish.clone(true);
  d.scale.setScalar(1.4);
  d.position.set(10, 8, -4);
  g.add(d);

  // KEEP FLYING sign
  const panel = new THREE.Mesh(new THREE.BoxGeometry(14, 3.2, 0.4), dark);
  panel.position.set(0, 3, 8.5);
  g.add(panel);
  const letters = makeKeepFlyingLetters();
  letters.position.set(0, 3, 8.8);
  g.add(letters);

  const accent = new THREE.MeshStandardMaterial({ color: 0xfedd04, emissive: 0x665500, emissiveIntensity: 0.35 });
  const logo = new THREE.Group();
  logo.add(new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), accent));
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.85, 0.08, 6, 20),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }),
  );
  ring.rotation.x = Math.PI / 2.6;
  logo.add(ring);
  logo.position.set(-6.5, 3, 8.9);
  g.add(logo);

  return g;
}

function makeKeepFlyingLetters(): THREE.Group {
  const g = new THREE.Group();
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
  g.add(new THREE.Mesh(
    new THREE.PlaneGeometry(12, 2.6),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
  ));
  return g;
}
