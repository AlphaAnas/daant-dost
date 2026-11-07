import { TEETH, toothById } from "../../data/teeth.js";

// Quiz rounds built from the tooth catalogue. Pure, apart from the random
// source, which tests can replace.

const PERMANENT = TEETH.filter((t) => t.dentition === "permanent");
const quadrantOf = (t) => Number(t.id[0]);

// Universal (ADA) numbering: 1 = upper right third molar, clockwise to 32.
export const universalOf = (id) => {
  const t = toothById(id);
  const p = t.position;
  return { 1: 9 - p, 2: 8 + p, 3: 25 - p, 4: 24 + p }[quadrantOf(t)];
};

// Palmer: quadrant name and position, e.g. UR6.
export const palmerOf = (id) => toothById(id).aliases[0];

export const KIND_LABEL = { incisor: "Incisor", canine: "Canine", premolar: "Premolar", molar: "Molar" };

const shuffle = (list, rand) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const options = (right, pool, rand, n = 4) =>
  shuffle([right, ...shuffle(pool.filter((x) => x !== right), rand).slice(0, n - 1)], rand);

const nameOf = (t) => t.label;

export const QUIZ_MODES = [
  { id: "find", title: "Find the tooth", body: "Click the tooth on the 3D mouth.", uses3d: true },
  { id: "fdi", title: "FDI numbering", body: "Name to number, number to name." },
  { id: "systems", title: "Palmer and Universal", body: "Translate between the three systems." },
  { id: "types", title: "Tooth types", body: "Incisor, canine, premolar or molar?" },
];

const MAKERS = {
  find: (t, rand) => ({
    prompt: rand() < 0.5 ? `Click ${t.id}` : `Click the ${nameOf(t).toLowerCase()}`,
    kind: "tooth",
    answer: t.id,
  }),
  fdi: (t, rand) =>
    rand() < 0.5
      ? { prompt: `What is the FDI number of the ${nameOf(t).toLowerCase()}?`, kind: "choice", answer: t.id, options: options(t.id, PERMANENT.map((x) => x.id), rand) }
      : { prompt: `Which tooth is ${t.id}?`, kind: "choice", answer: nameOf(t), options: options(nameOf(t), PERMANENT.map(nameOf), rand) },
  systems: (t, rand) => {
    const u = String(universalOf(t.id));
    const p = palmerOf(t.id);
    const pick = Math.floor(rand() * 3);
    if (pick === 0) return { prompt: `FDI ${t.id} in Universal numbering is…`, kind: "choice", answer: u, options: options(u, PERMANENT.map((x) => String(universalOf(x.id))), rand) };
    if (pick === 1) return { prompt: `Universal #${u} in FDI is…`, kind: "choice", answer: t.id, options: options(t.id, PERMANENT.map((x) => x.id), rand) };
    return { prompt: `FDI ${t.id} in Palmer notation is…`, kind: "choice", answer: p, options: options(p, PERMANENT.map((x) => palmerOf(x.id)), rand) };
  },
  types: (t, rand) => ({
    prompt: `What type of tooth is ${t.id}?`,
    kind: "choice",
    answer: KIND_LABEL[t.kind],
    options: shuffle(Object.values(KIND_LABEL), rand),
  }),
};

// A round of `size` questions. Teeth the learner got wrong before come up
// more often: `weights` maps tooth id to a miss count.
export const buildRound = (mode, { size = 10, weights = {}, rand = Math.random } = {}) => {
  const pool = PERMANENT.flatMap((t) => Array(1 + Math.min(4, weights[t.id] || 0) * 2).fill(t));
  const picked = [];
  const used = new Set();
  for (const t of shuffle(pool, rand)) {
    if (used.has(t.id)) continue;
    used.add(t.id);
    picked.push(t);
    if (picked.length === size) break;
  }
  return picked.map((t, i) => ({ id: `${mode}-${i}`, tooth: t.id, mode, ...MAKERS[mode](t, rand) }));
};

export const isCorrect = (q, answer) => String(answer) === String(q.answer);

export const XP_PER_CORRECT = 10;
