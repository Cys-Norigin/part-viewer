import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

const PLASTIC = new THREE.MeshPhysicalMaterial({
  color: "#3a3a3a",
  roughness: 0.46,
  metalness: 0.02,
  clearcoat: 0.18,
  clearcoatRoughness: 0.55,
});

export type LoadedPart = {
  object: THREE.Object3D;
  name: string;
  triangles: number;
  size: THREE.Vector3;
  radius: number;
};

function studioPlastic() {
  return PLASTIC.clone();
}

function countTriangles(root: THREE.Object3D) {
  let triangles = 0;
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const geo = obj.geometry;
    const pos = geo.getAttribute("position");
    if (!pos) return;
    triangles += geo.index ? geo.index.count / 3 : pos.count / 3;
  });
  return Math.round(triangles);
}

function paintPlain(root: THREE.Object3D) {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.material = studioPlastic();
    obj.castShadow = true;
    obj.receiveShadow = true;
  });
}

function enableShadows(root: THREE.Object3D) {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.castShadow = true;
    obj.receiveShadow = true;
  });
}

/** Sit the part on the bench, centered in XZ. */
function settle(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  if (box.isEmpty()) throw new Error("That file has no geometry.");
  const center = box.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.y -= box.min.y;
  root.position.z -= center.z;
  root.updateMatrixWorld(true);
  const settled = new THREE.Box3().setFromObject(root);
  const size = settled.getSize(new THREE.Vector3());
  const radius = Math.max(size.length() * 0.5, 8);
  return { size, radius, triangles: countTriangles(root) };
}

export function disposePart(part: LoadedPart | null) {
  if (!part) return;
  part.object.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.geometry?.dispose();
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((m) => m?.dispose());
  });
}

/** A stand-in so the stage is already spinning before a file is opened. */
export function makeSample(): LoadedPart {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(72, 36, 48, 1, 1, 1));
  const boss = new THREE.Mesh(new THREE.CylinderGeometry(14, 16, 22, 48));
  boss.position.y = 28;
  const fin = new THREE.Mesh(new THREE.BoxGeometry(8, 20, 40));
  fin.position.set(32, 8, 0);
  group.add(body, boss, fin);
  paintPlain(group);
  const settled = settle(group);
  return { object: group, name: "Sample", ...settled };
}

export async function loadPartFile(file: File): Promise<LoadedPart> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const buf = await file.arrayBuffer();
  let root: THREE.Object3D;
  let plain = true;
  if (ext === "stl") {
    const geo = new STLLoader().parse(buf);
    geo.computeVertexNormals();
    root = new THREE.Mesh(geo);
  } else if (ext === "obj") {
    root = new OBJLoader().parse(new TextDecoder().decode(buf));
  } else if (ext === "glb" || ext === "gltf") {
    const gltf = await new GLTFLoader().parseAsync(buf, "");
    root = gltf.scene;
    plain = false;
  } else {
    throw new Error("Use an STL, OBJ, or GLB file.");
  }
  if (plain) paintPlain(root);
  else enableShadows(root);
  const settled = settle(root);
  return { object: root, name: file.name, ...settled };
}
