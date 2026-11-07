import {
  AdditiveBlending,
  Color,
  DoubleSide,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  ShaderMaterial,
  Vector3,
  Vector4,
} from "three";

const WET = { clearcoat: 0.62, clearcoatRoughness: 0.24 };

const enamel = (overrides = {}) =>
  new MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.3,
    metalness: 0,
    ior: 1.62,
    clearcoat: 0.72,
    clearcoatRoughness: 0.16,
    specularIntensity: 0.9,
    ...overrides,
  });

// The tooth's own colour with its surfaces tinted one by one: `surfaces` is
// five [r, g, b, strength] rows in the order of SURFACE_IDS.
const SURFACE_ORDER = ["O", "M", "D", "B", "L"];

const withSurfaces = (material, size, surfaces) => {
  const uniforms = {
    uToothSize: { value: new Vector3(size.a, size.b, size.h) },
    uSurface: { value: SURFACE_ORDER.map((id) => new Vector4(...(surfaces[id] || [0, 0, 0, 0]))) },
  };
  material.customProgramCacheKey = () => "tooth-surface";
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vToothLocal;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvToothLocal = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vToothLocal;
uniform vec3 uToothSize;
uniform vec4 uSurface[5];
int toothSurface(vec3 p) {
  if (p.y < 0.4) return -1;
  float u = p.x / uToothSize.x;
  float v = p.z / uToothSize.y;
  if (p.y > uToothSize.z * 0.52 && abs(u) < 0.66 && abs(v) < 0.66) return 0;
  if (abs(u) > abs(v)) return u < 0.0 ? 1 : 2;
  return v > 0.0 ? 3 : 4;
}
// 1 in the middle of a surface, fading to its edge, so a finding reads as a
// lesion on the tooth rather than a painted face.
float surfacePatch(vec3 p, int surface) {
  float u = p.x / uToothSize.x;
  float v = p.z / uToothSize.y;
  float t = p.y / uToothSize.z;
  float c;
  if (surface == 0) c = length(vec2(u, v)) / 0.62;
  else if (surface < 3) c = length(vec2(v / 0.62, (t - 0.55) / 0.36));
  else c = length(vec2(u / 0.62, (t - 0.5) / 0.38));
  c += 0.16 * sin(p.x * 2.7 + p.y * 1.9) * sin(p.z * 2.3 - p.y * 2.9);
  return 1.0 - smoothstep(0.55, 1.0, c);
}`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
int surfaceIndex = toothSurface(vToothLocal);
vec4 surfaceTint = surfaceIndex < 0 ? vec4(0.0) : uSurface[surfaceIndex];
surfaceTint.a *= surfaceIndex < 0 ? 0.0 : surfacePatch(vToothLocal, surfaceIndex);
diffuseColor.rgb = mix(diffuseColor.rgb, surfaceTint.rgb * (1.0 - 0.45 * surfaceTint.a * surfaceTint.a), surfaceTint.a);`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
totalEmissiveRadiance *= 1.0 - surfaceTint.a;`,
      );
  };
  return material;
};

/**
 * A tooth's material. `state` is { picked, hovered, restoration, surfaces,
 * accent }: `restoration` is "crown" or "implant", `surfaces` the tints by
 * surface id. Untouched teeth share one material; see materialKey.
 */
export const createToothMaterial = ({ picked, hovered, restoration, surfaces, accent, size }) => {
  const look = {};
  if (restoration === "crown") {
    Object.assign(look, { color: "#EFD07A", metalness: 0.72, roughness: 0.26 });
  } else if (restoration === "implant") {
    Object.assign(look, { color: "#C2CCD8", metalness: 0.88, roughness: 0.32 });
  }
  if (picked) {
    Object.assign(look, { emissive: accent, emissiveIntensity: 0.16 });
  } else if (hovered) {
    Object.assign(look, { emissive: "#7FC8FF", emissiveIntensity: 0.14 });
  }
  const material = enamel(look);
  return surfaces ? withSurfaces(material, size, surfaces) : material;
};

export const materialKey = ({ picked, hovered, restoration, surfaces, accent, size }) =>
  [
    picked ? accent : "",
    hovered ? "h" : "",
    restoration || "",
    surfaces ? `${size.a}:${JSON.stringify(surfaces)}` : "",
  ].join("|");

export const hexToRgb = (hex) => new Color(hex).toArray();

const rim = (color, power, floor, strength, additive = false) =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: additive ? AdditiveBlending : undefined,
    uniforms: {
      uColor: { value: new Color(color) },
      uPower: { value: power },
      uFloor: { value: floor },
      uStrength: { value: strength },
    },
    // Clipping planes, when a material has some, hide the unformed part of
    // a growing tooth (see the age timeline).
    clipping: true,
    vertexShader: `
#include <clipping_planes_pars_vertex>
varying vec3 vNormalView;
varying vec3 vToCamera;
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vNormalView = normalize(normalMatrix * normal);
  vToCamera = normalize(-mvPosition.xyz);
  gl_Position = projectionMatrix * mvPosition;
  #include <clipping_planes_vertex>
}`,
    fragmentShader: `
uniform vec3 uColor;
uniform float uPower;
uniform float uFloor;
uniform float uStrength;
varying vec3 vNormalView;
varying vec3 vToCamera;
#include <clipping_planes_pars_fragment>
void main() {
  #include <clipping_planes_fragment>
  float rim = pow(1.0 - abs(dot(normalize(vNormalView), normalize(vToCamera))), uPower);
  gl_FragColor = vec4(uColor, (uFloor + rim * uStrength));
}`,
  });

// Shared by every mesh of a scene; disposed with it.
export const createMouthMaterials = () => ({
  gum: new MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.42,
    ...WET,
    sheen: 0.7,
    sheenColor: new Color("#FF9AA2"),
    sheenRoughness: 0.55,
    ior: 1.42,
  }),
  gumPicked: new MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.42,
    ...WET,
    emissive: "#3AA8FF",
    emissiveIntensity: 0.34,
  }),
  gumHovered: new MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.42,
    ...WET,
    emissive: "#FFFFFF",
    emissiveIntensity: 0.08,
  }),
  tongue: new MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.56,
    clearcoat: 0.42,
    clearcoatRoughness: 0.4,
    sheen: 0.5,
    sheenColor: new Color("#FFB0B0"),
  }),
  bone: new MeshStandardMaterial({ vertexColors: true, roughness: 0.74, metalness: 0 }),
  bonePicked: new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.7,
    emissive: "#3AA8FF",
    emissiveIntensity: 0.36,
  }),
  boneHovered: new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.7,
    emissive: "#FFFFFF",
    emissiveIntensity: 0.09,
  }),
  gumGlass: rim("#FF8FA0", 1.9, 0.03, 0.44),
  boneGlass: rim("#EADFC6", 2.4, 0.015, 0.3),
  xrayTooth: rim("#DFF1FF", 1.15, 0.12, 0.5, true),
  xrayPicked: rim("#3AA8FF", 1.15, 0.2, 0.8, true),
  xrayBone: rim("#8FB6D8", 1.7, 0.035, 0.26, true),
  xraySoft: rim("#6E93B8", 2.2, 0.01, 0.1, true),
  xrayPulp: new MeshStandardMaterial({
    color: "#071122",
    roughness: 1,
    transparent: true,
    opacity: 0.5,
    depthTest: false,
    depthWrite: false,
  }),
});
