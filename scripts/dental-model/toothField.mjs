// A scalar field for one tooth type: negative inside, roughly a distance in
// mm near the surface. The crown is an outline swept up the tooth, trimmed by
// an occlusal height map built from its cusps, ridges and grooves. Each root
// is an ellipse carried along a curved axis. Dentin and pulp are offsets of
// the same shapes, so the three nest correctly.

export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const smin = (a, b, k) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - (h * h * k) / 4;
};
export const smax = (a, b, k) => -smin(-a, -b, k);

const segmentDistance = (x, z, ax, az, bx, bz) => {
  const dx = bx - ax;
  const dz = bz - az;
  const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};

// Half-widths of the crown outline, as a fraction of a0 / b0, at height t.
const PROFILE = {
  incisor: {
    a: { cervix: 0.64, peak: 0.8, tip: 0.9 },
    buccal: { cervix: 0.82, peak: 0.3, tip: 0.2 },
    lingual: { cervix: 0.86, peak: 0.16, tip: 0.1 },
    exponent: 2.7,
  },
  canine: {
    a: { cervix: 0.68, peak: 0.6, tip: 0.46 },
    buccal: { cervix: 0.8, peak: 0.32, tip: 0.26 },
    lingual: { cervix: 0.84, peak: 0.2, tip: 0.2 },
    exponent: 2.2,
  },
  premolar: {
    a: { cervix: 0.7, peak: 0.66, tip: 0.8 },
    buccal: { cervix: 0.84, peak: 0.34, tip: 0.76 },
    lingual: { cervix: 0.86, peak: 0.42, tip: 0.76 },
    exponent: 2.5,
  },
  molar: {
    a: { cervix: 0.78, peak: 0.62, tip: 0.84 },
    buccal: { cervix: 0.84, peak: 0.3, tip: 0.8 },
    lingual: { cervix: 0.86, peak: 0.44, tip: 0.82 },
    exponent: 3.1,
  },
};

const profile = ({ cervix, peak, tip }, t) =>
  lerp(cervix, 1, smooth(0, peak, t)) * lerp(1, tip, smooth(peak, 1.02, t) ** 1.4);

export const toothField = (type) => {
  const a0 = type.md / 2;
  const b0 = type.bl / 2;
  const H = type.crown;
  const shape = PROFILE[type.kind];
  const n = shape.exponent;
  const fossaY = H * (type.fossa ?? 0.5) + H * 0.3;
  const cusps = type.cusps || [];
  const ridges = type.ridges || [];
  const grooves = type.grooves || [];

  // The occlusal surface above each point of the crown.
  const topography = (x, z) => {
    const u = x / a0;
    const v = z / b0;
    if (type.kind === "incisor") {
      const corner = u > 0 ? (type.cornerD ?? 1.15) : type.symmetric ? 1.15 : 0.62;
      const drop = (Math.max(0, Math.abs(u) - 0.3) / 0.7) ** 2.5 * 0.13 * corner;
      return H * (1 - drop) + 0.07 * Math.cos(u * Math.PI * 3);
    }
    if (type.kind === "canine") {
      const drop = Math.abs(u - 0.08) ** 1.28 * 0.3;
      return H * (1 - drop - 0.06 * v * v);
    }
    let raised = 0;
    for (const [cu, cv, height, su, sv] of cusps) {
      const d2 = ((u - cu) / su) ** 2 + ((v - cv) / sv) ** 2;
      const value = height * Math.exp(-(d2 ** (type.cuspTaper ?? 0.72)));
      raised = Math.max(raised, value) + 0.13 * Math.min(raised, value);
    }
    const au = Math.abs(u);
    const av = Math.abs(v);
    raised += 0.82 * smooth(0.6, 0.86, au) * (1 - smooth(0.58, 0.95, av));
    for (const [u1, v1, u2, v2, amount, width] of ridges) {
      const d = segmentDistance(x, z, u1 * a0, v1 * b0, u2 * a0, v2 * b0);
      raised += amount * Math.exp(-((d / width) ** 2));
    }
    for (const [u1, v1, u2, v2, depth, width] of grooves) {
      const d = segmentDistance(x, z, u1 * a0, v1 * b0, u2 * a0, v2 * b0);
      raised -= depth * Math.exp(-((d / width) ** 2));
    }
    if (type.wrinkle) {
      raised += type.wrinkle * Math.sin(u * 10 + v * 4) * Math.sin(v * 9 - u * 3);
    }
    return fossaY + raised;
  };

  // Outline of the crown at a height, negative inside.
  const outline = (x, y, z) => {
    const t = clamp(y / H, 0, 1.15);
    const a = a0 * profile(shape.a, t);
    let bb = b0 * profile(shape.buccal, t);
    let bl = b0 * profile(shape.lingual, t);
    // Upper molars are rhomboid; lower crowns lean lingually.
    const xs = x + (type.shear ? type.shear * a0 * (z / b0) : 0);
    const zs = z + (type.lingualLean ? type.lingualLean * b0 * smooth(0.2, 1, t) : 0);
    const u = xs / a;
    if (type.shovel) {
      const fall = (1 - Math.min(1, u * u)) ** 2;
      bl *= 1 - type.shovel * fall * smooth(0.2, 0.42, t) * (1 - smooth(0.82, 1, t) * 0.5);
      bl *= 1 + 0.16 * Math.exp(-((t / 0.22) ** 2));
      bb *= 1 + 0.03 * Math.cos(u * Math.PI * 1.5);
    }
    if (type.kind === "canine") {
      bl *= 1 + 0.12 * Math.exp(-((u / 0.3) ** 2));
      bb *= 1 + 0.08 * Math.exp(-((u / 0.32) ** 2));
    }
    if (type.kind === "molar") {
      const lobe = 0.03 * Math.exp(-(((u + 0.05) / 0.14) ** 2)) * (1 - smooth(0.25, 0.85, t));
      bb *= 1 - lobe;
    }
    const b = zs > 0 ? bb : bl;
    const v = zs / b;
    const r = (Math.abs(u) ** n + Math.abs(v) ** n) ** (1 / n);
    return (r - 1) * Math.min(a, b) * 0.92;
  };

  const crown = (x, y, z) => {
    const d = smax(outline(x, y, z), y - topography(x, z), 0.42);
    // Ends at the neck, where it blends into the root without a collar.
    return smax(d, -y - 0.5, 1.3);
  };

  // Roots: the listed ones, plus the common trunk of a multi-rooted tooth.
  const rootList = [];
  const addRoot = (spec) => {
    rootList.push({
      y0: spec.y0 ?? 0.6,
      cx: (spec.cx || 0) * a0,
      cz: (spec.cz || 0) * b0,
      ra: spec.ra * a0,
      rb: spec.rb * b0,
      len: spec.len * type.root,
      divX: spec.divX || 0,
      divZ: spec.divZ || 0,
      bendX: spec.bendX || 0,
      bendZ: spec.bendZ || 0,
      p: spec.p ?? 2.2,
      q: spec.q ?? 0.72,
      canal: spec.canal ?? true,
    });
  };
  type.roots.forEach(addRoot);
  if (type.trunk) {
    addRoot({ ra: 0.72, rb: 0.74, len: type.trunk / type.root, p: 3.2, q: 0.5, canal: false });
  }

  const rootShell = (root, x, y, z, scale) => {
    const s = (root.y0 - y) / root.len;
    const ss = clamp(s);
    const cx = root.cx + root.divX * ss + root.bendX * ss * ss;
    const cz = root.cz + root.divZ * ss + root.bendZ * ss * ss;
    const taper = Math.max((1 - ss ** root.p) ** root.q, 0.015);
    const ra = root.ra * taper * scale;
    const rb = root.rb * taper * scale;
    let d = (Math.hypot((x - cx) / ra, (z - cz) / rb) - 1) * Math.min(ra, rb);
    if (s < 0) d = Math.max(d, -s * root.len);
    if (s > 1) d = Math.max(d, (s - 1) * root.len);
    return d;
  };

  const roots = (x, y, z, scale = 1) => {
    let d = Infinity;
    for (const root of rootList) d = smin(d, rootShell(root, x, y, z, scale), 1.3);
    return d;
  };

  const outer = (x, y, z) => smin(crown(x, y, z), roots(x, y, z), 1.1);

  // Enamel is thickest over the cusps and fades out at the neck of the tooth.
  const enamelThickness = (y) => lerp(0.1, 1.55, smooth(-0.5, H * 0.9, y));
  const dentin = (x, y, z) => outer(x, y, z) + enamelThickness(y);

  const pulp = (x, y, z) => {
    const chamberTop = y - lerp(H * 0.55, H * 0.72, type.kind === "molar" ? 0 : 1);
    const chamber = smax(crown(x, y, z) + 2.05, chamberTop, 0.9);
    const closed = smax(chamber, -y - 1.4, 0.9);
    let d = closed;
    for (const root of rootList) {
      if (root.canal) d = smin(d, rootShell(root, x, y, z, 0.2), 0.9);
    }
    return d;
  };

  // Where the crown meets the root: higher between teeth than over the faces.
  const cejY = (x) => (type.cej || 1) * Math.min(1, (x / (a0 * 0.8)) ** 2);

  return {
    a0,
    b0,
    H,
    outer,
    dentin,
    pulp,
    cejY,
    box: [
      [-a0 - 5, -type.root - 3, -b0 - 6],
      [a0 + 6, H + 1, b0 + 6],
    ],
  };
};
