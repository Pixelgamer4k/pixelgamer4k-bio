import * as THREE from 'three';

function pixelCanvas(w: number, h: number, paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  paint(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export type MatBag = {
  cobble: THREE.MeshStandardMaterial;
  plaster: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
  roof: THREE.MeshStandardMaterial;
  cloth: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  ember: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
};

export function createMaterials(): MatBag {
  const cobble = pixelCanvas(32, 32, (ctx, w, h) => {
    ctx.fillStyle = '#2a2430';
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 4) {
      for (let x = 0; x < w; x += 4) {
        const shade = 28 + ((x * 3 + y * 7) % 18);
        ctx.fillStyle = `rgb(${shade},${shade - 4},${shade + 6})`;
        ctx.fillRect(x, y, 3, 3);
        ctx.fillStyle = '#1a1520';
        ctx.fillRect(x + 3, y, 1, 4);
        ctx.fillRect(x, y + 3, 4, 1);
      }
    }
  });
  cobble.repeat.set(8, 20);

  const plaster = pixelCanvas(16, 16, (ctx, w, h) => {
    ctx.fillStyle = '#3d3344';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = i % 2 ? '#463a4c' : '#352c3c';
      ctx.fillRect((i * 5) % w, (i * 7) % h, 2, 2);
    }
  });

  const wood = pixelCanvas(16, 16, (ctx, w, h) => {
    for (let x = 0; x < w; x++) {
      const s = 55 + (x % 4) * 8;
      ctx.fillStyle = `rgb(${s + 20},${s - 10},${s - 25})`;
      ctx.fillRect(x, 0, 1, h);
    }
    ctx.fillStyle = '#2a1810';
    for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
  });

  const roof = pixelCanvas(8, 8, (ctx, w, h) => {
    ctx.fillStyle = '#1c1420';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2a1c28';
    for (let y = 0; y < h; y += 2) {
      for (let x = (y % 4 === 0 ? 0 : 2); x < w; x += 4) ctx.fillRect(x, y, 2, 2);
    }
  });

  const cloth = pixelCanvas(8, 8, (ctx, w, h) => {
    ctx.fillStyle = '#5a2030';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#7a3040';
    ctx.fillRect(0, 0, w, 2);
    ctx.fillStyle = '#3a1020';
    ctx.fillRect(0, 6, w, 2);
  });

  const mk = (map: THREE.Texture, rough = 0.9, metal = 0.05, color = 0xffffff) =>
    new THREE.MeshStandardMaterial({
      map,
      color,
      roughness: rough,
      metalness: metal,
      flatShading: true,
    });

  return {
    cobble: mk(cobble, 0.95, 0.02),
    plaster: mk(plaster, 0.88, 0.02),
    wood: mk(wood, 0.85, 0.04),
    roof: mk(roof, 0.92, 0.02),
    cloth: mk(cloth, 0.8, 0.0),
    metal: new THREE.MeshStandardMaterial({ color: 0x4a4550, roughness: 0.45, metalness: 0.7, flatShading: true }),
    ember: new THREE.MeshStandardMaterial({
      color: 0xff6633, emissive: 0xff4422, emissiveIntensity: 1.2, roughness: 0.6, flatShading: true,
    }),
    dark: new THREE.MeshStandardMaterial({ color: 0x121018, roughness: 0.95, flatShading: true }),
  };
}

export function pointFilterAll(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[] | undefined;
    if (!m) return;
    const list = Array.isArray(m) ? m : [m];
    for (const mat of list) {
      if (mat.map) {
        mat.map.magFilter = THREE.NearestFilter;
        mat.map.minFilter = THREE.NearestFilter;
        mat.map.generateMipmaps = false;
        mat.map.needsUpdate = true;
      }
    }
  });
}
