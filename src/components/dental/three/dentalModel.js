import { Box3, Vector3 } from "three";

// World units are mm, with the occlusal plane at y = 0 and +x the patient's
// left, so the patient's right sits on the viewer's left in the front view,
// as on a dental chart. See scripts/dental-model/mouthField.mjs.

export const JAW_ANGLE = (24 * Math.PI) / 180; // Fully open.

export const VIEWS = {
  front: { position: [0, 4, 262], target: [0, -3, 18] },
  right: { position: [-236, 12, 54], target: [0, -3, 12] },
  left: { position: [236, 12, 54], target: [0, -3, 12] },
  upper: { position: [0, -226, 64], target: [0, 8, 22], arches: "upper" },
  lower: { position: [0, 232, 62], target: [0, -8, 20], arches: "lower" },
};

// Where the camera looks for each oral site.
export const REGION_VIEWS = {
  quadrant_ur: { position: [-112, 8, 136], target: [-20, 6, 30] },
  quadrant_ul: { position: [112, 8, 136], target: [20, 6, 30] },
  quadrant_ll: { position: [112, -12, 132], target: [18, -6, 28] },
  quadrant_lr: { position: [-112, -12, 132], target: [-18, -6, 28] },
  gingiva_upper: { position: [0, -18, 158], target: [0, 10, 34] },
  gingiva_lower: { position: [0, 8, 156], target: [0, -14, 32] },
  palate: { position: [0, -120, 88], target: [0, 10, 24], arches: "upper" },
  tongue: { position: [0, 104, 118], target: [0, -7, 20], arches: "lower" },
  floor_of_mouth: { position: [0, 110, 96], target: [0, -12, 26], arches: "lower" },
  buccal_mucosa_right: { position: [-146, 2, 54], target: [-26, -1, 22] },
  buccal_mucosa_left: { position: [146, 2, 54], target: [26, -1, 22] },
  lips: { position: [0, 2, 182], target: [0, 0, 46] },
  maxilla: { position: [-30, 8, 196], target: [0, 16, 28], layer: "bone" },
  mandible: { position: [-60, -22, 206], target: [0, -22, 12], layer: "bone" },
  tmj_right: { position: [-162, 14, 12], target: [-46, 22, -32], layer: "bone" },
  tmj_left: { position: [162, 14, 12], target: [46, 22, -32], layer: "bone" },
};

// Where a part of the mouth is hit decides the site it stands for: the upper
// gum carries the palate and the lower gum the floor of the mouth.
export const regionOfPart = (part, point, condyle) => {
  if (part === "tongue") return "tongue";
  if (part === "gum_upper") {
    return Math.abs(point.x) < 17 && point.z < 41 && point.y > 8
      ? "palate"
      : "gingiva_upper";
  }
  if (part === "gum_lower") {
    return Math.abs(point.x) < 15 && point.z < 37 && point.y < -9
      ? "floor_of_mouth"
      : "gingiva_lower";
  }
  if (part === "maxilla") return "maxilla";
  if (part === "mandible") {
    const near = Math.hypot(Math.abs(point.x) - condyle.x, point.y - condyle.y, point.z - condyle.z) < 16;
    if (near) return point.x < 0 ? "tmj_right" : "tmj_left";
    return "mandible";
  }
  return null;
};

// Which surface of a tooth a point in its own frame lies on: "O", "M", "D",
// "B" or "L", or null on the root. The fragment shader in dentalMaterials.js
// makes the same choice.
export const surfaceAt = ({ x, y, z }, size) => {
  if (y < 0.4) return null;
  const u = x / size.a;
  const v = z / size.b;
  if (y > size.h * 0.52 && Math.abs(u) < 0.66 && Math.abs(v) < 0.66) return "O";
  if (Math.abs(u) > Math.abs(v)) return u < 0 ? "M" : "D";
  return v > 0 ? "B" : "L";
};

const hingePoint = (point, hinge, angle) => {
  const y = point.y - hinge.y;
  const z = point.z - hinge.z;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return point.set(point.x, hinge.y + y * c - z * s, hinge.z + y * s + z * c);
};

// Centre of a crown in the world, with the lower jaw swung open by `angle`.
export const crownCenter = (tooth, hinge, angle) => {
  const local = new Vector3(0, tooth.size.h * 0.55, 0).applyMatrix4(tooth.matrix);
  return tooth.jaw === "lower" ? hingePoint(local, hinge, angle) : local;
};

// A view of one tooth from outside the arch, or of several together.
export const toothCamera = (teeth, hinge, angle) => {
  const box = new Box3();
  teeth.forEach((tooth) => {
    const c = crownCenter(tooth, hinge, angle);
    box.expandByPoint(c.clone().subScalar(9));
    box.expandByPoint(c.clone().addScalar(9));
  });
  const center = box.getCenter(new Vector3());
  const radius = box.getSize(new Vector3()).length() / 2;
  const out = new Vector3(center.x, 0, Math.max(center.z - 8, 14)).normalize();
  const dir = out.add(new Vector3(0, center.y > 0 ? -0.2 : 0.26, 0)).normalize();
  return {
    target: center,
    position: center.clone().add(dir.multiplyScalar(Math.min(240, Math.max(82, radius * 3.3)))),
  };
};
