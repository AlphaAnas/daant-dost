// Measurements of the adult permanent dentition, in millimetres, used by
// bake.mjs. Mean crown and root dimensions follow Wheeler's tables; the cusp
// layouts follow standard tooth morphology.
//
// Every tooth is described in its own frame: +x distal, +y occlusal and +z
// buccal, with the cement-enamel junction at y = 0. `u` and `v` below are x
// and z as a fraction of the half-width and half-depth of the crown.
//
// A cusp is [u, v, height, spreadU, spreadV]; a ridge or a groove is
// [u1, v1, u2, v2, amount, width (mm)].

const single = (ra, rb, extra = {}) => [{ cx: 0, cz: 0, ra, rb, len: 1, ...extra }];

export const TOOTH_TYPES = {
  // Upper
  U1: {
    kind: "incisor", md: 8.6, bl: 7.1, crown: 10.6, root: 13, cej: 3.2,
    shovel: 0.34, roots: single(0.6, 0.76, { bendX: 0.8, bendZ: -0.8 }),
    tint: [1, 1, 1],
  },
  U2: {
    kind: "incisor", md: 6.6, bl: 6.2, crown: 9, root: 13, cej: 2.8, shovel: 0.42,
    cornerD: 1.5, roots: single(0.6, 0.74, { bendX: 1.6, bendZ: -0.6 }),
    tint: [0.99, 0.985, 0.97],
  },
  U3: {
    kind: "canine", md: 7.6, bl: 8.1, crown: 10.2, root: 17, cej: 2.4,
    roots: single(0.62, 0.74, { bendX: 1.5, bendZ: -0.4 }),
    tint: [0.975, 0.955, 0.91],
  },
  U4: {
    kind: "premolar", md: 7.1, bl: 9.1, crown: 8.6, root: 14, cej: 1.2, fossa: 0.46,
    cusps: [[0.02, 0.52, 3.3, 0.62, 0.42], [0.02, -0.5, 2.6, 0.58, 0.4]],
    grooves: [[-0.62, 0, 0.62, 0, 0.9, 0.34]],
    trunk: 4.6,
    roots: [
      { cx: 0, cz: 0.42, ra: 0.55, rb: 0.3, len: 1, y0: -3.6, divZ: 1.2, bendX: 1 },
      { cx: 0, cz: -0.42, ra: 0.55, rb: 0.3, len: 1, y0: -3.6, divZ: -1.2, bendX: 0.9 },
    ],
    tint: [0.985, 0.975, 0.945],
  },
  U5: {
    kind: "premolar", md: 6.9, bl: 9, crown: 8, root: 14.3, cej: 1.1, fossa: 0.5,
    cusps: [[0, 0.5, 2.7, 0.62, 0.42], [0, -0.5, 2.5, 0.6, 0.42]],
    grooves: [[-0.5, 0, 0.5, 0, 0.8, 0.32], [-0.5, 0, -0.72, 0.28, 0.45, 0.24], [0.5, 0, 0.72, -0.28, 0.45, 0.24]],
    roots: single(0.62, 0.68, { bendX: 1.6 }),
    tint: [0.985, 0.975, 0.95],
  },
  U6: {
    kind: "molar", md: 10.3, bl: 11.2, crown: 7.6, root: 12.8, cej: 0.9, shear: 0.13, fossa: 0.42,
    cusps: [
      [-0.5, 0.52, 2.5, 0.42, 0.38],
      [0.46, 0.54, 2.35, 0.38, 0.36],
      [-0.42, -0.5, 2.8, 0.48, 0.42],
      [0.52, -0.56, 1.8, 0.34, 0.34],
    ],
    ridges: [[-0.42, -0.5, 0.46, 0.54, 0.75, 1.05]],
    grooves: [
      [-0.06, 0.08, -0.52, -0.02, 0.78, 0.3],
      [-0.06, 0.08, -0.02, 0.98, 0.72, 0.28],
      [0.3, -0.3, 0.86, -0.1, 0.62, 0.26],
      [0.3, -0.3, -0.1, -0.98, 0.62, 0.26],
    ],
    trunk: 3.8,
    roots: [
      { cx: -0.46, cz: 0.46, ra: 0.3, rb: 0.3, len: 0.9, y0: -2.6, divX: -1.3, divZ: 0.9, bendX: 2.1 },
      { cx: 0.46, cz: 0.46, ra: 0.27, rb: 0.27, len: 0.82, y0: -2.6, divX: 1.1, divZ: 0.7, bendX: -0.3 },
      { cx: 0.02, cz: -0.48, ra: 0.42, rb: 0.32, len: 1.03, y0: -2.6, divZ: -3.1, bendZ: 0.9 },
    ],
    tint: [0.98, 0.965, 0.93],
  },
  U7: {
    kind: "molar", md: 9.6, bl: 11, crown: 7.2, root: 12, cej: 0.8, shear: 0.2, fossa: 0.46,
    cusps: [
      [-0.48, 0.5, 2.3, 0.44, 0.38],
      [0.42, 0.56, 1.95, 0.34, 0.34],
      [-0.34, -0.48, 2.6, 0.54, 0.44],
      [0.52, -0.5, 1.2, 0.28, 0.3],
    ],
    ridges: [[-0.34, -0.48, 0.42, 0.56, 0.55, 0.95]],
    grooves: [
      [-0.08, 0.06, -0.5, 0, 0.74, 0.3],
      [-0.08, 0.06, 0, 0.96, 0.66, 0.28],
      [0.26, -0.26, 0.82, -0.08, 0.58, 0.26],
      [0.26, -0.26, 0, -0.96, 0.5, 0.26],
    ],
    trunk: 4.6,
    roots: [
      { cx: -0.42, cz: 0.42, ra: 0.3, rb: 0.3, len: 0.92, y0: -3.2, divX: -0.2, divZ: 0.4, bendX: 3 },
      { cx: 0.42, cz: 0.42, ra: 0.27, rb: 0.27, len: 0.84, y0: -3.2, divX: 0.5, divZ: 0.3, bendX: 1.2 },
      { cx: 0.02, cz: -0.44, ra: 0.4, rb: 0.32, len: 1, y0: -3.2, divZ: -1.7, bendZ: 0.5, bendX: 1.5 },
    ],
    tint: [0.975, 0.96, 0.925],
  },
  U8: {
    kind: "molar", md: 8.6, bl: 10.4, crown: 6.6, root: 11, cej: 0.7, shear: 0.14, fossa: 0.5,
    wrinkle: 0.14, cuspTaper: 0.8,
    cusps: [[-0.42, 0.46, 2.1, 0.44, 0.4], [0.36, 0.52, 1.5, 0.36, 0.36], [-0.12, -0.5, 2.3, 0.62, 0.44]],
    grooves: [[-0.06, 0.04, -0.6, -0.02, 0.62, 0.3], [-0.06, 0.04, 0.3, 0.9, 0.56, 0.3], [-0.06, 0.04, 0.72, -0.26, 0.5, 0.28]],
    trunk: 8.6,
    roots: [{ cx: 0.04, cz: 0, ra: 0.5, rb: 0.56, len: 1, y0: -5, bendX: 3.4, bendZ: -0.4 }],
    tint: [0.97, 0.955, 0.915],
  },
  // Lower
  L1: {
    kind: "incisor", md: 5.2, bl: 6, crown: 9, root: 12.5, cej: 2.6, shovel: 0.2, symmetric: true,
    roots: single(0.58, 0.82, { bendX: 0.8, bendZ: 0.3 }),
    tint: [0.99, 0.985, 0.97],
  },
  L2: {
    kind: "incisor", md: 5.8, bl: 6.4, crown: 9.5, root: 14, cej: 2.6, shovel: 0.22, cornerD: 1.2,
    roots: single(0.58, 0.82, { bendX: 1.2, bendZ: 0.3 }),
    tint: [0.99, 0.985, 0.97],
  },
  L3: {
    kind: "canine", md: 6.9, bl: 7.6, crown: 11, root: 16, cej: 2.2,
    roots: single(0.6, 0.74, { bendX: 1.4 }),
    tint: [0.975, 0.955, 0.91],
  },
  L4: {
    kind: "premolar", md: 7, bl: 7.6, crown: 8.5, root: 14, cej: 1.1, fossa: 0.42, lingualLean: 0.16,
    cusps: [[0, 0.3, 3.9, 0.62, 0.46], [0, -0.68, 1.5, 0.42, 0.26]],
    ridges: [[0, 0.3, 0, -0.68, 0.72, 0.85]],
    grooves: [[-0.56, -0.22, -0.2, -0.3, 0.72, 0.28], [0.56, -0.22, 0.2, -0.3, 0.72, 0.28]],
    roots: single(0.62, 0.74, { bendX: 1.3 }),
    tint: [0.985, 0.975, 0.945],
  },
  L5: {
    kind: "premolar", md: 7.2, bl: 8.1, crown: 8, root: 14.5, cej: 1, fossa: 0.46, lingualLean: 0.12,
    cusps: [[0, 0.42, 2.9, 0.62, 0.42], [-0.42, -0.54, 2, 0.4, 0.34], [0.46, -0.54, 1.6, 0.36, 0.32]],
    grooves: [[-0.48, 0.02, 0.48, 0.02, 0.72, 0.28], [0, 0.02, 0.04, -0.82, 0.72, 0.28]],
    roots: single(0.62, 0.74, { bendX: 1.5 }),
    tint: [0.985, 0.975, 0.945],
  },
  L6: {
    kind: "molar", md: 11.2, bl: 10.3, crown: 7.5, root: 14, cej: 0.9, fossa: 0.4, lingualLean: 0.1,
    cusps: [
      [-0.56, 0.48, 2.2, 0.36, 0.4],
      [0.04, 0.6, 2.05, 0.3, 0.36],
      [0.64, 0.38, 1.5, 0.24, 0.34],
      [-0.5, -0.52, 2.5, 0.38, 0.4],
      [0.42, -0.54, 2.25, 0.36, 0.38],
    ],
    grooves: [
      [-0.72, 0.02, 0.72, -0.04, 0.78, 0.28],
      [-0.2, 0, -0.26, 0.98, 0.7, 0.26],
      [0.36, 0, 0.5, 0.86, 0.6, 0.24],
      [-0.02, -0.02, -0.04, -0.98, 0.66, 0.26],
    ],
    trunk: 3.4,
    roots: [
      { cx: -0.5, cz: 0, ra: 0.24, rb: 0.74, len: 1, y0: -2.2, divX: -0.7, bendX: 3 },
      { cx: 0.5, cz: 0, ra: 0.24, rb: 0.68, len: 0.92, y0: -2.2, divX: 0.5, bendX: 1.6 },
    ],
    tint: [0.98, 0.965, 0.93],
  },
  L7: {
    kind: "molar", md: 10.6, bl: 10, crown: 7, root: 13, cej: 0.8, fossa: 0.44, lingualLean: 0.12,
    cusps: [
      [-0.5, 0.48, 2.1, 0.42, 0.4],
      [0.5, 0.46, 1.9, 0.4, 0.38],
      [-0.48, -0.5, 2.3, 0.42, 0.4],
      [0.48, -0.5, 2, 0.4, 0.38],
    ],
    grooves: [
      [-0.76, 0, 0.76, 0, 0.74, 0.28],
      [0, 0, 0, 0.96, 0.66, 0.26],
      [0, 0, 0, -0.96, 0.6, 0.26],
    ],
    trunk: 4.4,
    roots: [
      { cx: -0.44, cz: 0, ra: 0.25, rb: 0.72, len: 1, y0: -3, divX: -0.2, bendX: 3.4 },
      { cx: 0.44, cz: 0, ra: 0.25, rb: 0.66, len: 0.92, y0: -3, divX: 0.1, bendX: 2.8 },
    ],
    tint: [0.975, 0.96, 0.925],
  },
  L8: {
    kind: "molar", md: 10.1, bl: 9.6, crown: 6.8, root: 11, cej: 0.7, fossa: 0.48, lingualLean: 0.14,
    wrinkle: 0.15, cuspTaper: 0.85,
    cusps: [
      [-0.48, 0.46, 1.9, 0.42, 0.4],
      [0.42, 0.44, 1.6, 0.42, 0.38],
      [-0.46, -0.48, 2.1, 0.42, 0.4],
      [0.42, -0.5, 1.7, 0.4, 0.38],
    ],
    grooves: [[-0.72, 0.02, 0.72, 0, 0.66, 0.3], [-0.02, 0, 0.1, 0.9, 0.56, 0.28], [-0.02, 0, -0.1, -0.9, 0.52, 0.28]],
    trunk: 6,
    roots: [
      { cx: -0.3, cz: 0, ra: 0.3, rb: 0.66, len: 0.95, y0: -4.4, bendX: 3.6 },
      { cx: 0.3, cz: 0, ra: 0.3, rb: 0.6, len: 0.88, y0: -4.4, bendX: 3.8 },
    ],
    tint: [0.97, 0.955, 0.915],
  },
};

// Order from the midline, FDI position 1 to 8, with the tilt of each tooth.
// `tip` leans the crown mesially; `torque` leans it buccally (degrees).
export const ARCH = {
  upper: [
    { type: "U1", tip: 3, torque: 11 },
    { type: "U2", tip: 5, torque: 9 },
    { type: "U3", tip: 6, torque: 3 },
    { type: "U4", tip: 1, torque: -2 },
    { type: "U5", tip: 1, torque: -3 },
    { type: "U6", tip: 1, torque: -4 },
    { type: "U7", tip: -1, torque: -6 },
    { type: "U8", tip: -3, torque: -8 },
  ],
  lower: [
    { type: "L1", tip: 1, torque: 8 },
    { type: "L2", tip: 2, torque: 6 },
    { type: "L3", tip: 3, torque: -1 },
    { type: "L4", tip: 2, torque: -6 },
    { type: "L5", tip: 2, torque: -9 },
    { type: "L6", tip: 2, torque: -13 },
    { type: "L7", tip: 2, torque: -17 },
    { type: "L8", tip: 1, torque: -19 },
  ],
};
