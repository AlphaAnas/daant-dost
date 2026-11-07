import { randomUUID } from "node:crypto";
import { z } from "zod/v4";
import { aiEnabled, askJson } from "./ai.js";
import { totalPoints } from "./engine.js";
import { toothById } from "../src/data/teeth.js";

// AI-written stations. Claude writes the clinical content; the server builds
// it into the fixed six-question blueprint, so marking stays consistent and
// every case is worth 100 points.

const SITES = ["teeth", "third_molar", "gingiva", "mucosa", "jaw", "tmj"];

const RawCase = z.object({
  title: z.string(),
  site: z.enum(SITES),
  difficulty: z.number(),
  patient: z.object({
    name: z.string(),
    age: z.number(),
    sex: z.enum(["female", "male"]),
    complaint: z.string(),
    opening: z.string(),
    personality: z.string(),
  }),
  historyTopics: z.array(z.object({ id: z.string(), label: z.string(), keywords: z.array(z.string()), answer: z.string() })),
  requiredTopics: z.array(z.string()),
  keyTooth: z.string(),
  findQuestion: z.string(),
  findExplain: z.string(),
  findReveal: z.string(),
  testOptions: z.array(z.string()),
  testAnswers: z.array(z.string()),
  testExplain: z.string(),
  testFindings: z.array(z.object({ test: z.string(), finding: z.string() })),
  diagnosisOptions: z.array(z.string()),
  diagnosis: z.string(),
  diagnosisExplain: z.string(),
  justification: z.string(),
  justificationKeyPoints: z.array(z.array(z.string())),
  managementOptions: z.array(z.string()),
  management: z.string(),
  managementExplain: z.string(),
  communicationQuestion: z.string(),
  communicationAnswer: z.string(),
  communicationKeyPoints: z.array(z.array(z.string())),
  teachingPoints: z.array(z.string()),
});

const SYSTEM = `You write OSCE-style training stations for dental students. The patient is fictional.
Write clinically accurate, guideline-consistent content (current UK/European undergraduate standards). The station must have one clear best diagnosis and one best management.
Rules:
- keyTooth: a permanent FDI tooth id "11"-"48" matching the scenario. findQuestion asks the student to click that tooth on the 3D mouth, describing where the patient points (do not give the FDI number).
- historyTopics: 6-9 topics with short snake_case ids, a label, 4-8 lowercase keywords a student might use when asking, and the patient's answer in everyday words. requiredTopics: the 5-6 ids a competent student must cover.
- testOptions: exactly 6 tests, of which 2-3 are the right ones (testAnswers, copied exactly from testOptions); testFindings gives a finding for every option.
- diagnosisOptions: exactly 5 plausible conditions including the diagnosis (copied exactly).
- managementOptions: exactly 5, including management (copied exactly).
- justificationKeyPoints and communicationKeyPoints: 3-4 key ideas, each a list of 2-6 lowercase synonyms or short phrases for that idea.
- communicationQuestion: something the patient asks or worries about; communicationAnswer: a model plain-English reply including safety-netting where relevant.
- teachingPoints: 3 short, memorable points. difficulty: 1-3.`;

const neighbours = (id) => {
  const t = toothById(id);
  return Object.fromEntries(
    [t.position - 1, t.position + 1]
      .filter((p) => p >= 1 && p <= 8)
      .map((p) => [`${id[0]}${p}`, 0.5]),
  );
};

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

const must = (ok, message) => {
  if (!ok) throw new Error(`Generated case rejected: ${message}`);
};

// Builds a playable case card from Claude's raw output, or throws.
export const assembleCase = (raw, { author } = {}) => {
  const tooth = String(raw.keyTooth);
  must(toothById(tooth)?.dentition === "permanent", `key tooth ${tooth}`);
  must(raw.testAnswers.length && raw.testAnswers.every((a) => raw.testOptions.includes(a)), "test answers");
  must(raw.diagnosisOptions.includes(raw.diagnosis), "diagnosis option");
  must(raw.managementOptions.includes(raw.management), "management option");
  const topicIds = new Set(raw.historyTopics.map((t) => t.id));
  const required = raw.requiredTopics.filter((id) => topicIds.has(id));
  must(required.length >= 3, "history topics");
  must(raw.justificationKeyPoints.length && raw.communicationKeyPoints.length, "key points");

  const card = {
    id: `ai-${slug(raw.title)}-${randomUUID().slice(0, 6)}`,
    title: raw.title,
    site: raw.site,
    difficulty: Math.min(3, Math.max(1, Math.round(raw.difficulty))),
    minutes: 6,
    generated: true,
    author: author || null,
    createdAt: new Date().toISOString(),
    patient: { ...raw.patient, age: Math.round(raw.patient.age) },
    history: {
      points: 15,
      required,
      topics: raw.historyTopics.map((t) => ({ ...t, keywords: t.keywords.map((k) => k.toLowerCase()) })),
    },
    items: [
      { id: "find", stage: "examination", competency: "examination", type: "tooth", points: 10, question: raw.findQuestion, helper: "Click a tooth on the 3D mouth, then send.", answer: [tooth], partial: neighbours(tooth), explain: raw.findExplain, reveal: raw.findReveal, commands: [{ type: "focusTeeth", teeth: [tooth] }, { type: "highlight", teeth: [tooth], color: "#FFB020" }] },
      { id: "tests", stage: "investigations", competency: "investigations", type: "multi", points: 15, question: "Which tests would help you most now? Select all that apply.", options: raw.testOptions, answer: raw.testAnswers, explain: raw.testExplain, findings: Object.fromEntries(raw.testFindings.map((f) => [f.test, f.finding])) },
      { id: "dx", stage: "diagnosis", competency: "diagnosis", type: "single", points: 25, question: "What is the most likely diagnosis?", options: raw.diagnosisOptions, answer: [raw.diagnosis], explain: raw.diagnosisExplain },
      { id: "why", stage: "diagnosis", competency: "diagnosis", type: "text", points: 10, question: "In one or two sentences, justify your diagnosis.", expected: raw.justification, keywords: raw.justificationKeyPoints },
      { id: "plan", stage: "management", competency: "management", type: "single", points: 15, question: "What is the best management?", options: raw.managementOptions, answer: [raw.management], explain: raw.managementExplain },
      { id: "talk", stage: "management", competency: "communication", type: "text", points: 10, question: raw.communicationQuestion, expected: raw.communicationAnswer, keywords: raw.communicationKeyPoints },
    ],
    diagnosis: raw.diagnosis,
    keyTeeth: [tooth],
    teachingPoints: raw.teachingPoints.slice(0, 4),
  };
  must(totalPoints(card) === 100, "points");
  return card;
};

export const generateCase = async (brief, { difficulty, author } = {}) => {
  if (!aiEnabled()) {
    const err = new Error("Creating cases needs the AI. Add an ANTHROPIC_API_KEY to the server.");
    err.status = 503;
    throw err;
  }
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const raw = await askJson({
        system: SYSTEM,
        effort: "high",
        maxTokens: 8000,
        schema: RawCase,
        prompt: `Write a station from this brief: "${brief}".${difficulty ? ` Difficulty: ${difficulty} of 3.` : ""}`,
      });
      return assembleCase(raw, { author });
    } catch (err) {
      lastError = err;
      console.warn("[caseAuthor] attempt failed:", err?.reason || err?.message);
    }
  }
  const err = new Error("The AI couldn't write a valid case from that brief. Try rewording it.");
  err.status = 502;
  err.cause = lastError;
  throw err;
};
