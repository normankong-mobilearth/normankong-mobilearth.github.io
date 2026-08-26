import * as THREE from "three";
import { mulberry32 } from "../rng";
import type { Palette } from "./palettes";

/** Compact architectural bonsai — a carved pine on a grid, not a flowering L-system. */
export function createTree(seed: number, palette: Palette, plotSize: number): THREE.Group {
  const rng = mulberry32(seed);
  const group = new THREE.Group();
  group.name = "tree";
  group.frustumCulled = false;

  const unit = plotSize * 0.34;
  const trunkMat = new THREE.MeshLambertMaterial({ color: palette.trunk });
  const canopyMat = new THREE.MeshLambertMaterial({ color: palette.canopy });
  const stoneMat = new THREE.MeshLambertMaterial({ color: palette.stone });
  const soilMat = new THREE.MeshLambertMaterial({ color: palette.dark });

  const soil = new THREE.Mesh(new THREE.CylinderGeometry(unit * 0.1, unit * 0.14, unit * 0.035, 10), soilMat);
  soil.position.y = 0.82;
  soil.castShadow = true;
  soil.receiveShadow = true;
  soil.frustumCulled = false;
  group.add(soil);

  const trunkHeight = unit * 0.55;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(unit * 0.018, unit * 0.042, trunkHeight, 7), trunkMat);
  trunk.position.y = 0.82 + trunkHeight / 2;
  trunk.rotation.z = (rng() - 0.5) * 0.12;
  trunk.rotation.x = (rng() - 0.5) * 0.08;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  trunk.frustumCulled = false;
  group.add(trunk);

  const crownY = 0.82 + trunkHeight * 0.92;
  const crown = new THREE.Vector3(Math.sin(trunk.rotation.z) * trunkHeight * 0.35, crownY, 0);

  const blobs: Array<[number, number, number, number]> = [
    [crown.x, crown.y + unit * 0.04, crown.z, unit * 0.2],
    [crown.x + unit * 0.12, crown.y - unit * 0.02, crown.z + unit * 0.06, unit * 0.14],
    [crown.x - unit * 0.11, crown.y - unit * 0.04, crown.z - unit * 0.05, unit * 0.13],
    [crown.x + unit * 0.02, crown.y + unit * 0.1, crown.z - unit * 0.08, unit * 0.11],
  ];
  for (const [x, y, z, r] of blobs) {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), canopyMat);
    leaf.position.set(x + (rng() - 0.5) * unit * 0.02, y, z + (rng() - 0.5) * unit * 0.02);
    leaf.rotation.set(rng() * 0.6, rng() * Math.PI, rng() * 0.4);
    leaf.scale.set(1.05, 0.72 + rng() * 0.1, 1.0);
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    leaf.frustumCulled = false;
    group.add(leaf);
  }

  const limbLen = unit * 0.22;
  const limb = new THREE.Mesh(new THREE.CylinderGeometry(unit * 0.01, unit * 0.018, limbLen, 5), trunkMat);
  limb.position.set(unit * 0.04, 0.82 + trunkHeight * 0.55, unit * 0.02);
  limb.rotation.z = -0.85 - rng() * 0.15;
  limb.rotation.y = rng() * 0.4;
  limb.castShadow = true;
  limb.frustumCulled = false;
  group.add(limb);

  for (let i = 0; i < 2; i++) {
    const s = unit * (0.028 + rng() * 0.018);
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), stoneMat);
    const a = 0.8 + i * 1.7 + rng() * 0.3;
    const d = unit * 0.14;
    stone.position.set(Math.cos(a) * d, 0.82 + s * 0.3, Math.sin(a) * d);
    stone.rotation.set(rng(), rng(), rng());
    stone.castShadow = true;
    stone.frustumCulled = false;
    group.add(stone);
  }

  group.position.set((rng() - 0.5) * plotSize * 0.04, 0, (rng() - 0.5) * plotSize * 0.04);
  return group;
}
