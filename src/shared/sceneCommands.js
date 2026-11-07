import { TEETH } from "../data/teeth";
import { DENTAL_REGIONS, TOOTH_CONDITIONS } from "../data/dental";

// Everything that moves the 3D mouth is one of these commands: buttons,
// keyboard, the AI tutor and examiner, and treatment walkthroughs. The server
// validates AI output with the same function before sending it on.

const TOOTH_IDS = new Set(TEETH.map((t) => t.id));
const REGION_IDS = new Set(DENTAL_REGIONS.map((r) => r.id));
const CONDITION_IDS = new Set(TOOTH_CONDITIONS.map((c) => c.id));
export const LAYERS = ["gums", "bone", "roots", "teeth", "xray"];
export const VIEWS = ["front", "right", "left", "upper", "lower"];
export const ARCHES = ["both", "upper", "lower"];
const SURFACES = new Set(["O", "M", "D", "B", "L"]);

const isTeeth = (v) => Array.isArray(v) && v.length > 0 && v.length <= 32 && v.every((id) => TOOTH_IDS.has(String(id)));
const isNumber = (v) => typeof v === "number" && Number.isFinite(v);
const isColor = (v) => v === undefined || (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v));
const isSurfaces = (v) => v === undefined || (Array.isArray(v) && v.every((s) => SURFACES.has(s)));

const RULES = {
  focusTeeth: (c) => isTeeth(c.teeth),
  focusRegion: (c) => REGION_IDS.has(c.region),
  setView: (c) => VIEWS.includes(c.view),
  setLayer: (c) => LAYERS.includes(c.layer),
  setArches: (c) => ARCHES.includes(c.arches),
  setJaw: (c) => isNumber(c.open),
  setAge: (c) => c.years === null || isNumber(c.years),
  highlight: (c) => isTeeth(c.teeth) && isColor(c.color) && isSurfaces(c.surfaces),
  clearHighlights: () => true,
  section: (c) => c.tooth === null || TOOTH_IDS.has(String(c.tooth)),
  showCondition: (c) => TOOTH_IDS.has(String(c.tooth)) && CONDITION_IDS.has(c.condition) && isSurfaces(c.surfaces),
  clearConditions: () => true,
  setSpin: (c) => typeof c.on === "boolean",
  wait: (c) => isNumber(c.ms) && c.ms >= 0 && c.ms <= 10000,
  reset: () => true,
};

export const COMMAND_TYPES = Object.keys(RULES);

export const isSceneCommand = (c) =>
  !!c && typeof c === "object" && Object.hasOwn(RULES, c.type) && RULES[c.type](c);

// Keeps the valid commands, in order, and counts what it dropped.
export const validateCommands = (list) => {
  const commands = [];
  let rejected = 0;
  (Array.isArray(list) ? list : []).forEach((c) => {
    if (isSceneCommand(c)) {
      const clean = { ...c };
      if (clean.teeth) clean.teeth = clean.teeth.map(String);
      if (clean.tooth != null) clean.tooth = String(clean.tooth);
      commands.push(clean);
    } else rejected += 1;
  });
  return { commands, rejected };
};
