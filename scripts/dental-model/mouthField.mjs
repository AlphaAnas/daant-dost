// Sets the teeth along the two arches and builds the fields of everything
// around them: gums, palate and floor of the mouth, maxilla, mandible and
// tongue. World units are mm: +x the patient's left, +y up, +z forward, and
// y = 0 the occlusal plane. Fields here are symmetric, so x is taken as |x|
// and only the left teeth (FDI quadrants 2 and 3) are evaluated.

import { ARCH, TOOTH_TYPES } from "./anatomy.mjs";
import { clamp, lerp, smax, smin, smooth, toothField } from "./toothField.mjs";

const FIELDS = Object.fromEntries(
  Object.entries(TOOTH_TYPES).map(([id, type]) => [id, toothField(type)]),
);
export const fieldOf = (id) => FIELDS[id];

const RAD = Math.PI / 180;
const CONTACT = 0.12; // How far neighbouring crowns overlap at their contact.

// The arch as a curve from the midline, by the direction it heads at each
// arc length; `step` is the spacing of the samples.
const buildCurve = ({ front, reach, turn, sharp, length, step = 0.25 }) => {
  const points = [];
  let x = 0;
  let z = front;
  for (let s = 0; s <= length; s += step) {
    const heading = turn * (1 - Math.exp(-((s / reach) ** sharp)));
    points.push({ s, x, z, cos: Math.cos(heading), sin: Math.sin(heading) });
    x += Math.cos(heading) * step;
    z -= Math.sin(heading) * step;
  }
  return { points, step };
};

const curveAt = (curve, s) => curve.points[clamp(Math.round(s / curve.step), 0, curve.points.length - 1)];

const multiply = (a, b) =>
  a.map((row) => [0, 1, 2].map((c) => row[0] * b[0][c] + row[1] * b[1][c] + row[2] * b[2][c]));

const rotationX = (r) => [[1, 0, 0], [0, Math.cos(r), -Math.sin(r)], [0, Math.sin(r), Math.cos(r)]];
const rotationZ = (r) => [[Math.cos(r), -Math.sin(r), 0], [Math.sin(r), Math.cos(r), 0], [0, 0, 1]];

const placeTeeth = (jaw, curve, occlusal) =>
  ARCH[jaw].reduce((teeth, spec, i) => {
    const field = FIELDS[spec.type];
    const type = TOOTH_TYPES[spec.type];
    const start = i ? teeth[i - 1].end : 0;
    const s = start + type.md / 2;
    const p = curveAt(curve, s);
    const sign = jaw === "upper" ? -1 : 1;
    // Columns: distal, towards the crown of a lower tooth, buccal.
    const frame = [
      [p.cos, 0, p.sin],
      [0, 1, 0],
      [-p.sin, 0, p.cos],
    ];
    const rotation = multiply(
      multiply(frame, rotationZ(sign * spec.tip * RAD)),
      rotationX(sign * spec.torque * RAD),
    );
    const y = occlusal(s) + (jaw === "upper" ? type.crown : -type.crown);
    teeth.push({
      fdi: (jaw === "upper" ? 20 : 30) + i + 1,
      id: spec.type,
      field,
      type,
      s,
      end: s + type.md / 2 - CONTACT,
      flip: sign,
      rotation,
      center: [p.x, y, p.z],
      // A sphere around the whole tooth, to skip it cheaply.
      middle: [p.x, y + (jaw === "upper" ? 1 : -1) * ((type.root - type.crown) / 2), p.z],
      reach: (type.root + type.crown) / 2 + 4,
    });
    return teeth;
  }, []);

const JAWS = {};

const buildJaw = (name, config) => {
  const curve = buildCurve(config);
  const occlusal = (s) => config.level - 1.5 * Math.sin(Math.PI * clamp(s / 62));
  const teeth = placeTeeth(name, curve, occlusal);
  const last = teeth.at(-1);
  // Nearest point of the curve for every (x, z), for fast lookups.
  const CELL = 0.5;
  const columns = 170;
  const rows = 320;
  const table = new Int32Array(columns * rows);
  const { points } = curve;
  for (let r = 0; r < rows; r += 1) {
    const z = 110 - r * CELL;
    for (let c = 0; c < columns; c += 1) {
      const x = c * CELL;
      let best = 0;
      let bestD = Infinity;
      for (let p = 0; p < points.length; p += 2) {
        const d = (points[p].x - x) ** 2 + (points[p].z - z) ** 2;
        if (d < bestD) {
          bestD = d;
          best = p;
        }
      }
      table[c + columns * r] = best;
    }
  }
  const across = (x, z) => {
    const c = clamp(Math.round(x / CELL), 0, columns - 1);
    const r = clamp(Math.round((110 - z) / CELL), 0, rows - 1);
    const p = points[table[c + columns * r]];
    return {
      s: p.s + (x - p.x) * p.cos - (z - p.z) * p.sin,
      rho: (x - p.x) * p.sin + (z - p.z) * p.cos,
    };
  };
  // Crown height and depth of the teeth at an arc length, running smoothly
  // from tooth to tooth so the gums do not step between them.
  const profile = (s) => {
    const next = teeth.findIndex((t) => t.s >= s);
    if (next === 0) return { crown: teeth[0].type.crown, bl: teeth[0].type.bl };
    if (next < 0) return { crown: last.type.crown, bl: last.type.bl };
    const a = teeth[next - 1];
    const b = teeth[next];
    const t = smooth(a.s, b.s, s);
    return { crown: lerp(a.type.crown, b.type.crown, t), bl: lerp(a.type.bl, b.type.bl, t) };
  };
  const sign = name === "upper" ? 1 : -1;
  const crest = (s) => occlusal(s) + sign * (profile(s).crown + 2.1);
  // Distance from the midline to the inside of the arch, by z. Measured this
  // way the palate has no crease where the two sides of the arch meet.
  const front = points[0].z;
  const insideAt = (z) => {
    if (z >= front) return { s: 0, inner: 0 };
    const i = points.findIndex((p) => p.z <= z);
    const p = points[i < 0 ? points.length - 1 : i];
    return { s: p.s, inner: Math.max(p.x - profile(p.s).bl / 2 - 1.6, 0.5) };
  };
  const insideTable = Float32Array.from({ length: 260 }, (_, i) => insideAt(70 - i * 0.5).inner);
  const sTable = Float32Array.from({ length: 260 }, (_, i) => insideAt(70 - i * 0.5).s);
  const lookup = (table2, z) => {
    const f = clamp((70 - z) / 0.5, 0, 258);
    const i = Math.floor(f);
    return lerp(table2[i], table2[i + 1], f - i);
  };
  // Where neighbouring teeth touch, each with the gum papilla below it.
  const contacts = [
    { s: 0, tooth: teeth[0] },
    ...teeth.slice(0, -1).map((t, i) => ({ s: t.end, tooth: teeth[i + 1] })),
  ];
  JAWS[name] = {
    curve,
    teeth,
    occlusal,
    across,
    profile,
    crest,
    sign,
    last,
    end: last.end,
    front,
    contacts,
    inner: (z) => lookup(insideTable, z),
    sAt: (z) => lookup(sTable, z),
  };
};

buildJaw("upper", { front: 48, reach: 23.2, turn: 1.4, sharp: 1.75, length: 112, level: -0.7 });
buildJaw("lower", { front: 44.2, reach: 19.6, turn: 1.43, sharp: 1.8, length: 112, level: 0.6 });

export const jawOf = (name) => JAWS[name];

export const toLocal = (tooth, x, y, z) => {
  const [cx, cy, cz] = tooth.center;
  const dx = x - cx;
  const dy = y - cy;
  const dz = z - cz;
  const r = tooth.rotation;
  return [
    r[0][0] * dx + r[1][0] * dy + r[2][0] * dz,
    (r[0][1] * dx + r[1][1] * dy + r[2][1] * dz) * tooth.flip,
    r[0][2] * dx + r[1][2] * dy + r[2][2] * dz,
  ];
};

export const toWorld = (tooth, lx, ly, lz) => {
  const [cx, cy, cz] = tooth.center;
  const y = ly * tooth.flip;
  const r = tooth.rotation;
  return [
    r[0][0] * lx + r[0][1] * y + r[0][2] * lz + cx,
    r[1][0] * lx + r[1][1] * y + r[1][2] * lz + cy,
    r[2][0] * lx + r[2][1] * y + r[2][2] * lz + cz,
  ];
};

const FAR = 30;
const near = (tooth, x, y, z, margin) => {
  const d = Math.hypot(x - tooth.middle[0], y - tooth.middle[1], z - tooth.middle[2]);
  return d < tooth.reach + margin;
};

/** Distance to the nearest tooth of a jaw; `skip` leaves one tooth out. */
export const teethField = (jaw, x, y, z, skip) => {
  let d = FAR;
  const ax = Math.abs(x);
  for (const tooth of jaw.teeth) {
    if (tooth === skip || !near(tooth, ax, y, z, 4)) continue;
    const [lx, ly, lz] = toLocal(tooth, ax, y, z);
    d = Math.min(d, tooth.field.outer(lx, ly, lz));
  }
  return d;
};

// A tooth inflated by `inflate` and cut off at its gum (or bone) line, which
// rises between the teeth as the papillae and interdental septa.
const cuffs = (jaw, x, y, z, inflate, drop) => {
  let d = FAR;
  for (const tooth of jaw.teeth) {
    if (!near(tooth, x, y, z, inflate + 5)) continue;
    const [lx, ly, lz] = toLocal(tooth, x, y, z);
    const u = clamp(Math.abs(lx) / tooth.field.a0, 0, 1.35);
    const line = 1 - drop + (tooth.type.cej + 1.15) * smooth(0.45, 1.25, u) ** 1.2;
    d = smin(d, smax(tooth.field.outer(lx, ly, lz) - inflate, ly - line, 1.1), 1.6);
  }
  return d;
};

// The interdental papillae: a soft pyramid under each contact point.
const papillae = (jaw, s, rho, y) => {
  let d = FAR;
  for (const contact of jaw.contacts) {
    const along = Math.abs(s - contact.s);
    if (along > 5) continue;
    const { type } = contact.tooth;
    const height = 2.1 + type.cej + 1.5;
    const up = (jaw.crest(contact.s) - y) * jaw.sign;
    if (up < -3) continue;
    const shape = along / 2.7 + Math.abs(rho) / (type.bl * 0.46) + Math.max(up, 0) / height - 1;
    d = Math.min(d, shape * 1.7);
  }
  return d;
};

const roundedRect = (px, py, cx, cy, hx, hy, r) => {
  const qx = Math.abs(px - cx) - hx + r;
  const qy = Math.abs(py - cy) - hy + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};

const ripple = (x, y, z) =>
  Math.sin(x * 0.31 + y * 0.17) * Math.sin(z * 0.27 - y * 0.23) * Math.sin(y * 0.41 + x * 0.13);

// Gums of the lower jaw, with the floor of the mouth behind them.
const lowerGum = (x0, y, z) => {
  const jaw = JAWS.lower;
  const x = Math.abs(x0);
  const { s, rho } = jaw.across(x, z);
  const crest = jaw.crest(s);
  const tail = smooth(jaw.end - 2, jaw.end + 13, s);
  const half = lerp(jaw.profile(s).bl / 2 + 2.3, 4.4, tail);
  let d = roundedRect(rho, y, -0.2, crest - 7.2 - tail * 1.2, half, 8.2, 3.1);
  const q = Math.min(x / (jaw.inner(z) + 3.5), 1);
  const floorTop = jaw.crest(jaw.sAt(z)) - 7.6 - 3 * (1 - q * q) + 0.7 * Math.exp(-((x / 1.5) ** 2));
  const floor = smax(smax(y - floorTop, floorTop - 4.5 - y, 1), rho + 2, 2);
  d = smin(d, floor, 3.6);
  d = smin(d, cuffs(jaw, x, y, z, 1.55, 0.25), 1.5);
  d = smin(d, papillae(jaw, s, rho, y), 1.1);
  d = smax(d, jaw.last.center[2] - jaw.last.type.md - 11 - z, 3);
  return smax(d, -(teethField(jaw, x, y, z) - 0.05), 0.22);
};

// The roof of the mouth: a dome between the teeth, with rugae and a raphe.
const vault = (jaw, x, z) => {
  const q = Math.min(x / (jaw.inner(z) + 3.5), 1);
  const back = jaw.front - z;
  let y = jaw.crest(jaw.sAt(z)) + 0.3 + 13 * (1 - q * q) ** 0.72 * smooth(0, 17, back + 3);
  const nearMiddle = Math.exp(-((x / 12) ** 2));
  y -= 0.72 * Math.sin(back * 0.8 + x * x * 0.012) ** 2 * nearMiddle * (1 - smooth(11, 25, back)) * smooth(4, 9, back);
  y -= 0.5 * Math.exp(-((x / 0.95) ** 2)) * smooth(4, 12, back);
  y -= 1.4 * Math.exp(-((x / 3.2) ** 2 + ((back - 8.6) / 3.4) ** 2));
  return y;
};

const upperGum = (x0, y, z) => {
  const jaw = JAWS.upper;
  const x = Math.abs(x0);
  const { s, rho } = jaw.across(x, z);
  const crest = jaw.crest(s);
  const tail = smooth(jaw.end - 2, jaw.end + 11, s);
  const half = lerp(jaw.profile(s).bl / 2 + 2.4, 5.8, tail);
  let d = roundedRect(rho, y, -0.1, crest + 6.8 + tail, half, 8, 3.2);
  const top = vault(jaw, x, z);
  const palate = smax(smax(top - y, y - top - 3.4, 0.9), rho + 1.6, 3);
  d = smin(d, palate, 2.6);
  d = smin(d, cuffs(jaw, x, y, z, 1.55, 0.25), 1.5);
  d = smin(d, papillae(jaw, s, rho, y), 1.1);
  d = smax(d, jaw.last.center[2] - jaw.last.type.md - 9.4 - z, 3);
  return smax(d, -(teethField(jaw, x, y, z) - 0.05), 0.22);
};

const polygon = (px, py, points) => {
  let d = Infinity;
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const [ax, ay] = points[i];
    const [bx, by] = points[j];
    const ex = bx - ax;
    const ey = by - ay;
    const t = clamp(((px - ax) * ex + (py - ay) * ey) / (ex * ex + ey * ey));
    d = Math.min(d, Math.hypot(px - ax - ex * t, py - ay - ey * t));
    if (ay > py !== by > py && px < (ex * (py - ay)) / ey + ax) inside = !inside;
  }
  return inside ? -d : d;
};

// The mandible: body, chin, ramus, coronoid process and condyle.
const zBack = () => JAWS.lower.last.center[2];
export const condyle = () => {
  const c = zBack() - 34;
  return { x: 46, y: 27, z: c };
};

const mandible = (x0, y, z) => {
  const jaw = JAWS.lower;
  const x = Math.abs(x0);
  const { s, rho } = jaw.across(x, z);
  const crest = jaw.crest(s);
  const chin = 1 - smooth(0, 16, s);
  const half = jaw.profile(s).bl / 2 + lerp(1.5, 2.1, chin);
  const low = -31 - 2.6 * chin + 3.4 * smooth(26, 70, s);
  const top = crest - 1.6;
  const mid = (top + low) / 2;
  const lean = 1.6 * smooth(top, low, y) * (1 - chin) - 2.7 * chin * smooth(mid + 3, low + 1, y);
  let d = roundedRect(rho, y, -0.4 + lean, mid, half + 0.8 * smooth(mid, low, y), (top - low) / 2, 4.2);
  d = smax(d, s - jaw.end - 12, 8);
  d = smin(d, cuffs(jaw, x, y, z, 1.1, 2.3), 1.1);
  const back = zBack();
  const flare = lerp(37.5, 45.5, smooth(-24, 24, y));
  const plate = polygon(z, y, [
    [back + 12, -12],
    [back + 2, 4],
    [back - 8, 25],
    [back - 13, 26],
    [back - 18, 14],
    [back - 24, 11],
    [back - 30, 16],
    [back - 31, 22],
    [back - 36, 23],
    [back - 40, 6],
    [back - 43, -18],
    [back - 37, -29],
    [back - 16, -30],
  ]);
  const ramus = smax(plate + 1.8, Math.abs(x - flare) - 2.9, 2.2);
  d = smin(d, ramus, 6);
  const c = condyle();
  const head = Math.hypot((x - c.x) / 9.8, (y - c.y) / 5, (z - c.z) / 6) - 1;
  d = smin(d, head * 5, 2.4);
  const eminence = Math.exp(-((x - 44) ** 2 / 90 + (y + 22) ** 2 / 90 + (z - back + 34) ** 2 / 120));
  d -= 0.35 * eminence * ripple(x, y, z);
  d = smax(d, -(teethField(jaw, x, y, z) - 0.32), 0.25);
  return d + 0.1 * ripple(x * 2, y * 2, z * 2);
};

// The maxilla, trimmed above the nasal floor.
const maxilla = (x0, y, z) => {
  const jaw = JAWS.upper;
  const x = Math.abs(x0);
  const { s, rho } = jaw.across(x, z);
  const crest = jaw.crest(s);
  const half = jaw.profile(s).bl / 2 + 1.5;
  const top = 33;
  const bottom = crest + 1.5;
  let d = roundedRect(rho, y, -0.6 - (half * smooth(bottom + 2, top, y)) / 3.4, (top + bottom) / 2, half + 2 * smooth(bottom, top, y), (top - bottom) / 2, 3.2);
  const inner = vault(jaw, x, z) + 1.1;
  const fill = smax(smax(inner - y, y - top, 3.5), rho - 0.6, 3);
  d = smin(d, fill, 3);
  // Inside the arch the bone stays above the palate, so it cannot show through.
  d = smax(d, inner - y - Math.max(rho + 4, 0) * 2.5, 1.2);
  d = smin(d, cuffs(jaw, x, y, z, 1.1, 2.3), 1.1);
  d = smax(d, jaw.last.center[2] - jaw.last.type.md - 7 - z, 5);
  const notch = Math.hypot(x / 12.5, (y - 37) / 15.5, (z - 53) / 17) - 1;
  d = smax(d, -notch * 11, 2.8);
  const spine = Math.hypot(x / 1.3, (y - 28) / 2.6, (z - 50.5) / 2.6) - 1;
  d = smin(d, spine * 1.3, 1.6);
  const buttress = Math.hypot(x - 28 - (y - 18) * 0.42, (y - 26) / 1.8, (z - 21) / 1.5) - 5.4;
  d = smin(d, smax(buttress, y - top, 3), 6);
  d = smax(d, -(teethField(jaw, x, y, z) - 0.32), 0.25);
  return d + 0.1 * ripple(x * 2, y * 2, z * 2);
};

// A muscular dome, narrowing to the tip, with a groove down the middle.
const tongue = (x0, y, z) => {
  const x = Math.abs(x0);
  const tip = 33.5;
  const along = clamp((tip - z) / 46);
  const halfWidth = 20 * (1 - (1 - along) ** 3) + 1.5;
  const across = Math.min(x / halfWidth, 1);
  const dome = Math.sqrt(1 - across * across);
  const rise = 7.4 * Math.sqrt(smooth(0, 0.34, along)) + 0.6;
  const base = -13.4 - 0.5 * along;
  const sulcus = 1 * Math.exp(-((x / 1.7) ** 2)) * smooth(0.05, 0.3, along) * (1 - smooth(0.7, 1, along));
  const surface = base + 3.2 * Math.sqrt(smooth(0, 0.2, along)) + rise * dome ** 0.9 - sulcus;
  const body = smax(y - surface, base - 3 - y, 1.8);
  const side = smax(x - halfWidth, z - tip, 2.6);
  return smax(body, smax(side, -15 - z, 3), 1.8);
};

export const FIELDS_AROUND = {
  lowerGum,
  upperGum,
  mandible,
  maxilla,
  tongue,
};

export const gumColor = (name, x0, y, z) => {
  const jaw = JAWS[name];
  const x = Math.abs(x0);
  const { rho } = jaw.across(x, z);
  const margin = clamp(teethField(jaw, x, y, z) / 7);
  const inside = rho < -6;
  const speck = Math.sin(x * 2.1 + z * 1.3) * Math.sin(z * 2.6 - y * 1.7) * Math.sin(y * 1.9 + x * 0.9);
  const vessel = Math.sin(y * 0.8 + 4 * Math.sin(x * 0.2 + z * 0.17)) ** 8;
  // Attached gingiva is paler and coral; the lining mucosa redder.
  const attached = [0.87, 0.5, 0.5];
  const lining = [0.72, 0.24, 0.27];
  const palate = [0.84, 0.5, 0.49];
  const base = inside && name === "upper" ? palate : inside ? [0.68, 0.23, 0.26] : attached;
  const mix = inside ? 0.25 : smooth(0.22, 0.72, margin);
  const c = [0, 1, 2].map((i) => lerp(base[i], lining[i], mix));
  const edge = 1 - smooth(0.02, 0.12, margin);
  return c.map((v, i) => {
    const pale = lerp(v, [0.95, 0.66, 0.64][i], edge * 0.55);
    const streak = pale * (1 - vessel * mix * 0.06 * (i ? 1.4 : 0.4));
    return streak * (1 + speck * 0.022);
  });
};

export const boneColor = (x, y, z) => {
  const grain = ripple(x * 1.7, y * 1.7, z * 1.7);
  const shade = 1 + grain * 0.05;
  return [0.82 * shade, 0.75 * shade, 0.62 * shade];
};

export const tongueColor = (x0, y, z) => {
  const x = Math.abs(x0);
  const fine = Math.sin(x * 3.1 + z * 2.3) * Math.sin(z * 3.7 - x * 1.9);
  const coarse = Math.sin(x * 1.1 + z * 1.2) * Math.sin(z * 1.4 - x * 0.7);
  const papilla = smooth(0.62, 0.95, fine);
  const c = [0.77, 0.32, 0.34];
  const top = smooth(-12, -8, y);
  return c.map((v, i) => {
    const lit = v * (1 + coarse * 0.05);
    return lerp(lit * 0.92, lit + [0.13, 0.17, 0.15][i] * papilla, top);
  });
};

// Enamel shades from warm at the neck to cool and translucent at the edge;
// roots are the yellower dentin showing through the cementum.
export const toothColor = (tooth, lx, ly, lz) => {
  const { field, type } = tooth;
  const line = field.cejY(lx);
  const enamel = smooth(line - 0.25, line + 0.25, ly);
  const t = clamp(ly / field.H);
  const neck = [0.87, 0.75, 0.57];
  const body = [0.95, 0.91, 0.82];
  const edge = [0.86, 0.9, 0.92];
  const front = type.kind === "incisor" ? 0.65 : type.kind === "canine" ? 0.3 : 0.1;
  const crown = [0, 1, 2].map((i) =>
    lerp(lerp(neck[i], body[i], smooth(0.02, 0.38, t)), edge[i], smooth(0.74, 1, t) * front),
  );
  const a = clamp(-ly / type.root);
  const root = [0.84, 0.71, 0.5].map((v) => v * lerp(1, 0.84, a));
  return [0, 1, 2].map((i) => lerp(root[i], crown[i], enamel) * type.tint[i]);
};
