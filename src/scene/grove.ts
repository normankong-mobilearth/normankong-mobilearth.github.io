import * as THREE from "three";
import { clamp01, easeInOutCubic, lerp, prefersReducedMotion } from "../motion";
import type { QrMatrix } from "../qr/matrix";
import { hashString } from "../rng";
import { PALETTES, SCAN_DARK, SCAN_LIGHT, type Palette, type PaletteId } from "./palettes";
import { createTree } from "./tree";

const DARK_H = 0.78;
const LIGHT_H = 0.11;
const SCAN_H = 0.03;
const DARK_GAP = 0.14;
const ANIM_MS = 800;
const SCAN_FILL = 0.88;

export type GroveView = "sculpture" | "scan";

export type GroveHandlers = {
  onViewChange?: (view: GroveView) => void;
  onProgress?: (t: number) => void;
};

type ModuleRecord = {
  dark: boolean;
  x: number;
  z: number;
  sculptH: number;
  sculptSx: number;
  sculptColor: THREE.Color;
  scanColor: THREE.Color;
};

export class GroveScene {
  readonly canvas: HTMLCanvasElement;
  private readonly handlers: GroveHandlers;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly clock = new THREE.Clock();
  private readonly dummy = new THREE.Object3D();
  private readonly colorScratch = new THREE.Color();
  private readonly scanWhite = new THREE.Color(SCAN_LIGHT);
  private readonly upSculpt = new THREE.Vector3(0, 1, 0);
  private readonly upScan = new THREE.Vector3(0, 0, -1);
  private readonly sph = new THREE.Spherical();

  private ambient: THREE.AmbientLight;
  private hemi: THREE.HemisphereLight;
  private sun: THREE.DirectionalLight;
  private fog: THREE.Fog;

  private plot = new THREE.Group();
  private planter = new THREE.Group();
  private modules: THREE.InstancedMesh | null = null;
  private records: ModuleRecord[] = [];
  private tree: THREE.Group | null = null;
  private extras: THREE.Object3D[] = [];
  private planterMats: THREE.MeshLambertMaterial[] = [];
  private boardMat: THREE.MeshLambertMaterial | null = null;
  private palette: Palette = PALETTES.limestone;
  private plotSize = 37;
  private viewT = 0;
  private viewFrom = 0;
  private viewTo = 0;
  private animStart = 0;
  private animDuration = ANIM_MS;
  private animating = false;
  private running = true;
  private raf = 0;
  private reduced = false;
  private lastInstanceT = Number.NaN;
  private pointerStart: { x: number; y: number; t: number } | null = null;
  private scanSettled = false;

  constructor(canvas: HTMLCanvasElement, handlers: GroveHandlers = {}) {
    this.canvas = canvas;
    this.handlers = handlers;
    this.reduced = prefersReducedMotion();

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.setClearColor(this.palette.studio, 1);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.palette.studio);
    this.fog = new THREE.Fog(this.palette.studio, 40, 90);
    this.scene.fog = this.fog;

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 240);
    this.scene.add(this.plot);

    this.ambient = new THREE.AmbientLight(0xffffff, 0.28);
    this.hemi = new THREE.HemisphereLight(this.palette.hemiSky, this.palette.hemiGround, 0.78);
    this.sun = new THREE.DirectionalLight(this.palette.sun, 1.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.bias = -0.001;
    this.scene.add(this.ambient, this.hemi, this.sun, this.sun.target);

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    motionQuery.addEventListener("change", () => {
      this.reduced = motionQuery.matches;
    });

    this.bindPointer();
    this.resize();
    this.raf = requestAnimationFrame(this.tick);
  }

  plant(matrix: QrMatrix, paletteId: PaletteId): void {
    this.disposePlot();
    this.palette = PALETTES[paletteId];
    this.plotSize = matrix.size;
    this.lastInstanceT = Number.NaN;
    this.scanSettled = false;
    this.applyStudioColors();

    const n = matrix.size;
    const origin = (n - 1) / 2;
    this.records = [];

    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshLambertMaterial();
    const mesh = new THREE.InstancedMesh(geo, mat, n * n);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;

    let i = 0;
    for (let z = 0; z < n; z++) {
      const row = matrix.modules[z];
      if (!row) continue;
      for (let x = 0; x < n; x++) {
        const dark = Boolean(row[x]);
        const rec: ModuleRecord = {
          dark,
          x: x - origin,
          z: z - origin,
          sculptH: dark ? DARK_H : LIGHT_H,
          sculptSx: dark ? 1 - DARK_GAP : 1,
          sculptColor: new THREE.Color(dark ? this.palette.dark : this.palette.light),
          scanColor: new THREE.Color(dark ? SCAN_DARK : SCAN_LIGHT),
        };
        this.records.push(rec);
        this.writeInstance(mesh, i, rec, this.viewT);
        i += 1;
      }
    }
    mesh.count = this.records.length;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.instanceMatrix.needsUpdate = true;
    this.modules = mesh;
    this.plot.add(mesh);

    this.boardMat = new THREE.MeshLambertMaterial({ color: this.palette.light });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(n + 0.02, n + 0.02), this.boardMat);
    board.rotation.x = -Math.PI / 2;
    board.position.y = 0.002;
    board.receiveShadow = true;
    this.plot.add(board);

    this.addStudio(n);
    this.addPlanter(n);
    this.tree = createTree(hashString(matrix.destination), this.palette, n);
    this.plot.add(this.tree);
    this.fitShadow(n);
    this.applyView(this.viewT, 0, true);
  }

  setView(view: GroveView, opts: { animate?: boolean } = {}): void {
    const target = view === "scan" ? 1 : 0;
    if (Math.abs(target - this.viewTo) < 1e-4 && !this.animating) {
      this.handlers.onViewChange?.(view);
      this.handlers.onProgress?.(this.viewT);
      return;
    }
    const animate = opts.animate !== false && !this.reduced;
    if (!animate) {
      this.viewT = target;
      this.viewFrom = target;
      this.viewTo = target;
      this.animating = false;
      this.applyView(target, 0, true);
      this.handlers.onViewChange?.(view);
      return;
    }
    this.viewFrom = this.viewT;
    this.viewTo = target;
    this.animDuration = Math.max(160, ANIM_MS * Math.abs(this.viewTo - this.viewFrom));
    this.animStart = performance.now();
    this.animating = true;
    this.scanSettled = false;
    this.handlers.onViewChange?.(view);
  }

  toggleView(): GroveView {
    const next: GroveView = this.viewTo >= 0.5 ? "sculpture" : "scan";
    this.setView(next);
    return next;
  }

  getView(): GroveView {
    return this.viewTo >= 0.5 ? "scan" : "sculpture";
  }

  resize(): void {
    const parent = this.canvas.parentElement ?? this.canvas;
    const rect = parent.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    const dpr = Math.min(window.devicePixelRatio, width * height > 900_000 ? 1.5 : 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.scanSettled = false;
    this.applyView(this.viewT, this.clock.getElapsedTime(), true);
  }

  dispose(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.disposePlot();
    this.renderer.dispose();
  }

  private bindPointer(): void {
    const el = this.canvas;
    el.addEventListener("pointerdown", (e) => {
      this.pointerStart = { x: e.clientX, y: e.clientY, t: performance.now() };
    });
    el.addEventListener("pointerup", (e) => {
      const start = this.pointerStart;
      this.pointerStart = null;
      if (!start) return;
      const dt = performance.now() - start.t;
      const dist = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      if (dt < 700 && dist < 12) this.toggleView();
    });
    el.addEventListener("pointercancel", () => {
      this.pointerStart = null;
    });
  }

  private tick = (): void => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.tick);
    const now = performance.now();
    const elapsed = this.clock.getElapsedTime();
    if (this.animating) {
      const u = clamp01((now - this.animStart) / this.animDuration);
      this.viewT = lerp(this.viewFrom, this.viewTo, easeInOutCubic(u));
      if (u >= 1) {
        this.viewT = this.viewTo;
        this.animating = false;
      }
    }
    const idleScan = !this.animating && this.viewT >= 1;
    if (idleScan && this.scanSettled) return;
    this.applyView(this.viewT, elapsed, false);
    this.renderer.render(this.scene, this.camera);
    this.scanSettled = idleScan;
  };

  private applyView(t: number, elapsed: number, force: boolean): void {
    const n = this.plotSize;
    const modulesDirty = force || this.animating || Number.isNaN(this.lastInstanceT) || Math.abs(t - this.lastInstanceT) > 1e-4;
    if (modulesDirty) {
      this.writeAllInstances(t);
      this.lastInstanceT = t;
      if (this.boardMat) {
        this.colorScratch.set(this.palette.light).lerp(this.scanWhite, t);
        this.boardMat.color.copy(this.colorScratch);
      }
      for (const mat of this.planterMats) {
        const base = mat.userData.base as THREE.Color;
        mat.color.copy(base).lerp(this.scanWhite, t);
      }
      if (this.tree) {
        const s = 1 - t;
        this.tree.scale.setScalar(Math.max(s, 0.001));
        this.tree.visible = t < 0.88;
      }
      this.planter.visible = t < 0.92;
      this.planter.scale.setScalar(Math.max(1 - t * 0.15, 0.85));
      for (const extra of this.extras) extra.visible = t < 0.4;
      this.ambient.intensity = lerp(0.28, 1, t);
      this.hemi.intensity = lerp(0.78, 0, t);
      this.sun.intensity = lerp(1.2, 0, t);
      this.sun.castShadow = t < 0.4;
      this.fog.near = lerp(n * 1.7, 400, t);
      this.fog.far = lerp(n * 3.6, 800, t);
      this.handlers.onProgress?.(t);
    }

    if (this.tree && this.tree.visible && t < 0.2 && !this.reduced) {
      this.tree.rotation.z = Math.sin(elapsed * 0.7) * 0.012;
    } else if (this.tree) {
      this.tree.rotation.z = 0;
    }

    this.placeCamera(t, elapsed);
  }

  private placeCamera(t: number, elapsed: number): void {
    const n = this.plotSize;
    const idle = t < 0.05 && !this.reduced ? Math.sin(elapsed * 0.28) * 0.04 : 0;
    const phiSculpt = 0.9;
    const phiScan = 0.02;
    const theta = Math.PI / 4 + idle * (1 - t);
    const radiusSculpt = this.radiusForFill(n, 0.6, 32);
    const radiusScan = this.radiusForFill(n, SCAN_FILL, 28);
    this.sph.phi = lerp(phiSculpt, phiScan, t);
    this.sph.theta = theta;
    this.sph.radius = lerp(radiusSculpt, radiusScan, t);
    this.camera.fov = lerp(32, 28, t);
    this.camera.position.setFromSpherical(this.sph);
    this.camera.up.copy(this.upSculpt).lerp(this.upScan, t).normalize();
    this.camera.lookAt(0, lerp(0.28, 0, t), 0);
    this.camera.updateProjectionMatrix();

    this.sun.position.set(n * 0.5, n * 0.95, n * 0.32);
    this.sun.target.position.set(0, 0, 0);
    this.sun.target.updateMatrixWorld();
  }

  private radiusForFill(plotSize: number, fill: number, fovDeg: number): number {
    const aspect = this.camera.aspect || 1;
    const half = plotSize / 2 / fill;
    const vFov = THREE.MathUtils.degToRad(fovDeg);
    const visibleH = 2 * Math.tan(vFov / 2);
    const shortFactor = aspect >= 1 ? visibleH : visibleH * aspect;
    return half / (shortFactor / 2);
  }

  private writeAllInstances(t: number): void {
    const mesh = this.modules;
    if (!mesh) return;
    for (let i = 0; i < this.records.length; i++) {
      const rec = this.records[i];
      if (!rec) continue;
      this.writeInstance(mesh, i, rec, t);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  private writeInstance(mesh: THREE.InstancedMesh, index: number, rec: ModuleRecord, t: number): void {
    const h = lerp(rec.sculptH, SCAN_H, t);
    const sx = lerp(rec.sculptSx, rec.dark ? 1.02 : 1, t);
    this.dummy.position.set(rec.x, h / 2, rec.z);
    this.dummy.scale.set(sx, h, sx);
    this.dummy.rotation.set(0, 0, 0);
    this.dummy.updateMatrix();
    mesh.setMatrixAt(index, this.dummy.matrix);
    this.colorScratch.copy(rec.sculptColor).lerp(rec.scanColor, t);
    mesh.setColorAt(index, this.colorScratch);
  }

  private addStudio(n: number): void {
    const floorMat = new THREE.MeshLambertMaterial({ color: this.palette.studio });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(n * 1.4, 48), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.36;
    floor.receiveShadow = true;
    this.plot.add(floor);
    this.extras.push(floor);

    const blob = document.createElement("canvas");
    blob.width = 128;
    blob.height = 128;
    const ctx = blob.getContext("2d");
    if (ctx) {
      const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
      g.addColorStop(0, "rgba(0,0,0,0.4)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
    }
    const tex = new THREE.CanvasTexture(blob);
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(n * 1.25, n * 1.25),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.32;
    this.plot.add(shadow);
    this.extras.push(shadow);
  }

  private addPlanter(n: number): void {
    this.planter = new THREE.Group();
    this.planterMats = [];
    const wallT = 0.58;
    const wallH = 0.64;
    const baseH = 0.3;
    const outer = n + wallT * 2;
    const baseMat = new THREE.MeshLambertMaterial({ color: this.palette.planter });
    baseMat.userData.base = new THREE.Color(this.palette.planter);
    const lipMat = new THREE.MeshLambertMaterial({ color: this.palette.planterLip });
    lipMat.userData.base = new THREE.Color(this.palette.planterLip);
    this.planterMats.push(baseMat, lipMat);

    const base = new THREE.Mesh(new THREE.BoxGeometry(outer + 0.2, baseH, outer + 0.2), baseMat);
    base.position.y = -baseH / 2 - 0.02;
    base.receiveShadow = true;
    this.planter.add(base);

    const half = n / 2 + wallT / 2;
    const walls: Array<[number, number, number, number]> = [
      [0, -half, outer, wallT],
      [0, half, outer, wallT],
      [-half, 0, wallT, n],
      [half, 0, wallT, n],
    ];
    for (const [x, z, w, d] of walls) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), lipMat);
      wall.position.set(x, wallH / 2 - 0.04, z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.planter.add(wall);
    }
    this.plot.add(this.planter);
  }

  private fitShadow(n: number): void {
    const span = n * 0.75;
    const cam = this.sun.shadow.camera as THREE.OrthographicCamera;
    cam.left = -span;
    cam.right = span;
    cam.top = span;
    cam.bottom = -span;
    cam.near = 0.5;
    cam.far = n * 3;
    cam.updateProjectionMatrix();
  }

  private applyStudioColors(): void {
    const bg = new THREE.Color(this.palette.studio);
    this.scene.background = bg;
    this.fog.color.copy(bg);
    this.renderer.setClearColor(this.palette.studio, 1);
    this.hemi.color.set(this.palette.hemiSky);
    this.hemi.groundColor.set(this.palette.hemiGround);
    this.sun.color.set(this.palette.sun);
  }

  private disposePlot(): void {
    this.plot.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of materials) {
          const map = "map" in m ? m.map : null;
          if (map && map instanceof THREE.Texture) map.dispose();
          m.dispose();
        }
      }
    });
    this.plot.clear();
    this.modules = null;
    this.tree = null;
    this.boardMat = null;
    this.planterMats = [];
    this.records = [];
    this.extras = [];
    this.planter = new THREE.Group();
  }
}
