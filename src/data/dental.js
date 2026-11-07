import { regionOfTooth, surfaceLetter, toothById } from "./teeth";

// Oral sites offered on the 3D mouth and in the site list.
export const DENTAL_REGIONS = [
  { id: "quadrant_ur", label: "Upper right quadrant", group: "teeth", kind: "quadrant" },
  { id: "quadrant_ul", label: "Upper left quadrant", group: "teeth", kind: "quadrant" },
  { id: "quadrant_ll", label: "Lower left quadrant", group: "teeth", kind: "quadrant" },
  { id: "quadrant_lr", label: "Lower right quadrant", group: "teeth", kind: "quadrant" },
  { id: "gingiva_upper", label: "Upper gums", group: "gingiva", kind: "soft" },
  { id: "gingiva_lower", label: "Lower gums", group: "gingiva", kind: "soft" },
  { id: "palate", label: "Palate", group: "mucosa", kind: "soft" },
  { id: "tongue", label: "Tongue", group: "mucosa", kind: "soft" },
  { id: "floor_of_mouth", label: "Floor of mouth", group: "mucosa", kind: "soft" },
  { id: "buccal_mucosa_right", label: "Right cheek lining", group: "mucosa", kind: "soft" },
  { id: "buccal_mucosa_left", label: "Left cheek lining", group: "mucosa", kind: "soft" },
  { id: "lips", label: "Lips", group: "mucosa", kind: "soft" },
  { id: "maxilla", label: "Maxilla", group: "jaw", kind: "bone" },
  { id: "mandible", label: "Mandible", group: "jaw", kind: "bone" },
  { id: "tmj_right", label: "Right TMJ", group: "tmj", kind: "joint" },
  { id: "tmj_left", label: "Left TMJ", group: "tmj", kind: "joint" },
];

export const dentalRegionById = (id) => DENTAL_REGIONS.find((r) => r.id === id);

// Findings charted on a tooth. `color` is the tint on the 3D model and the
// odontogram; `surfaced` findings can be placed on individual surfaces.
export const TOOTH_CONDITIONS = [
  { id: "caries", label: "Caries", color: "#7A4A22", surfaced: true },
  { id: "fractured", label: "Fractured", color: "#E5484D" },
  { id: "filling", label: "Filling", color: "#7E8CA3", surfaced: true },
  { id: "crown", label: "Crown", color: "#D9B24C" },
  { id: "root_treated", label: "Root treated", color: "#A65FD6" },
  { id: "abscess", label: "Abscess", color: "#FF5A36" },
  { id: "mobile", label: "Mobile", color: "#F59E0B" },
  { id: "impacted", label: "Impacted", color: "#0EA5A0" },
  { id: "implant", label: "Implant", color: "#64748B" },
  { id: "missing", label: "Missing", color: "#94A3B8" },
];

export const conditionById = (id) => TOOTH_CONDITIONS.find((c) => c.id === id);

// Study notes for each oral site: the structures to know, the conditions a
// student should be able to tell apart there, and the tests that separate
// them. Teaching content for the explorer and the case assessments.
export const SITE_STUDY_NOTES = {
  teeth: {
    structures: ["Enamel and dentine", "Pulp and root canals", "Periodontal ligament", "Periapical bone", "Restorations"],
    differentials: [
      "Dentine hypersensitivity",
      "Reversible pulpitis",
      "Symptomatic irreversible pulpitis",
      "Pulp necrosis",
      "Symptomatic apical periodontitis",
      "Acute apical abscess",
      "Cracked tooth",
    ],
    tests: ["Cold test", "Electric pulp test", "Percussion", "Apical palpation", "Bite test", "Periapical radiograph", "Transillumination"],
  },
  third_molar: {
    structures: ["Third molar and follicle", "Operculum", "Inferior alveolar nerve", "Lingual nerve", "Distal of second molar"],
    differentials: ["Pericoronitis", "Distal caries of second molar", "Dentigerous cyst", "Pericoronal abscess", "Deep space infection"],
    tests: ["Mouth opening (mm)", "Operculum and pus", "OPG", "Winter's classification", "CBCT if close to the canal"],
  },
  gingiva: {
    structures: ["Marginal gingiva", "Attached gingiva", "Periodontal ligament", "Alveolar crest", "Furcations"],
    differentials: [
      "Plaque-induced gingivitis",
      "Periodontitis (stage and grade)",
      "Periodontal abscess",
      "Necrotising gingivitis",
      "Drug-induced enlargement",
      "Leukaemic infiltration",
    ],
    tests: ["BPE / probing depths", "Bleeding on probing", "Mobility grade", "Furcation involvement", "Bitewing radiographs", "HbA1c if diabetic"],
  },
  mucosa: {
    structures: ["Lining mucosa", "Tongue and lateral borders", "Floor of mouth", "Minor salivary glands", "Regional lymph nodes"],
    differentials: [
      "Traumatic ulcer",
      "Recurrent aphthous stomatitis",
      "Oral candidosis",
      "Oral lichen planus",
      "Leukoplakia or erythroplakia",
      "Oral squamous cell carcinoma",
      "Mucocele or ranula",
    ],
    tests: ["Lesion size and duration", "Induration", "Wipe test", "Neck node palpation", "Incisional biopsy"],
  },
  jaw: {
    structures: ["Alveolar process", "Basal bone", "Inferior alveolar canal", "Maxillary sinus", "Mental foramen"],
    differentials: [
      "Dry socket",
      "Mandibular or maxillary fracture",
      "Osteomyelitis",
      "Medication-related osteonecrosis",
      "Odontogenic cyst or tumour",
      "Odontogenic sinusitis",
    ],
    tests: ["Occlusion", "Step deformity", "Lip and chin sensation", "OPG", "CBCT"],
  },
  tmj: {
    structures: ["Condyle", "Articular disc", "Masseter and temporalis", "Lateral pterygoid", "Joint capsule"],
    differentials: [
      "Myofascial pain",
      "Disc displacement with reduction",
      "Disc displacement without reduction",
      "TMJ osteoarthritis",
      "TMJ dislocation",
      "Giant cell arteritis (age over 50)",
    ],
    tests: ["Maximum opening (mm)", "Joint sounds", "Muscle palpation", "Deviation on opening", "Bruxism wear facets"],
  },
};

export const SITE_TITLES = {
  teeth: "Tooth and pulp",
  third_molar: "Wisdom teeth",
  gingiva: "Gums and periodontium",
  mucosa: "Oral mucosa",
  jaw: "Jaw bones",
  tmj: "Jaw joint (TMJ)",
};

export const dentalRegionGroup = (regionId, teeth = []) => {
  if (teeth.length && teeth.every((id) => toothById(id)?.position === 8)) {
    return "third_molar";
  }
  return dentalRegionById(regionId)?.group || null;
};

// "Tooth 36 (O, D): caries" for a chart row.
export const chartRowLabel = ({ tooth, surfaces = [], conditions = [] }) => {
  const t = toothById(tooth);
  if (!t) return "";
  const where = surfaces.length
    ? ` (${surfaces.map((s) => surfaceLetter(t, s)).join("")})`
    : "";
  const what = conditions
    .map((c) => conditionById(c)?.label.toLowerCase())
    .filter(Boolean)
    .join(", ");
  return `Tooth ${t.id}${where}${what ? `: ${what}` : ""}`;
};

export const quadrantOf = (id) => {
  const tooth = toothById(id);
  return tooth ? regionOfTooth(tooth) : null;
};
