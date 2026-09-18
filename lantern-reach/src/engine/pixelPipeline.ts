import * as THREE from 'three';

/** Low-res RT → nearest-neighbor fullscreen upsample (3D pixel look). */
export class PixelPipeline {
  renderer: THREE.WebGLRenderer;
  rt: THREE.WebGLRenderTarget;
  private quadScene: THREE.Scene;
  private quadCam: THREE.OrthographicCamera;
  private quadMat: THREE.MeshBasicMaterial;
  pixelScale: number;
  private lastW = 0;
  private lastH = 0;

  constructor(canvas: HTMLCanvasElement, pixelScale = 4) {
    this.pixelScale = pixelScale;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.shadowMap.enabled = false;
    this.renderer.setClearColor(0x0a0712, 1);

    this.rt = new THREE.WebGLRenderTarget(320, 180, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      generateMipmaps: false,
      colorSpace: THREE.SRGBColorSpace,
      depthBuffer: true,
    });

    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quadScene = new THREE.Scene();
    this.quadMat = new THREE.MeshBasicMaterial({
      map: this.rt.texture,
      depthTest: false,
      depthWrite: false,
    });
    this.rt.texture.minFilter = THREE.NearestFilter;
    this.rt.texture.magFilter = THREE.NearestFilter;
    this.rt.texture.generateMipmaps = false;
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.quadMat);
    this.quadScene.add(quad);
  }

  setSize(cssW: number, cssH: number) {
    const w = Math.max(1, Math.floor(cssW));
    const h = Math.max(1, Math.floor(cssH));
    if (w === this.lastW && h === this.lastH) return;
    this.lastW = w;
    this.lastH = h;
    this.renderer.setSize(w, h, false);
    const rw = Math.max(160, Math.floor(w / this.pixelScale));
    const rh = Math.max(90, Math.floor(h / this.pixelScale));
    this.rt.setSize(rw, rh);
  }

  render(scene: THREE.Scene, camera: THREE.Camera) {
    this.renderer.setRenderTarget(this.rt);
    this.renderer.clear();
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    this.renderer.render(this.quadScene, this.quadCam);
  }

  dispose() {
    this.rt.dispose();
    this.quadMat.dispose();
    this.renderer.dispose();
  }
}
