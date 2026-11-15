import { Billboard, GizmoHelper, GizmoViewport, Line, OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import type { LoadedPart } from "@/lib/load-part";

const LIME = "#c6f135";
const BENCH = "#0c0e0c";

function frameFor(part: LoadedPart) {
  const reach = part.radius + Math.max(part.size.x, part.size.y, part.size.z) * 0.28;
  const dist = (reach * 1.55) / Math.tan((28 * Math.PI) / 180 / 2);
  return {
    pos: [dist * 0.42, part.size.y * 0.55 + dist * 0.22, dist] as const,
    target: [0, part.size.y * 0.42, 0] as const,
    dist,
  };
}

function FrameCamera({ part, frameKey }: { part: LoadedPart; frameKey: number }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as { target: THREE.Vector3; update: () => void } | null;
  useEffect(() => {
    const frame = frameFor(part);
    camera.position.set(frame.pos[0], frame.pos[1], frame.pos[2]);
    if (controls) {
      controls.target.set(frame.target[0], frame.target[1], frame.target[2]);
      controls.update();
    } else {
      camera.lookAt(frame.target[0], frame.target[1], frame.target[2]);
    }
  }, [part, frameKey, camera, controls]);
  return null;
}

function mmLabel(n: number) {
  const r = Math.round(n * 10) / 10;
  const text = Number.isInteger(r) ? String(r) : r.toFixed(1);
  return `${text} mm`;
}

function Label({ position, text, height }: { position: THREE.Vector3; text: string; height: number }) {
  const [fontTick, setFontTick] = useState(0);
  useEffect(() => {
    let live = true;
    document.fonts?.ready.then(() => {
      if (live) setFontTick((n) => n + 1);
    });
    return () => {
      live = false;
    };
  }, []);

  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    const w = 512;
    const h = 128;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(16,18,15,0.9)";
    ctx.beginPath();
    ctx.roundRect(6, 18, w - 12, h - 36, 28);
    ctx.fill();
    ctx.fillStyle = "#c6f135";
    ctx.font = "500 64px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, w / 2, h / 2 + 2);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }, [text, fontTick]);

  useEffect(() => {
    return () => texture?.dispose();
  }, [texture]);

  if (!texture) return null;
  const width = height * (512 / 128);
  return (
    <Billboard position={position}>
      <mesh renderOrder={2}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={texture} transparent depthTest={false} />
      </mesh>
    </Billboard>
  );
}

function pts(p: THREE.Vector3, q: THREE.Vector3): [number, number, number][] {
  return [
    [p.x, p.y, p.z],
    [q.x, q.y, q.z],
  ];
}

/** Extension lines, a dimension line, and a label sitting just outside one side. */
function Callout({
  a,
  b,
  out,
  gap,
  label,
}: {
  a: THREE.Vector3;
  b: THREE.Vector3;
  out: THREE.Vector3;
  gap: number;
  label: string;
}) {
  const start = a.clone().addScaledVector(out, gap);
  const end = b.clone().addScaledVector(out, gap);
  const dir = end.clone().sub(start);
  const span = dir.length();
  dir.normalize();
  const wing = Math.min(span * 0.06, gap * 0.45);
  const side = new THREE.Vector3().crossVectors(dir, out);
  if (side.lengthSq() < 1e-8) side.set(0, 1, 0);
  side.normalize();

  const wings = (tip: THREE.Vector3, back: THREE.Vector3) => {
    const base = tip.clone().addScaledVector(back, wing);
    return [
      [base.clone().addScaledVector(side, wing * 0.38), tip],
      [base.clone().addScaledVector(side, -wing * 0.38), tip],
    ] as const;
  };
  const startWings = wings(start, dir);
  const endWings = wings(end, dir.clone().negate());
  const mid = start.clone().add(end).multiplyScalar(0.5);
  const labelH = Math.min(Math.max(span * 0.07, wing * 2.2), gap * 0.85);
  const labelPos = mid.clone().addScaledVector(out, labelH * 0.95);
  if (Math.abs(dir.y) < 0.5) labelPos.y += labelH * 0.65;

  return (
    <group>
      <Line points={pts(a, start)} color={LIME} lineWidth={1.25} />
      <Line points={pts(b, end)} color={LIME} lineWidth={1.25} />
      <Line points={pts(start, end)} color={LIME} lineWidth={1.5} />
      <Line points={pts(startWings[0][0], startWings[0][1])} color={LIME} lineWidth={1.5} />
      <Line points={pts(startWings[1][0], startWings[1][1])} color={LIME} lineWidth={1.5} />
      <Line points={pts(endWings[0][0], endWings[0][1])} color={LIME} lineWidth={1.5} />
      <Line points={pts(endWings[1][0], endWings[1][1])} color={LIME} lineWidth={1.5} />
      <Label position={labelPos} text={label} height={labelH} />
    </group>
  );
}

function v(x: number, y: number, z: number) {
  return new THREE.Vector3(x, y, z);
}

function Dimensions({ size }: { size: THREE.Vector3 }) {
  const hx = size.x / 2;
  const hz = size.z / 2;
  const gap = Math.max(size.x, size.y, size.z, 12) * 0.18;
  return (
    <group>
      <Callout a={v(-hx, 0, hz)} b={v(hx, 0, hz)} out={v(0, 0, 1)} gap={gap} label={mmLabel(size.x)} />
      <Callout a={v(hx, 0, -hz)} b={v(hx, 0, hz)} out={v(1, 0, 0)} gap={gap * 1.75} label={mmLabel(size.z)} />
      <Callout a={v(-hx, 0, hz)} b={v(-hx, size.y, hz)} out={v(-1, 0, 0)} gap={gap * 1.35} label={mmLabel(size.y)} />
    </group>
  );
}

export function PartStage({
  part,
  spin,
  onGrab,
  onRelease,
  frameKey,
}: {
  part: LoadedPart;
  spin: boolean;
  onGrab: () => void;
  onRelease: () => void;
  frameKey: number;
}) {
  const frame = frameFor(part);
  const floor = Math.max(part.size.x, part.size.z, part.radius) * 2.4;

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [frame.pos[0], frame.pos[1], frame.pos[2]], fov: 28, near: 0.1, far: Math.max(4000, frame.dist * 8) }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.28;
        gl.shadowMap.type = THREE.PCFShadowMap;
      }}
    >
      <FrameCamera part={part} frameKey={frameKey} />
      <color attach="background" args={["#10120f"]} />
      <hemisphereLight args={["#f7f4ee", "#1a1c1a", 0.42]} />
      <ambientLight intensity={0.18} />
      <directionalLight
        position={[frame.dist * 0.4, frame.dist, frame.dist * 0.3]}
        intensity={3.4}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={frame.dist * 0.1}
        shadow-camera-far={frame.dist * 6}
        shadow-camera-left={-frame.dist}
        shadow-camera-right={frame.dist}
        shadow-camera-top={frame.dist}
        shadow-camera-bottom={-frame.dist}
      />
      <directionalLight position={[-frame.dist, frame.dist * 0.4, frame.dist]} intensity={0.85} color="#f4f0e4" />
      <directionalLight position={[frame.dist, frame.dist * 0.2, -frame.dist * 0.4]} intensity={1.6} color="#ffffff" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]} receiveShadow>
        <circleGeometry args={[floor, 64]} />
        <meshStandardMaterial color={BENCH} roughness={1} metalness={0} />
      </mesh>
      <primitive object={part.object} />
      <Dimensions size={part.size} />
      <OrbitControls
        makeDefault
        enableDamping
        enablePan={false}
        autoRotate={spin}
        autoRotateSpeed={0.65}
        target={[0, part.size.y * 0.42, 0]}
        minDistance={part.radius * 0.6}
        maxDistance={frame.dist * 4}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI * 0.82}
        onStart={onGrab}
        onEnd={onRelease}
      />
      <GizmoHelper alignment="bottom-right" margin={[72, 72]}>
        <GizmoViewport axisColors={[LIME, "#ece7dc", "#8d987f"]} labelColor="#10120f" />
      </GizmoHelper>
    </Canvas>
  );
}
