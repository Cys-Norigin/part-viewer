import { GizmoHelper, GizmoViewport, OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { LoadedPart } from "@/lib/load-part";

const LIME = "#c6f135";
const BENCH = "#0c0e0c";

function eachMaterial(mesh: THREE.Mesh, fn: (m: THREE.Material) => void) {
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  mats.forEach((m) => m && fn(m));
}

function frameFor(part: LoadedPart) {
  const r = Math.max(part.radius, 8);
  const dist = (r * 1.45) / Math.tan((28 * Math.PI) / 180 / 2);
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

export function PartStage({
  part,
  spin,
  wire,
  cut,
  onUserMove,
  frameKey,
}: {
  part: LoadedPart;
  spin: boolean;
  wire: boolean;
  cut: number | null;
  onUserMove: () => void;
  frameKey: number;
}) {
  const wireObject = useMemo(() => {
    const clone = part.object.clone(true);
    clone.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      obj.material = new THREE.MeshBasicMaterial({ color: LIME, wireframe: true });
      obj.castShadow = false;
      obj.receiveShadow = false;
    });
    return clone;
  }, [part]);

  useEffect(() => {
    return () => {
      wireObject.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => m?.dispose());
        }
      });
    };
  }, [wireObject]);

  useEffect(() => {
    const half = part.size.x * 0.5;
    const planes = cut === null ? [] : [new THREE.Plane(new THREE.Vector3(1, 0, 0), -cut * half)];
    const apply = (root: THREE.Object3D) => {
      root.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return;
        eachMaterial(obj, (m) => {
          m.clippingPlanes = planes;
          m.needsUpdate = true;
        });
      });
    };
    apply(part.object);
    apply(wireObject);
  }, [part, wireObject, cut]);

  const frame = frameFor(part);
  const floor = Math.max(part.size.x, part.size.z, part.radius) * 1.8;

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [frame.pos[0], frame.pos[1], frame.pos[2]], fov: 28, near: 0.1, far: Math.max(4000, frame.dist * 8) }}
      gl={{ antialias: true, localClippingEnabled: true, toneMapping: THREE.ACESFilmicToneMapping }}
      onCreated={({ gl }) => {
        gl.localClippingEnabled = true;
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
      {wire && <primitive object={wireObject} />}
      <OrbitControls
        makeDefault
        enableDamping
        enablePan={false}
        autoRotate={spin}
        autoRotateSpeed={0.65}
        target={[0, part.size.y * 0.42, 0]}
        minDistance={part.radius * 0.6}
        maxDistance={frame.dist * 4}
        minPolarAngle={0.25}
        maxPolarAngle={Math.PI * 0.82}
        onStart={onUserMove}
      />
      <GizmoHelper alignment="bottom-right" margin={[72, 72]}>
        <GizmoViewport axisColors={[LIME, "#ece7dc", "#8d987f"]} labelColor="#10120f" />
      </GizmoHelper>
    </Canvas>
  );
}
