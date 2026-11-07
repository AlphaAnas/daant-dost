import { TEETH } from "../data/teeth";

// When each tooth forms, comes through the gum and (baby teeth) falls out, in
// years from birth. Left and right teeth share their values. See section 6 of
// docs/HACKATHON_PLAN.md.

// Permanent teeth by position 1-8: [starts, crownDone, erupts, rootDone].
const PERMANENT = {
  upper: [
    [0.3, 4.5, 7.5, 10],
    [1, 4.5, 8.5, 11],
    [0.35, 6.5, 11.5, 14],
    [1.6, 5.5, 10.5, 13],
    [2.1, 6.5, 11, 13.5],
    [0, 2.75, 6.5, 9.5],
    [2.75, 7.5, 12.5, 15],
    [8, 14, 19, 22],
  ],
  lower: [
    [0.3, 4, 6.5, 9],
    [0.3, 4, 7.5, 10],
    [0.35, 6.5, 9.5, 13],
    [1.9, 6, 11, 13.5],
    [2.4, 6.5, 11.5, 14],
    [0, 2.75, 6.5, 9.5],
    [2.75, 7.5, 12, 15],
    [9, 14, 19, 22],
  ],
};

// Baby teeth A-E: [starts, crownDone] for both jaws, then per jaw
// [erupts, rootDone, fallsOut].
const PRIMARY_FORMING = [
  [-0.4, 0.12],
  [-0.35, 0.2],
  [-0.3, 0.75],
  [-0.35, 0.5],
  [-0.2, 0.9],
];
const PRIMARY = {
  upper: [
    [0.83, 1.5, 6.5],
    [0.92, 2, 7.5],
    [1.58, 3.25, 11],
    [1.33, 2.5, 10],
    [2.42, 3, 11],
  ],
  lower: [
    [0.67, 1.5, 6.5],
    [1.08, 2, 7.5],
    [1.67, 3.25, 10.5],
    [1.33, 2.5, 10],
    [2.25, 3, 11],
  ],
};

const timingOf = (tooth) => {
  const i = tooth.position - 1;
  if (tooth.dentition === "permanent") {
    const [starts, crownDone, erupts, rootDone] = PERMANENT[tooth.arch][i];
    return { starts, crownDone, erupts, rootDone, fallsOut: null };
  }
  const [starts, crownDone] = PRIMARY_FORMING[i];
  const [erupts, rootDone, fallsOut] = PRIMARY[tooth.arch][i];
  return { starts, crownDone, erupts, rootDone, fallsOut };
};

// Tooth id -> { starts, crownDone, erupts, rootDone, fallsOut (null for adult teeth) }.
export const TOOTH_TIMING = Object.freeze(
  Object.fromEntries(TEETH.map((t) => [t.id, Object.freeze(timingOf(t))])),
);

const DENTITION = new Map(TEETH.map((t) => [t.id, t.dentition]));
const THIRD_MOLARS = new Set(["18", "28", "38", "48"]);

export const MAX_AGE = 30;

// Above this a tooth has come through the gum; at 1 it is fully in place.
export const EMERGED = 0.8;

const c = (v) => Math.min(1, Math.max(0, v));

const stateOf = (id, t, age, withThirdMolars) => {
  const dentition = DENTITION.get(id);
  const crownFormed = c((age - t.starts) / (t.crownDone - t.starts));
  const rootFormed = c((age - t.crownDone) / (t.rootDone - t.crownDone));
  const eruption =
    0.8 * c((age - t.crownDone) / (t.erupts - t.crownDone)) + 0.2 * c((age - t.erupts) / 0.75);
  const resorption = t.fallsOut === null ? 0 : c((age - (t.fallsOut - 3)) / 3);
  let phase;
  if (!withThirdMolars && THIRD_MOLARS.has(id)) phase = "absent";
  else if (t.fallsOut !== null && age >= t.fallsOut) phase = "exfoliated";
  else if (age < t.starts) phase = "absent";
  else if (eruption >= EMERGED) phase = "erupted";
  else phase = "developing";
  return {
    id,
    dentition,
    present: phase === "developing" || phase === "erupted",
    phase,
    crownFormed,
    rootFormed,
    eruption,
    resorption,
  };
};

const ageOf = (years) => {
  if (typeof years !== "number" || !Number.isFinite(years)) {
    throw new RangeError(`Age must be a finite number of years, got ${years}`);
  }
  return Math.min(MAX_AGE, Math.max(0, years));
};

/**
 * Every tooth's state at an age, in the order of TEETH: { id, dentition,
 * present, phase ("absent" | "developing" | "erupted" | "exfoliated"),
 * crownFormed, rootFormed, eruption, resorption }, each fraction 0 to 1.
 * `thirdMolars: false` leaves the wisdom teeth out (agenesis).
 */
export const dentitionAtAge = (years, { thirdMolars = true } = {}) => {
  const age = ageOf(years);
  return TEETH.map((t) => stateOf(t.id, TOOTH_TIMING[t.id], age, thirdMolars));
};

// Ids of the teeth through the gum at an age.
export const emergedTeeth = (years, opts) =>
  dentitionAtAge(years, opts)
    .filter((s) => s.phase === "erupted")
    .map((s) => s.id);

// Landmarks for the timeline; `to` marks a span.
export const DENTITION_MILESTONES = Object.freeze([
  { at: 0.5, label: "First tooth" },
  { at: 3, label: "All 20 baby teeth" },
  { at: 6, label: "First adult molars" },
  { at: 6, to: 12, label: "Mixed teeth" },
  { at: 13, label: "Adult teeth except wisdom teeth" },
  { at: 17, to: 21, label: "Wisdom teeth" },
]);
