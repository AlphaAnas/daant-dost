// The human dentition in FDI notation, with search. The 32 permanent and 20
// primary teeth. Kept identical to utils/teeth.js in the backend.
//
// Each tooth: id (its FDI number as a string), label, section (its quadrant),
// arch, side, position (1 at the midline), dentition, kind and aliases (other
// names a clinician might search for, including Palmer shorthand like "UR6").

export const TOOTH_SECTIONS = [
  { id: "ur", label: "Upper right", arch: "upper", side: "right", region: "quadrant_ur" },
  { id: "ul", label: "Upper left", arch: "upper", side: "left", region: "quadrant_ul" },
  { id: "ll", label: "Lower left", arch: "lower", side: "left", region: "quadrant_ll" },
  { id: "lr", label: "Lower right", arch: "lower", side: "right", region: "quadrant_lr" },
];

const PERMANENT = [
  ["central incisor", "incisor", ["front tooth"]],
  ["lateral incisor", "incisor", []],
  ["canine", "canine", ["cuspid", "eye tooth"]],
  ["first premolar", "premolar", ["first bicuspid"]],
  ["second premolar", "premolar", ["second bicuspid"]],
  ["first molar", "molar", ["six year molar"]],
  ["second molar", "molar", ["twelve year molar"]],
  ["third molar", "molar", ["wisdom tooth"]],
];

const PRIMARY = [
  ["primary central incisor", "incisor", ["baby tooth"]],
  ["primary lateral incisor", "incisor", ["baby tooth"]],
  ["primary canine", "canine", ["baby tooth"]],
  ["primary first molar", "molar", ["baby tooth"]],
  ["primary second molar", "molar", ["baby tooth"]],
];

const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const TEETH_LIST = [];

const addQuadrant = (section, digit, names, dentition) => {
  const shorthand = section.id.toUpperCase();
  names.forEach(([name, kind, aliases], i) => {
    const position = i + 1;
    TEETH_LIST.push({
      id: `${digit}${position}`,
      label: `${capitalise(section.label.toLowerCase())} ${name}`,
      section: section.id,
      arch: section.arch,
      side: section.side,
      position,
      dentition,
      kind,
      aliases:
        dentition === "permanent"
          ? [`${shorthand}${position}`, ...aliases]
          : [`${shorthand}${"ABCDE"[i]}`, ...aliases],
    });
  });
};

TOOTH_SECTIONS.forEach((section, i) => {
  addQuadrant(section, i + 1, PERMANENT, "permanent");
  addQuadrant(section, i + 5, PRIMARY, "primary");
});

export const TEETH = TEETH_LIST;

const BY_ID = new Map(TEETH.map((t) => [t.id, t]));

export const toothById = (id) => BY_ID.get(id);
export const sectionOfTooth = (tooth) =>
  TOOTH_SECTIONS.find((s) => s.id === tooth.section);
export const regionOfTooth = (tooth) => sectionOfTooth(tooth).region;

// "FDI 36, Lower left first molar" reads as the clinician says it.
export const toothName = (id) => {
  const tooth = toothById(id);
  return tooth ? `${tooth.id} ${tooth.label}` : "";
};

// Which way each surface faces depends on the tooth: incisal and labial at
// the front, palatal on the upper arch.
export const SURFACE_IDS = ["O", "M", "D", "B", "L"];

export const surfaceName = (tooth, id) => {
  const front = tooth.kind === "incisor" || tooth.kind === "canine";
  return {
    O: front ? "Incisal" : "Occlusal",
    M: "Mesial",
    D: "Distal",
    B: front ? "Labial" : "Buccal",
    L: tooth.arch === "upper" ? "Palatal" : "Lingual",
  }[id];
};

export const surfaceLetter = (tooth, id) => surfaceName(tooth, id).charAt(0);

const words = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

const HAYSTACK = new Map(
  TEETH.map((t) => [t.id, words([t.id, t.label, t.kind, ...t.aliases].join(" "))]),
);

// Teeth whose number, name or aliases start with every word of the query
// ("36", "UL6", "lower wisdom"), permanent first. `region` limits the list to
// one quadrant.
export const searchTeeth = (query, { region, dentition } = {}) => {
  const terms = words(query || "");
  return TEETH.filter((t) => {
    if (region && regionOfTooth(t) !== region) return false;
    if (dentition && t.dentition !== dentition) return false;
    const hay = HAYSTACK.get(t.id);
    return terms.every((term) => hay.some((w) => w.startsWith(term)));
  });
};
