import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Html, Lightformer, OrbitControls } from "@react-three/drei";
import {
  AlwaysStencilFunc,
  BackSide,
  Color,
  DecrementWrapStencilOp,
  FrontSide,
  IncrementWrapStencilOp,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  NotEqualStencilFunc,
  Plane,
  PlaneGeometry,
  Vector3,
} from "three";
import { loadDentition } from "./loadDentition";

// Three nested solids, cut by one plane: each draws its cut face with the
// stencil-buffer technique, so the section reads as solid, not hollow.
const SOLIDS = [
  { key: "outer", cap: "#F4EFE4" },
  { key: "dentin", cap: "#E6C98E" },
  { key: "pulp", cap: "#D2545F" },
];

const stencilMaterial = (side, op, plane) =>
  new MeshBasicMaterial({
    side,
    colorWrite: false,
    depthWrite: false,
    depthTest: false,
    clippingPlanes: [plane],
    stencilWrite: true,
    stencilFunc: AlwaysStencilFunc,
    stencilFail: op,
    stencilZFail: op,
    stencilZPass: op,
  });

const Solid = ({ geometry, cap, order, plane, capGeometry, turn }) => {
  const materials = useMemo(
    () => ({
      back: stencilMaterial(BackSide, IncrementWrapStencilOp, plane),
      front: stencilMaterial(FrontSide, DecrementWrapStencilOp, plane),
      cap: new MeshBasicMaterial({
        color: new Color(cap),
        stencilWrite: true,
        stencilRef: 0,
        stencilFunc: NotEqualStencilFunc,
      }),
    }),
    [cap, plane],
  );
  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);
  return (
    <>
      <group {...turn}>
        <mesh geometry={geometry} material={materials.back} renderOrder={order} />
        <mesh geometry={geometry} material={materials.front} renderOrder={order} />
      </group>
      <mesh
        geometry={capGeometry}
        material={materials.cap}
        renderOrder={order + 0.1}
        onAfterRender={(renderer) => renderer.clearStencil()}
      />
    </>
  );
};

const Labels = ({ size, flip }) => {
  const { h, root } = size;
  const y = (value) => value * flip;
  return [
    { text: "Enamel", at: [0, y(h * 0.9), 0] },
    { text: "Dentine", at: [size.a * 0.42, y(h * 0.46), 0] },
    { text: "Pulp", at: [0, y(Math.max(h * 0.1, 1.2)), 0] },
    { text: "Root canal", at: [0, y(-root * 0.55), 0] },
  ].map(({ text, at }) => (
    <Html key={text} position={at} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
      <span className="whitespace-nowrap rounded-full bg-ink/80 px-2 py-0.5 text-[11px] font-bold text-white ring-1 ring-white/20">
        {text}
      </span>
    </Html>
  ));
};

// Spins the whole tooth; a cut tooth keeps still so the plane stays put.
const Spin = ({ active, children }) => {
  const group = useRef();
  useFrame((_, dt) => {
    if (group.current && active) group.current.rotation.y += dt * 0.4;
  });
  return <group ref={group}>{children}</group>;
};

const Tooth = ({ mouth, tooth, cut }) => {
  const { parts } = mouth;
  const plane = useMemo(() => new Plane(new Vector3(0, 0, -1), 0), []);
  const capGeometry = useMemo(() => new PlaneGeometry(60, 60), []);
  const enamel = useMemo(
    () =>
      new MeshPhysicalMaterial({
        vertexColors: true,
        roughness: 0.3,
        clearcoat: 0.7,
        clearcoatRoughness: 0.18,
        ior: 1.62,
        clippingPlanes: [plane],
      }),
    [plane],
  );
  useEffect(() => {
    plane.constant = cut ? 0 : 40;
  }, [plane, cut]);
  useEffect(
    () => () => {
      capGeometry.dispose();
      enamel.dispose();
    },
    [capGeometry, enamel],
  );
  const upper = tooth.jaw === "upper";
  const flip = upper ? -1 : 1;
  const middle = ((tooth.size.h - tooth.size.root) / 2) * flip;
  // Front teeth are cut through the lips and tongue, back teeth along the
  // arch, where their roots show.
  const front = tooth.size.kind === "incisor" || tooth.size.kind === "canine";
  const turn = {
    position: [0, -middle, 0],
    rotation: [0, front ? Math.PI / 2 : 0, upper ? Math.PI : 0],
  };
  return (
    <Spin active={!cut}>
      <group {...turn}>
        <mesh geometry={parts[`${tooth.type}_outer`]} material={enamel} renderOrder={6} />
      </group>
      {cut &&
        SOLIDS.map((s, i) => (
          <Solid
            key={s.key}
            geometry={parts[`${tooth.type}_${s.key}`]}
            cap={s.cap}
            order={i + 1}
            plane={plane}
            capGeometry={capGeometry}
            turn={turn}
          />
        ))}
      {cut && (
        <group position={[0, -middle, 0]}>
          <Labels size={tooth.size} flip={flip} />
        </group>
      )}
    </Spin>
  );
};

const SectionScene = ({ toothId, cut }) => {
  const [mouth, setMouth] = useState(null);
  useEffect(() => {
    let live = true;
    loadDentition().then((m) => live && setMouth(m));
    return () => {
      live = false;
    };
  }, []);
  const tooth = mouth?.teeth.find((t) => t.id === toothId);
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[30, 50, 60]} intensity={1.2} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 6, 8]} scale={[14, 7, 1]} color="#FFF5EC" />
        <Lightformer form="rect" intensity={1.2} position={[-8, 0, 6]} rotation={[0, 1, 0]} scale={[6, 8, 1]} color="#CFE2FF" />
      </Environment>
      {tooth && <Tooth mouth={mouth} tooth={tooth} cut={cut} />}
      <OrbitControls makeDefault enablePan={false} minDistance={28} maxDistance={120} />
    </>
  );
};

// A single tooth, whole or cut through to show enamel, dentine and pulp.
const ToothSection = ({ toothId }) => {
  const [cut, setCut] = useState(true);
  return (
    <div className="relative h-72 overflow-hidden rounded-xl bg-[radial-gradient(ellipse_at_50%_40%,#22345F_0%,#101A38_70%)]">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 58], fov: 32, near: 1, far: 300 }}
        gl={{ antialias: true, alpha: true, stencil: true }}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true;
        }}
      >
        <SectionScene toothId={toothId} cut={cut} />
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-end p-2">
        <div className="pointer-events-auto flex rounded-lg bg-white/10 p-0.5 ring-1 ring-white/10">
          {[
            [true, "Section"],
            [false, "Whole"],
          ].map(([value, label]) => (
            <button
              key={label}
              type="button"
              aria-pressed={cut === value}
              onClick={() => setCut(value)}
              className={`rounded-md px-2 py-1 text-xs font-bold ${
                cut === value ? "bg-white text-ink" : "text-white/75 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ToothSection;
