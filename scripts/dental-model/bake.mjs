// Bakes the dental model to src/assets/models/dentition.bin:
//   node scripts/dental-model/bake.mjs
//
// Everything is generated from anatomy.mjs, so there is no third-party asset
// to license. Teeth are shared between the sides: each of the 16 tooth types
// is meshed once as its outer surface, dentin and pulp, and the right side is
// the left mirrored. The file holds a JSON table followed by Meshopt-encoded
// vertex and index streams (see src/components/dental/three/loadDentition.js).

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import { surfaceNets } from "./surfaceNets.mjs";
import { TOOTH_TYPES } from "./anatomy.mjs";
import {
  FIELDS_AROUND,
  boneColor,
  condyle,
  gumColor,
  jawOf,
  teethField,
  toWorld,
  tongueColor,
  toothColor,
} from "./mouthField.mjs";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../../src/assets/models/dentition.bin");

await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
MeshoptSimplifier.useExperimentalFeatures = true;

const compact = (positions, normals, indices) => {
  const remap = new Map();
  const nextPositions = [];
  const nextNormals = [];
  const nextIndices = new Uint32Array(indices.length);
  indices.forEach((v, i) => {
    if (!remap.has(v)) {
      remap.set(v, remap.size);
      nextPositions.push(positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2]);
      nextNormals.push(normals[v * 3], normals[v * 3 + 1], normals[v * 3 + 2]);
    }
    nextIndices[i] = remap.get(v);
  });
  return {
    positions: Float32Array.from(nextPositions),
    normals: Float32Array.from(nextNormals),
    indices: nextIndices,
  };
};

const simplify = (mesh, triangles) => {
  const target = triangles * 3;
  if (mesh.indices.length <= target) return mesh;
  const [indices] = MeshoptSimplifier.simplifyWithAttributes(
    mesh.indices,
    mesh.positions,
    3,
    mesh.normals,
    3,
    [0.9, 0.9, 0.9],
    null,
    target,
    0.03,
  );
  return compact(mesh.positions, mesh.normals, indices);
};

// Ambient occlusion by stepping out along the normal and seeing how close
// the surrounding solids come.
const STEPS = [
  [0.5, 0.34],
  [1.1, 0.27],
  [2.2, 0.2],
  [4, 0.13],
  [7, 0.06],
];
const occlusion = (solid, x, y, z, nx, ny, nz) => {
  let dark = 0;
  for (const [h, w] of STEPS) {
    const d = solid(x + nx * h, y + ny * h, z + nz * h);
    dark += w * Math.max(0, h - d) / h;
  }
  return Math.max(0.3, 1 - dark * 1.2);
};

// Encodes one mesh; positions fill the int16 range of the mesh's own box.
const chunks = [];
let offset = 0;
const blob = (bytes) => {
  const at = offset;
  chunks.push(bytes);
  offset += bytes.length;
  const pad = (4 - (bytes.length % 4)) % 4;
  if (pad) {
    chunks.push(new Uint8Array(pad));
    offset += pad;
  }
  return [at, bytes.length];
};

const bounds = (positions) => {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let c = 0; c < 3; c += 1) {
      min[c] = Math.min(min[c], positions[i + c]);
      max[c] = Math.max(max[c], positions[i + c]);
    }
  }
  return { min, max };
};

const encode = (name, mesh, colors) => {
  const { positions, normals } = mesh;
  const indices = Uint32Array.from(mesh.indices);
  const { min, max } = bounds(positions);
  const scale = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / 65534;
  // Rewrites `indices` in place and says where each old vertex went.
  const [remap, count] = MeshoptEncoder.reorderMesh(indices, true, false);
  const position = new Int16Array(count * 4);
  const normal = new Int8Array(count * 4);
  const color = new Uint8Array(count * 4);
  for (let old = 0; old < positions.length / 3; old += 1) {
    const v = remap[old];
    if (v === 0xffffffff) continue;
    for (let c = 0; c < 3; c += 1) {
      position[v * 4 + c] = Math.round((positions[old * 3 + c] - min[c]) / scale) - 32767;
      normal[v * 4 + c] = Math.round(normals[old * 3 + c] * 127);
      color[v * 4 + c] = colors ? Math.round(Math.max(0, Math.min(1, colors[old * 3 + c])) * 255) : 255;
    }
  }
  return {
    name,
    count,
    indexCount: indices.length,
    min,
    scale,
    position: blob(MeshoptEncoder.encodeVertexBuffer(new Uint8Array(position.buffer), count, 8)),
    normal: blob(MeshoptEncoder.encodeVertexBuffer(new Uint8Array(normal.buffer), count, 4)),
    color: blob(MeshoptEncoder.encodeVertexBuffer(color, count, 4)),
    index: blob(MeshoptEncoder.encodeIndexBuffer(new Uint8Array(indices.buffer), indices.length, 4)),
  };
};

const paint = (mesh, colorAt) => {
  const count = mesh.positions.length / 3;
  const colors = new Float32Array(count * 3);
  for (let v = 0; v < count; v += 1) {
    const c = colorAt(
      mesh.positions[v * 3],
      mesh.positions[v * 3 + 1],
      mesh.positions[v * 3 + 2],
      mesh.normals[v * 3],
      mesh.normals[v * 3 + 1],
      mesh.normals[v * 3 + 2],
    );
    colors[v * 3] = c[0];
    colors[v * 3 + 1] = c[1];
    colors[v * 3 + 2] = c[2];
  }
  return colors;
};

const started = Date.now();
const log = (text) => console.log(`[${((Date.now() - started) / 1000).toFixed(1)}s] ${text}`);
const meshes = [];

const everyTooth = [...jawOf("upper").teeth, ...jawOf("lower").teeth];

for (const tooth of everyTooth) {
  const { id, field } = tooth;
  const jaw = jawOf(id.startsWith("U") ? "upper" : "lower");
  const outer = simplify(surfaceNets(field.outer, field.box, 0.17), 4800);
  const teethAround = (x, y, z) => {
    const [wx, wy, wz] = toWorld(tooth, x, y, z);
    return Math.min(field.outer(x, y, z), teethField(jaw, wx, wy, wz, tooth));
  };
  // The root sits inside the gum, which must not darken it: it shows bare in
  // the layers that hide the gums.
  const solid = (x, y, z) => {
    const [wx, wy, wz] = toWorld(tooth, x, y, z);
    const gum = jaw === jawOf("upper") ? FIELDS_AROUND.upperGum : FIELDS_AROUND.lowerGum;
    return Math.min(teethAround(x, y, z), Math.max(gum(wx, wy, wz), -1));
  };
  const colors = paint(outer, (x, y, z, nx, ny, nz) => {
    const ao = occlusion(y > 0.5 ? solid : teethAround, x, y, z, nx, ny, nz);
    return toothColor(tooth, x, y, z).map((v, i) => v * (ao + (1 - ao) * [0.08, 0.03, 0][i]));
  });
  meshes.push(encode(`${id}_outer`, outer, colors));
  const dentin = simplify(surfaceNets(field.dentin, field.box, 0.3), 1300);
  meshes.push(encode(`${id}_dentin`, dentin));
  const pulp = simplify(surfaceNets(field.pulp, field.box, 0.2), 800);
  meshes.push(encode(`${id}_pulp`, pulp));
  log(`${id}: ${outer.indices.length / 3} / ${dentin.indices.length / 3} / ${pulp.indices.length / 3} triangles`);
}

const SOLIDS = [
  {
    name: "gum_upper",
    field: FIELDS_AROUND.upperGum,
    box: [[-46, -6, -16], [46, 30, 58]],
    step: 0.34,
    triangles: 56000,
    color: (x, y, z) => gumColor("upper", x, y, z),
    around: (x, y, z) => Math.min(FIELDS_AROUND.upperGum(x, y, z), teethField(jawOf("upper"), x, y, z)),
  },
  {
    name: "gum_lower",
    field: FIELDS_AROUND.lowerGum,
    box: [[-44, -32, -18], [44, 6, 54]],
    step: 0.34,
    triangles: 56000,
    color: (x, y, z) => gumColor("lower", x, y, z),
    around: (x, y, z) => Math.min(FIELDS_AROUND.lowerGum(x, y, z), teethField(jawOf("lower"), x, y, z)),
  },
  {
    name: "maxilla",
    field: FIELDS_AROUND.maxilla,
    box: [[-58, -2, -14], [58, 40, 62]],
    step: 0.46,
    triangles: 38000,
    color: boneColor,
    around: (x, y, z) => FIELDS_AROUND.maxilla(x, y, z),
  },
  {
    name: "mandible",
    field: FIELDS_AROUND.mandible,
    box: [[-60, -42, -66], [60, 40, 56]],
    step: 0.5,
    triangles: 50000,
    color: boneColor,
    around: (x, y, z) => FIELDS_AROUND.mandible(x, y, z),
  },
  {
    name: "tongue",
    field: FIELDS_AROUND.tongue,
    box: [[-27, -22, -20], [27, 2, 38]],
    step: 0.4,
    triangles: 14000,
    color: tongueColor,
    around: (x, y, z) => Math.min(FIELDS_AROUND.tongue(x, y, z), teethField(jawOf("lower"), x, y, z)),
  },
];

for (const part of SOLIDS) {
  const mesh = simplify(surfaceNets(part.field, part.box, part.step, { mirrorX: true }), part.triangles);
  const colors = paint(mesh, (x, y, z, nx, ny, nz) => {
    // Softened: wet tissue scatters light into its creases.
    const ao = 0.42 + 0.58 * occlusion(part.around, x, y, z, nx, ny, nz);
    return part.color(x, y, z).map((v, i) => v * (ao + (1 - ao) * [0.2, 0.03, 0.03][i]));
  });
  meshes.push(encode(part.name, mesh, colors));
  log(`${part.name}: ${mesh.indices.length / 3} triangles`);
}

// Where each tooth stands, for the left side; the right is the left mirrored.
const teeth = everyTooth.map((t) => ({
  fdi: t.fdi,
  type: t.id,
  jaw: t.id.startsWith("U") ? "upper" : "lower",
  center: t.center,
  rotation: t.rotation.flat(),
  flipY: t.flip < 0,
  size: { a: t.field.a0, b: t.field.b0, h: t.field.H, root: t.type.root, cej: t.type.cej, kind: t.type.kind },
}));

const header = JSON.stringify({ version: 1, unit: "mm", hinge: condyle(), meshes, teeth, types: Object.keys(TOOTH_TYPES) });
const json = new TextEncoder().encode(header);
const prefix = new Uint32Array([json.length]);
const pad = (4 - (json.length % 4)) % 4;
const body = new Uint8Array(4 + json.length + pad + offset);
body.set(new Uint8Array(prefix.buffer), 0);
body.set(json, 4);
let at = 4 + json.length + pad;
chunks.forEach((c) => {
  body.set(c, at);
  at += c.length;
});
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, body);
log(`wrote ${OUT}: ${(body.length / 1048576).toFixed(2)} MB, header ${json.length} bytes`);
