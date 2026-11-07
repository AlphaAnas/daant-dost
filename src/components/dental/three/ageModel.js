import { Matrix4, Vector3 } from "three";
import { TOOTH_TIMING } from "../../../shared/chronology";

// The mouth at an age: baby teeth, eruption, growing roots, shedding and jaw
// growth, on top of the adult model from loadDentition.

const clamp01 = (v) => Math.min(1, Math.max(0, v));

// Baby teeth reuse adult meshes, scaled in the tooth's own frame
// (x mesio-distal, y along the tooth, z bucco-lingual). A hackathon shortcut
// until real baby shapes are baked.
const PRIMARY_SHAPES = [
  { from: 1, scale: [0.75, 0.7, 0.75] }, // A, central incisor
  { from: 2, scale: [0.78, 0.7, 0.78] }, // B, lateral incisor
  { from: 3, scale: [0.82, 0.68, 0.82] }, // C, canine
  { from: 4, scale: [1.0, 0.7, 0.8] }, // D, first molar: a premolar made wider
  { from: 6, scale: [0.78, 0.72, 0.78] }, // E, second molar: a small first molar
];
const CONTACT_GAP = 0.15; // mm between neighbouring baby teeth

const UP = new Vector3(0, 1, 0);

// Point and turn at arc length `s` along a quadrant's arch, which runs from
// the midline through the adult tooth centres.
const alongArch = (stops, s) => {
  for (let i = 1; i < stops.length; i += 1) {
    const a = stops[i - 1];
    const b = stops[i];
    if (s <= b.s || i === stops.length - 1) {
      const k = clamp01((s - a.s) / (b.s - a.s));
      return {
        position: a.position.clone().lerp(b.position, k),
        quaternion: a.quaternion.clone().slerp(b.quaternion, k),
      };
    }
  }
  return null;
};

const buildPrimary = (mouth) => {
  const byId = new Map(mouth.teeth.map((t) => [t.id, t]));
  const out = [];
  [1, 2, 3, 4].forEach((q) => {
    const adult = [1, 2, 3, 4, 5, 6, 7, 8].map((p) => byId.get(`${q}${p}`));
    if (adult.some((t) => !t)) return;
    const first = adult[0];
    const midline = first.position.clone().setX(0);
    const stops = [{ s: 0, position: midline, quaternion: first.quaternion }];
    adult.forEach((t, i) => {
      const prev = i ? adult[i - 1].position : midline;
      stops.push({ s: stops[i].s + prev.distanceTo(t.position), position: t.position, quaternion: t.quaternion });
    });
    let s = 0;
    PRIMARY_SHAPES.forEach((shape, i) => {
      const source = adult[shape.from - 1];
      const [sx, sy, sz] = shape.scale;
      const width = 2 * source.size.a * sx;
      const at = alongArch(stops, s + width / 2);
      s += width + CONTACT_GAP;
      const scale = source.scale.clone().multiply(new Vector3(sx, sy, sz));
      const matrix = new Matrix4().compose(at.position, at.quaternion, scale);
      out.push({
        id: `${q + 4}${i + 1}`,
        type: source.type,
        jaw: source.jaw,
        right: source.right,
        primary: true,
        // In the mesh's own frame, as for adult teeth, so surface picking
        // and the surface shader keep working on the scaled mesh.
        size: source.size,
        matrix,
        position: at.position,
        quaternion: at.quaternion,
        scale,
      });
    });
  });
  return out;
};

const cache = new WeakMap();

// The 20 baby teeth (FDI 51-85), built once per loaded mouth.
export const primaryTeeth = (mouth) => {
  if (!cache.has(mouth)) cache.set(mouth, buildPrimary(mouth));
  return cache.get(mouth);
};

// The jaws grow from about 82% of adult size at 3 to full size at 18: in
// width and depth fully, in height less, so that teeth (which keep their adult
// size) do not run into the opposite jaw.
const VERTICAL = 0.4;
export const jawGrowth = (age) => {
  const s = 0.82 + 0.18 * clamp01((age - 3) / 15);
  return new Vector3(s, 1 - (1 - s) * VERTICAL, s);
};

// The jaws grow forwards from the jaw joints, about the biting plane.
export const growthPivot = (hinge) => new Vector3(0, 0, hinge.z);

const SHED_YEARS = 0.3;
const ERUPTION_DEPTH = 4; // mm below the crown height a tooth starts at

/**
 * Where and how a tooth shows at an age, or null when it is not in the mouth.
 * `state` is its row from dentitionAtAge; `growth` and `pivot` come from
 * jawGrowth and growthPivot. Returns the tooth with its
 * position, quaternion, scale and matrix moved, plus `clipY` (the lowest
 * point of the formed tooth in its own frame, -Infinity when whole) and
 * `opacity` (below 1 while a baby tooth is being shed).
 */
export const agedTooth = (tooth, state, { age, growth, pivot }) => {
  if (!state?.present) return null;
  const axis = UP.clone().transformDirection(tooth.matrix); // towards the crown tip
  const crown = tooth.size.h * Math.abs(tooth.scale.y);
  const sink = (1 - state.eruption) * (crown + ERUPTION_DEPTH);
  const fallsOut = TOOTH_TIMING[tooth.id]?.fallsOut;
  const keep = fallsOut == null ? 1 : clamp01((fallsOut - age) / SHED_YEARS);
  const lift = (1 - keep) * 3; // loosens out of its socket as it fades
  const position = pivot
    .clone()
    .add(tooth.position.clone().sub(pivot).multiply(growth))
    .addScaledVector(axis, lift - sink);
  const scale = tooth.scale.clone().multiplyScalar(0.75 + 0.25 * keep);
  const matrix = new Matrix4().compose(position, tooth.quaternion, scale);
  const root = state.rootFormed * (1 - state.resorption);
  const whole = state.crownFormed >= 1 && root >= 1;
  return {
    ...tooth,
    position,
    scale,
    matrix,
    clipY: whole ? -Infinity : tooth.size.h * (1 - state.crownFormed) - tooth.size.root * root,
    opacity: keep,
  };
};

// Scales a jaw-side point (a marker, say) with the growing jaw.
export const grownPoint = (point, growth, pivot) =>
  pivot.clone().add(new Vector3(...point).sub(pivot).multiply(growth)).toArray();
