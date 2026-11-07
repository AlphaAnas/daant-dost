import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Billboard, Environment, Html, Lightformer, OrbitControls } from "@react-three/drei";
import { AdditiveBlending, DoubleSide, Plane, Vector3 } from "three";
import CameraRig from "../../anatomy/CameraRig";
import { conditionById, dentalRegionById } from "../../../data/dental";
import { toothById, surfaceName } from "../../../data/teeth";
import { loadDentition } from "./loadDentition";
import { dentitionAtAge } from "../../../shared/chronology";
import { agedTooth, growthPivot, grownPoint, jawGrowth, primaryTeeth } from "./ageModel";
import {
  JAW_ANGLE,
  REGION_VIEWS,
  VIEWS,
  regionOfPart,
  surfaceAt,
  toothCamera,
} from "./dentalModel";
import {
  createMouthMaterials,
  createToothMaterial,
  hexToRgb,
  materialKey,
} from "./dentalMaterials";

const CLICK_SLOP = 5;
const PICKED_SURFACE = 0.78;
const CONDITION_SURFACE = 0.94;

// One material per distinct look, kept while the view lives.
const useToothMaterials = () => {
  const cache = useRef(new Map());
  useEffect(() => {
    const materials = cache.current;
    return () => {
      materials.forEach((m) => m.dispose());
      materials.clear();
    };
  }, []);
  return (state) => {
    const key = materialKey(state);
    if (!cache.current.has(key)) cache.current.set(key, createToothMaterial(state));
    return cache.current.get(key);
  };
};

// Surfaces tinted on a tooth: charted findings first, in their own colours,
// otherwise the stage accent while the tooth is picked.
const surfaceTints = (row, accent) => {
  if (!row?.surfaces?.length) return undefined;
  const finding = row.conditions?.map(conditionById).find((c) => c?.surfaced);
  const [r, g, b] = hexToRgb(finding?.color || accent);
  const strength = finding ? CONDITION_SURFACE : PICKED_SURFACE;
  return Object.fromEntries(row.surfaces.map((s) => [s, [r, g, b, strength]]));
};

const Tag = ({ at, children, picked, color }) => (
  <Html center position={at} zIndexRange={[25, 0]} style={{ pointerEvents: "none" }}>
    <span
      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold shadow-lg ${
        picked ? "text-ink" : "bg-ink/85 text-white ring-1 ring-white/20"
      }`}
      style={picked ? { background: color } : undefined}
    >
      {children}
    </span>
  </Html>
);

// A small pulsing marker for a site with no mesh of its own to light up.
const Marker = ({ at, color, selected, label, onSelect }) => {
  const root = useRef();
  const pulse = useRef();
  const [hovered, setHovered] = useState(false);
  useFrame(({ clock, camera }) => {
    if (root.current) {
      const d = camera.position.distanceTo(root.current.position);
      root.current.scale.setScalar(Math.min(0.9, Math.max(0.3, d / 330)));
    }
    if (pulse.current) {
      const k = (clock.getElapsedTime() * 0.9) % 1;
      pulse.current.scale.setScalar(1 + k * 1.5);
      pulse.current.material.opacity = selected ? 0.6 * (1 - k) : 0;
    }
  });
  const tint = selected ? color : hovered ? "#FFFFFF" : "#13BCFB";
  return (
    <group ref={root} position={at}>
      <mesh
        onClick={(e) => {
          if (e.delta > CLICK_SLOP || !onSelect) return;
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[6, 12, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh renderOrder={10}>
        <sphereGeometry args={[1.6, 16, 12]} />
        <meshBasicMaterial color={tint} depthTest={false} transparent />
      </mesh>
      <Billboard>
        <mesh renderOrder={10}>
          <ringGeometry args={[2.8, 3.4, 40]} />
          <meshBasicMaterial color={tint} depthTest={false} transparent opacity={0.8} />
        </mesh>
        <mesh ref={pulse} renderOrder={10}>
          <ringGeometry args={[3.2, 3.7, 40]} />
          <meshBasicMaterial color={color} depthTest={false} transparent blending={AdditiveBlending} opacity={0} />
        </mesh>
      </Billboard>
      {(hovered || selected) && (
        <Tag at={[0, 9, 0]} picked={selected} color={color}>
          {label}
        </Tag>
      )}
    </group>
  );
};

const Part = ({ geometry, material, name, enabled = true, renderOrder }) => (
  <mesh
    geometry={geometry}
    material={material}
    userData={{ part: name }}
    renderOrder={renderOrder}
    raycast={enabled ? undefined : () => null}
  />
);

// Everything that swings with the jaw lives in `Lower`, so tags stay on it.
const Hinge = ({ hinge, open, children }) => {
  const swing = useRef();
  const angle = useRef(open * JAW_ANGLE);
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 7);
    angle.current += (open * JAW_ANGLE - angle.current) * k;
    if (swing.current) swing.current.rotation.x = angle.current;
  });
  return (
    <group position={[0, hinge.y, hinge.z]}>
      <group ref={swing}>
        <group position={[0, -hinge.y, -hinge.z]}>{children}</group>
      </group>
    </group>
  );
};

// The gums, bone and tongue of a growing jaw, scaled about `pivot`.
const Grow = ({ growth, pivot, children }) => {
  const back = useMemo(() => pivot.clone().negate(), [pivot]);
  if (!growth) return children;
  return (
    <group position={pivot} scale={growth}>
      <group position={back}>{children}</group>
    </group>
  );
};

// A copy of a tooth material that hides what lies below `plane`.
const withClipping = (material, plane) => {
  const m = material.clone();
  m.onBeforeCompile = material.onBeforeCompile;
  m.customProgramCacheKey = material.customProgramCacheKey;
  if (material.uniforms) m.uniforms = material.uniforms; // keep the shared tint
  m.clippingPlanes = [plane];
  m.side = DoubleSide; // a cut tooth shows its inside rather than a hole
  return m;
};

const TOOTH_UP = new Vector3(0, 1, 0);

// A tooth of the mouth at an age: only its formed part shows (a clipping
// plane in its own frame, at `tooth.clipY`), and a baby tooth being shed
// fades with `tooth.opacity`.
const AgedTooth = ({ tooth, geometry, material, pulpGeometry, pulpMaterial }) => {
  const mesh = useRef();
  const plane = useMemo(() => new Plane(), []);
  const own = useMemo(() => withClipping(material, plane), [material, plane]);
  const ownPulp = useMemo(() => pulpMaterial && withClipping(pulpMaterial, plane), [pulpMaterial, plane]);
  useEffect(() => () => own.dispose(), [own]);
  useEffect(() => () => ownPulp?.dispose(), [ownPulp]);
  useEffect(() => {
    if (own.isShaderMaterial) return;
    const fade = tooth.opacity < 1;
    if (own.transparent !== fade) {
      own.transparent = fade;
      own.needsUpdate = true;
    }
    own.opacity = tooth.opacity;
  }, [own, tooth.opacity]);
  useFrame(() => {
    if (!mesh.current) return;
    // Clipping planes live in the world, so follow the tooth as it moves.
    plane.set(TOOTH_UP, -Math.max(tooth.clipY, -1000)).applyMatrix4(mesh.current.matrixWorld);
  });
  return (
    <group position={tooth.position} quaternion={tooth.quaternion} scale={tooth.scale}>
      <mesh ref={mesh} geometry={geometry} material={own} userData={{ tooth: tooth.id }} />
      {ownPulp && <mesh geometry={pulpGeometry} material={ownPulp} renderOrder={6} raycast={() => null} />}
    </group>
  );
};

const LIGHT_RIG = (
  <Environment resolution={256} frames={1}>
    <Lightformer form="rect" intensity={2.6} position={[0, 7, 8]} scale={[16, 7, 1]} color="#FFF4EA" />
    <Lightformer form="rect" intensity={1.5} position={[-9, 1, 6]} rotation={[0, 1, 0]} scale={[7, 9, 1]} color="#DCEBFF" />
    <Lightformer form="rect" intensity={1.5} position={[9, 1, 6]} rotation={[0, -1, 0]} scale={[7, 9, 1]} color="#DCEBFF" />
    <Lightformer form="ring" intensity={1.1} position={[0, -7, 5]} scale={6} color="#FFD9D2" />
    <Lightformer form="rect" intensity={0.9} position={[0, 2, -10]} scale={[18, 8, 1]} color="#6FB7FF" />
  </Environment>
);

const Scene = ({
  mouth,
  teeth = [],
  chart = [],
  regions = [],
  onPickTooth,
  onPickSurface,
  onPickRegion,
  interactive,
  color,
  layer,
  arches,
  open,
  autoRotate,
  command,
  highlights = {},
  conditions = [],
  age = null,
  onView,
}) => {
  const controls = useRef();
  const materials = useMemo(createMouthMaterials, []);
  const toothMaterial = useToothMaterials();
  const [hover, setHover] = useState(null);
  const { parts, hinge } = mouth;
  // At an age the mouth shows the teeth there are, baby ones too, each
  // risen as far as it has erupted, in jaws that are still growing.
  const growth = useMemo(() => (age === null ? null : jawGrowth(age)), [age]);
  const pivot = useMemo(() => growthPivot(hinge), [hinge]);
  const shownTeeth = useMemo(() => {
    if (age === null) return mouth.teeth;
    const states = new Map(dentitionAtAge(age).map((r) => [r.id, r]));
    return [...mouth.teeth, ...primaryTeeth(mouth)]
      .map((t) => agedTooth(t, states.get(t.id), { age, growth, pivot }))
      .filter(Boolean);
  }, [mouth, age, growth, pivot]);
  const byId = useMemo(() => new Map(shownTeeth.map((t) => [t.id, t])), [shownTeeth]);
  const picked = useMemo(() => new Set(teeth), [teeth]);
  // Charted rows, plus conditions a lesson or the AI has put on the mouth.
  const rows = useMemo(() => {
    const map = new Map(chart.map((r) => [r.tooth, { ...r }]));
    conditions.forEach(({ tooth, condition, surfaces }) => {
      const row = map.get(tooth) || { tooth, surfaces: [], conditions: [] };
      map.set(tooth, {
        tooth,
        surfaces: [...new Set([...(row.surfaces || []), ...(surfaces || [])])],
        conditions: [...new Set([...(row.conditions || []), condition])],
        shown: true,
      });
    });
    return map;
  }, [chart, conditions]);
  const markedRegions = useMemo(() => new Set(regions), [regions]);
  const xray = layer === "xray";

  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);
  useEffect(() => {
    ["gumPicked", "bonePicked"].forEach((k) => materials[k].emissive.set(color));
    materials.xrayPicked.uniforms.uColor.value.set(color);
  }, [materials, color]);
  useEffect(() => {
    document.body.style.cursor = hover && interactive ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hover, interactive]);

  // The camera goes wherever was asked last: a preset, a site or the teeth.
  const [goal, setGoal] = useState(null);
  const angle = open * JAW_ANGLE;
  const focusKey = teeth.join(" ");
  useEffect(() => {
    if (command?.kind === "teeth") {
      const shown = command.teeth.map((id) => byId.get(id)).filter(Boolean);
      if (shown.length) setGoal(toothCamera(shown, hinge, angle));
      return;
    }
    if (command?.kind === "region") {
      const v = REGION_VIEWS[command.region];
      if (!v) return;
      setGoal({ position: new Vector3(...v.position), target: new Vector3(...v.target) });
      onView?.(v);
      return;
    }
    if (command?.kind === "view") {
      const v = VIEWS[command.view];
      if (v) setGoal({ position: new Vector3(...v.position), target: new Vector3(...v.target) });
      return;
    }
    if (command?.type === "focus") {
      const shown = teeth.map((id) => byId.get(id)).filter(Boolean);
      const v = REGION_VIEWS[regions[0]];
      if (shown.length) setGoal(toothCamera(shown, hinge, angle));
      else if (v) setGoal({ position: new Vector3(...v.position), target: new Vector3(...v.target) });
      return;
    }
    if (command?.type !== "view") return;
    const v = VIEWS[command.view];
    setGoal({ position: new Vector3(...v.position), target: new Vector3(...v.target) });
  }, [command]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const shown = teeth.map((id) => byId.get(id)).filter(Boolean);
    if (shown.length) setGoal(toothCamera(shown, hinge, angle));
  }, [focusKey, mouth]); // eslint-disable-line react-hooks/exhaustive-deps
  const regionKey = regions.join(" ");
  useEffect(() => {
    if (teeth.length || regions.length !== 1) return;
    const v = REGION_VIEWS[regions[0]];
    if (!v) return;
    setGoal({ position: new Vector3(...v.position), target: new Vector3(...v.target) });
    onView?.(v);
  }, [regionKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const hoverRegion = hover?.region;
  const glow = (part, region, base, lit, soft) => {
    if (region.some((r) => markedRegions.has(r))) return materials[lit];
    if (region.includes(hoverRegion)) return materials[soft];
    return materials[base];
  };

  const showGum = layer === "gums";
  const glass = layer === "roots";
  const showBone = layer === "gums" || layer === "bone";
  const showTongue = layer === "gums";

  const gumMaterial = (name, region) =>
    xray ? materials.xraySoft : glass ? materials.gumGlass : glow(name, region, "gum", "gumPicked", "gumHovered");
  const boneMaterial = (region) =>
    xray ? materials.xrayBone : glass ? materials.boneGlass : glow("bone", region, "bone", "bonePicked", "boneHovered");

  const onMove = (e) => {
    if (!interactive) return;
    e.stopPropagation();
    const { tooth, part } = e.object.userData;
    if (tooth) {
      const local = e.object.worldToLocal(e.point.clone());
      setHover({ tooth, surface: surfaceAt(local, byId.get(tooth).size), at: e.point.clone() });
      return;
    }
    const region = regionOfPart(part, e.object.worldToLocal(e.point.clone()), hinge);
    setHover(region ? { region, at: e.point.clone() } : null);
  };
  const onClick = (e) => {
    if (!interactive || e.delta > CLICK_SLOP) return;
    e.stopPropagation();
    const { tooth, part } = e.object.userData;
    if (tooth) {
      const surface = surfaceAt(e.object.worldToLocal(e.point.clone()), byId.get(tooth).size);
      if (picked.has(tooth) && surface) onPickSurface?.(tooth, surface);
      else onPickTooth?.(tooth);
      return;
    }
    const region = regionOfPart(part, e.object.worldToLocal(e.point.clone()), hinge);
    if (region) onPickRegion?.(region);
  };

  const renderTooth = (tooth) => {
    const row = rows.get(tooth.id);
    if (row?.conditions?.includes("missing")) return null;
    const lit = highlights[tooth.id];
    // A condition shown without surfaces lights the whole tooth in its colour.
    const whole = row?.shown && !row.surfaces.length && conditionById(row.conditions.at(-1))?.color;
    const isPicked = picked.has(tooth.id) || Boolean(lit) || Boolean(whole);
    const tint = lit || whole || color;
    const restoration = ["crown", "implant"].find((c) => row?.conditions?.includes(c));
    const material = xray
      ? materials[isPicked ? "xrayPicked" : "xrayTooth"]
      : toothMaterial({
          picked: isPicked,
          hovered: hover?.tooth === tooth.id,
          restoration,
          surfaces: surfaceTints(row, tint),
          accent: tint,
          size: tooth.size,
        });
    if (tooth.clipY !== undefined) {
      return (
        <AgedTooth
          key={tooth.id}
          tooth={tooth}
          geometry={parts[`${tooth.type}_outer`]}
          material={material}
          pulpGeometry={parts[`${tooth.type}_pulp`]}
          pulpMaterial={xray ? materials.xrayPulp : null}
        />
      );
    }
    return (
      <group key={tooth.id} position={tooth.position} quaternion={tooth.quaternion} scale={tooth.scale}>
        <mesh geometry={parts[`${tooth.type}_outer`]} material={material} userData={{ tooth: tooth.id }} />
        {xray && (
          <mesh geometry={parts[`${tooth.type}_pulp`]} material={materials.xrayPulp} renderOrder={6} raycast={() => null} />
        )}
      </group>
    );
  };

  const tagAt = (id, offset = 0) => {
    const tooth = byId.get(id);
    if (!tooth) return null;
    const h = tooth.size.h;
    return new Vector3(0, h + 3 + offset, 0).applyMatrix4(tooth.matrix).toArray();
  };

  const hoverTooth = hover?.tooth && toothById(hover.tooth);
  const tagOf = (id) => {
    const tooth = toothById(id);
    const row = rows.get(id);
    const findings = row?.conditions?.map((c) => conditionById(c)?.label).filter(Boolean);
    return findings?.length ? `${tooth.id} · ${findings.join(", ")}` : tooth.id;
  };

  const tagged = [...new Set([...picked, ...Object.keys(highlights)])];
  const tmj = (x) => (growth ? grownPoint([x, hinge.y, hinge.z], growth, pivot) : [x, hinge.y, hinge.z]);
  const lowerTags = tagged.filter((id) => byId.get(id)?.jaw === "lower");
  const upperTags = tagged.filter((id) => byId.get(id)?.jaw === "upper");

  return (
    <>
      <ambientLight intensity={xray ? 0.2 : 0.42} />
      <hemisphereLight args={["#FFF5EC", "#3A1E2B", 0.62]} />
      <directionalLight position={[60, 120, 220]} intensity={1.15} color="#FFF8F0" />
      <directionalLight position={[-160, 30, 140]} intensity={0.5} color="#CFE2FF" />
      <directionalLight position={[0, -120, 120]} intensity={0.42} color="#FFD7D0" />
      {LIGHT_RIG}

      <group onPointerMove={onMove} onPointerOut={() => setHover(null)} onClick={onClick}>
        {arches !== "lower" && (
          <group>
            <Grow growth={growth} pivot={pivot}>
              {(showBone || glass || xray) && (
                <Part
                  geometry={parts.maxilla}
                  name="maxilla"
                  enabled={layer === "bone"}
                  material={boneMaterial(["maxilla"])}
                  renderOrder={glass || xray ? 3 : undefined}
                />
              )}
              {(showGum || glass || xray) && (
                <Part
                  geometry={parts.gum_upper}
                  name="gum_upper"
                  enabled={showGum}
                  material={gumMaterial("gum_upper", ["gingiva_upper", "palate"])}
                  renderOrder={glass || xray ? 4 : undefined}
                />
              )}
            </Grow>
            {shownTeeth.filter((t) => t.jaw === "upper").map(renderTooth)}
            {upperTags.map((id) => (
              <Tag key={id} at={tagAt(id)} picked color={highlights[id] || color}>
                {tagOf(id)}
              </Tag>
            ))}
          </group>
        )}
        {arches !== "upper" && (
          <Hinge hinge={hinge} open={open}>
            <Grow growth={growth} pivot={pivot}>
              {(showBone || glass || xray) && (
                <Part
                  geometry={parts.mandible}
                  name="mandible"
                  enabled={layer === "bone"}
                  material={boneMaterial(["mandible", "tmj_right", "tmj_left"])}
                  renderOrder={glass || xray ? 3 : undefined}
                />
              )}
              {(showGum || glass || xray) && (
                <Part
                  geometry={parts.gum_lower}
                  name="gum_lower"
                  enabled={showGum}
                  material={gumMaterial("gum_lower", ["gingiva_lower", "floor_of_mouth"])}
                  renderOrder={glass || xray ? 4 : undefined}
                />
              )}
              {showTongue && (
                <Part
                  geometry={parts.tongue}
                  name="tongue"
                  material={markedRegions.has("tongue") ? materials.gumPicked : hoverRegion === "tongue" ? materials.gumHovered : materials.tongue}
                />
              )}
            </Grow>
            {shownTeeth.filter((t) => t.jaw === "lower").map(renderTooth)}
            {lowerTags.map((id) => (
              <Tag key={id} at={tagAt(id)} picked color={highlights[id] || color}>
                {tagOf(id)}
              </Tag>
            ))}
            {(interactive || markedRegions.has("tmj_right")) && (
              <Marker
                at={tmj(-hinge.x)}
                color={color}
                selected={markedRegions.has("tmj_right")}
                label={dentalRegionById("tmj_right").label}
                onSelect={interactive ? () => onPickRegion?.("tmj_right") : undefined}
              />
            )}
            {(interactive || markedRegions.has("tmj_left")) && (
              <Marker
                at={tmj(hinge.x)}
                color={color}
                selected={markedRegions.has("tmj_left")}
                label={dentalRegionById("tmj_left").label}
                onSelect={interactive ? () => onPickRegion?.("tmj_left") : undefined}
              />
            )}
          </Hinge>
        )}
      </group>

      {hover?.at && (hoverTooth || hover.region) && (
        <Tag at={hover.at.toArray()}>
          {hoverTooth
            ? `${hoverTooth.id} · ${hoverTooth.label}${
                hover.surface && picked.has(hover.tooth) ? ` · ${surfaceName(hoverTooth, hover.surface)}` : ""
              }`
            : dentalRegionById(hover.region)?.label}
        </Tag>
      )}

      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        minDistance={46}
        maxDistance={420}
        autoRotate={autoRotate}
        autoRotateSpeed={0.8}
        target={VIEWS.front.target}
      />
      <CameraRig goal={goal} controls={controls} />
    </>
  );
};

// Waits for the model; `onReady` lets the stage drop its loading state.
const Mouth = ({ onFail, ...props }) => {
  const [mouth, setMouth] = useState(null);
  useEffect(() => {
    let live = true;
    loadDentition().then(
      (m) => live && setMouth(m),
      () => live && onFail?.(),
    );
    return () => {
      live = false;
    };
  }, [onFail]);
  if (!mouth) {
    return (
      <Html center>
        <span className="flex items-center gap-2 whitespace-nowrap text-sm font-bold text-white/70">
          <span className="h-5 w-5 animate-orbit rounded-full border-2 border-white/15 border-t-sky" />
          Building the mouth
        </span>
      </Html>
    );
  }
  return <Scene mouth={mouth} {...props} />;
};

// The 3D stage. `interactive` adds picking of teeth, surfaces and sites;
// without it they are only shown, tinted with `color`.
const DentalScene = (props) => (
  <Canvas
    dpr={[1, 2]}
    camera={{ position: VIEWS.front.position, fov: 28, near: 4, far: 1600 }}
    gl={{ antialias: true, alpha: true }}
    onCreated={({ gl }) => {
      // Growing teeth hide their unformed part with clipping planes.
      gl.localClippingEnabled = true;
    }}
  >
    <Mouth {...props} />
  </Canvas>
);

export default DentalScene;
