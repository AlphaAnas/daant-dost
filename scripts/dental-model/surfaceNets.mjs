// Meshes the zero level of a scalar field with naive surface nets, then pulls
// each vertex onto the surface and takes its normal from the field, so the
// result is smooth however coarse the grid.

const CORNERS = [
  [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
  [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1],
];
const EDGES = [
  [0, 1], [2, 3], [4, 5], [6, 7],
  [0, 2], [1, 3], [4, 6], [5, 7],
  [0, 4], [1, 5], [2, 6], [3, 7],
];

export const gradient = (f, x, y, z, e = 0.07) => {
  const gx = f(x + e, y, z) - f(x - e, y, z);
  const gy = f(x, y + e, z) - f(x, y - e, z);
  const gz = f(x, y, z + e) - f(x, y, z - e);
  const l = Math.hypot(gx, gy, gz) || 1;
  return [gx / l, gy / l, gz / l, l / (2 * e)];
};

/**
 * `field(x, y, z)` is negative inside. `box` is [[minX, minY, minZ], [maxX,
 * maxY, maxZ]] and `step` the cell size. With `mirrorX` the field is only
 * sampled for x >= 0 and copied across, for shapes symmetric about x = 0.
 */
export const surfaceNets = (field, box, step, { mirrorX = false, onSample } = {}) => {
  const [min, max] = box;
  const nx = Math.ceil((max[0] - min[0]) / step) + 1;
  const ny = Math.ceil((max[1] - min[1]) / step) + 1;
  const nz = Math.ceil((max[2] - min[2]) / step) + 1;
  const values = new Float32Array(nx * ny * nz);
  const at = (i, j, k) => i + nx * (j + ny * k);
  const px = (i) => min[0] + i * step;
  const py = (j) => min[1] + j * step;
  const pz = (k) => min[2] + k * step;

  for (let k = 0; k < nz; k += 1) {
    for (let j = 0; j < ny; j += 1) {
      for (let i = 0; i < nx; i += 1) {
        values[at(i, j, k)] = mirrorX && px(i) < 0 ? Number.NaN : field(px(i), py(j), pz(k));
      }
    }
    onSample?.(k / nz);
  }
  if (mirrorX) {
    for (let k = 0; k < nz; k += 1) {
      for (let j = 0; j < ny; j += 1) {
        for (let i = 0; i < nx; i += 1) {
          const v = at(i, j, k);
          if (Number.isNaN(values[v])) values[v] = field(Math.abs(px(i)), py(j), pz(k));
        }
      }
    }
  }

  const cellVertex = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const cellAt = (i, j, k) => i + (nx - 1) * (j + (ny - 1) * k);
  const positions = [];

  for (let k = 0; k < nz - 1; k += 1) {
    for (let j = 0; j < ny - 1; j += 1) {
      for (let i = 0; i < nx - 1; i += 1) {
        let mask = 0;
        const d = new Array(8);
        for (let c = 0; c < 8; c += 1) {
          const [a, b, e] = CORNERS[c];
          d[c] = values[at(i + a, j + b, k + e)];
          if (d[c] < 0) mask |= 1 << c;
        }
        if (mask === 0 || mask === 255) continue;
        let sx = 0;
        let sy = 0;
        let sz = 0;
        let n = 0;
        for (const [p, q] of EDGES) {
          if (d[p] < 0 === d[q] < 0) continue;
          const t = d[p] / (d[p] - d[q]);
          const [ax, ay, az] = CORNERS[p];
          const [bx, by, bz] = CORNERS[q];
          sx += ax + (bx - ax) * t;
          sy += ay + (by - ay) * t;
          sz += az + (bz - az) * t;
          n += 1;
        }
        cellVertex[cellAt(i, j, k)] = positions.length / 3;
        positions.push(px(i + sx / n), py(j + sy / n), pz(k + sz / n));
      }
    }
  }

  const indices = [];
  const quad = (a, b, c, d, flip) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) indices.push(a, c, b, a, d, c);
    else indices.push(a, b, c, a, c, d);
  };
  for (let k = 1; k < nz - 1; k += 1) {
    for (let j = 1; j < ny - 1; j += 1) {
      for (let i = 1; i < nx - 1; i += 1) {
        const inside = values[at(i, j, k)] < 0;
        if (inside !== values[at(i + 1, j, k)] < 0) {
          quad(
            cellVertex[cellAt(i, j - 1, k - 1)],
            cellVertex[cellAt(i, j, k - 1)],
            cellVertex[cellAt(i, j, k)],
            cellVertex[cellAt(i, j - 1, k)],
            !inside,
          );
        }
        if (inside !== values[at(i, j + 1, k)] < 0) {
          quad(
            cellVertex[cellAt(i - 1, j, k - 1)],
            cellVertex[cellAt(i - 1, j, k)],
            cellVertex[cellAt(i, j, k)],
            cellVertex[cellAt(i, j, k - 1)],
            !inside,
          );
        }
        if (inside !== values[at(i, j, k + 1)] < 0) {
          quad(
            cellVertex[cellAt(i - 1, j - 1, k)],
            cellVertex[cellAt(i, j - 1, k)],
            cellVertex[cellAt(i, j, k)],
            cellVertex[cellAt(i - 1, j, k)],
            !inside,
          );
        }
      }
    }
  }

  // Newton steps onto the surface, limited to the size of one cell.
  const normals = new Float32Array(positions.length);
  const pos = Float32Array.from(positions);
  for (let v = 0; v < pos.length; v += 3) {
    let x = pos[v];
    let y = pos[v + 1];
    let z = pos[v + 2];
    for (let s = 0; s < 2; s += 1) {
      const value = field(x, y, z);
      const [gx, gy, gz, slope] = gradient(field, x, y, z);
      const move = Math.max(-step, Math.min(step, -value / Math.max(slope, 0.2)));
      x += gx * move;
      y += gy * move;
      z += gz * move;
    }
    const [nxv, nyv, nzv] = gradient(field, x, y, z);
    pos[v] = x;
    pos[v + 1] = y;
    pos[v + 2] = z;
    normals[v] = nxv;
    normals[v + 1] = nyv;
    normals[v + 2] = nzv;
  }
  return { positions: pos, normals, indices: Uint32Array.from(indices) };
};
