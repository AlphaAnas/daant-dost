import { z } from "zod/v4";
import { aiEnabled, askJson } from "./ai.js";
import { normalise } from "./engine.js";
import { TEETH, toothById, toothName } from "../src/data/teeth.js";
import { validateCommands, LAYERS, VIEWS } from "../src/shared/sceneCommands.js";

// The AI tutor: answers a learner's question and plans what the 3D mouth
// shows while it explains, as steps of { say, commands }.

const SYSTEM = `You are DaantDost's dental anatomy tutor for dental students. You teach with a 3D model of the mouth that you control.
Answer accurately and briefly (under 120 words in total), in plain English, at undergraduate level. Use FDI tooth numbers (e.g. 36).
Plan 1 to 4 steps. Each step has "say" (one or two sentences) and "commands" that show what the step talks about.
Commands you can use (only these; teeth are FDI ids "11"-"48" for adult teeth):
- {"type":"focusTeeth","teeth":["36"]} fly the camera to teeth
- {"type":"highlight","teeth":["36"],"color":"#13BCFB"} glow teeth (hex colour optional)
- {"type":"clearHighlights"}
- {"type":"setLayer","layer":"gums|bone|roots|teeth|xray"} roots shows roots through the gums, xray shows pulp chambers
- {"type":"setView","view":"front|right|left|upper|lower"}
- {"type":"setArches","arches":"both|upper|lower"}
- {"type":"setJaw","open":0.0-1.0}
- {"type":"section","tooth":"36"} open a cross-section of one tooth (enamel, dentine, pulp)
- {"type":"setAge","years":7} show the mouth at an age from 0 to 25 (baby teeth, eruption); {"type":"setAge","years":null} for adult
- {"type":"focusRegion","region":"palate|tongue|tmj_left|tmj_right|maxilla|mandible|lips|floor_of_mouth|gingiva_upper|gingiva_lower"}
Start the first step with clearHighlights. If the question is not about dentistry or oral anatomy, say so kindly in one step with no commands.
This is education only: never diagnose a real person; suggest they see a dentist for personal symptoms.`;

const CommandSchema = z.object({
  type: z.string(),
  teeth: z.array(z.string()).optional(),
  color: z.string().optional(),
  layer: z.string().optional(),
  view: z.string().optional(),
  arches: z.string().optional(),
  open: z.number().optional(),
  tooth: z.string().optional(),
  region: z.string().optional(),
});
const PlanSchema = z.object({
  answer: z.string(),
  steps: z.array(z.object({ say: z.string(), commands: z.array(CommandSchema) })),
});

const clean = (plan) => ({
  answer: plan.answer,
  steps: plan.steps.slice(0, 5).map((s) => ({ say: s.say, commands: validateCommands(s.commands).commands })),
});

const c = (type, extra = {}) => ({ type, ...extra });

// Offline answers for the questions people ask most, by keyword.
const CANNED = [
  {
    keys: ["lower molar", "two root", "36", "46", "mandibular molar"],
    plan: {
      answer: "Lower first molars (36, 46) have two roots, mesial and distal, flattened from cheek to tongue.",
      steps: [
        { say: "This is 36, the lower left first molar.", commands: [c("clearHighlights"), c("setLayer", { layer: "gums" }), c("focusTeeth", { teeth: ["36"] }), c("highlight", { teeth: ["36"] })] },
        { say: "Peel back the gum and bone: it has two roots, mesial and distal, which spread the load of chewing front to back.", commands: [c("setLayer", { layer: "roots" })] },
        { say: "The mesial root usually holds two canals and the distal root one or two: three or four canals in all.", commands: [c("section", { tooth: "36" })] },
      ],
    },
  },
  {
    keys: ["upper molar", "three root", "16", "26", "maxillary molar", "palatal root"],
    plan: {
      answer: "Upper first molars (16, 26) have three roots: two buccal and one long palatal root.",
      steps: [
        { say: "This is 26, the upper left first molar.", commands: [c("clearHighlights"), c("setView", { view: "left" }), c("focusTeeth", { teeth: ["26"] }), c("highlight", { teeth: ["26"] })] },
        { say: "With the gums see-through you can see three roots: mesiobuccal, distobuccal and the longest, the palatal root.", commands: [c("setLayer", { layer: "roots" })] },
        { say: "The roots sit close to the maxillary sinus, which is why upper molar pain can feel like sinusitis and vice versa.", commands: [c("setLayer", { layer: "xray" })] },
      ],
    },
  },
  {
    keys: ["fdi", "number", "notation", "quadrant", "palmer", "universal"],
    plan: {
      answer: "FDI numbers have two digits: the quadrant (1 upper right, 2 upper left, 3 lower left, 4 lower right) then the position from the midline (1 to 8).",
      steps: [
        { say: "The first digit is the quadrant, counted clockwise from the patient's upper right: 1, 2, 3, 4.", commands: [c("clearHighlights"), c("setLayer", { layer: "teeth" }), c("setView", { view: "front" }), c("highlight", { teeth: ["11", "21", "31", "41"] })] },
        { say: "The second digit counts back from the midline: 1 central incisor, 3 canine, 6 first molar, 8 wisdom tooth.", commands: [c("highlight", { teeth: ["13", "16", "18"], color: "#FFB020" })] },
        { say: "So 16 is the upper right first molar and 36 the lower left first molar. Baby teeth use quadrants 5 to 8.", commands: [c("focusTeeth", { teeth: ["16"] })] },
      ],
    },
  },
  {
    keys: ["layer", "enamel", "dentin", "dentine", "pulp", "inside", "structure", "cross section", "section"],
    plan: {
      answer: "A tooth has three layers: hard enamel on the crown, dentine underneath, and the pulp in the middle with nerves and blood vessels.",
      steps: [
        { say: "Let's cut 11, the upper right central incisor, in half.", commands: [c("clearHighlights"), c("focusTeeth", { teeth: ["11"] }), c("section", { tooth: "11" })] },
        { say: "Enamel is the hardest tissue in the body and covers the crown. Dentine forms the bulk of the tooth and is sensitive when exposed.", commands: [c("highlight", { teeth: ["11"] })] },
        { say: "The pulp runs from the crown down the root canal. In the X-ray view you can see each pulp chamber.", commands: [c("setLayer", { layer: "xray" })] },
      ],
    },
  },
  {
    keys: ["wisdom", "third molar", "38", "48", "18", "28", "impact"],
    plan: {
      answer: "Wisdom teeth (18, 28, 38, 48) are the last teeth to erupt, usually between 17 and 21, and often lack space, so they can become impacted.",
      steps: [
        { say: "These are the four wisdom teeth, at the very back of each quadrant.", commands: [c("clearHighlights"), c("setLayer", { layer: "gums" }), c("setView", { view: "right" }), c("highlight", { teeth: ["18", "28", "38", "48"], color: "#FF7A2F" })] },
        { say: "Lower wisdom teeth sit close to the inferior alveolar nerve in the mandible, which matters when they are removed.", commands: [c("setLayer", { layer: "bone" }), c("focusTeeth", { teeth: ["48"] })] },
      ],
    },
  },
  {
    keys: ["baby teeth", "primary", "erupt", "mixed dentition", "age", "child", "milk teeth"],
    plan: {
      answer: "Children have 20 baby teeth by about 3. From about 6 the adult teeth erupt beneath and behind them, starting with the first molars and lower incisors, until about 12 to 13.",
      steps: [
        { say: "At 3 years all 20 baby teeth are in. Adult teeth are already forming inside the jaw.", commands: [c("clearHighlights"), c("setAge", { years: 3 }), c("setLayer", { layer: "xray" }), c("setView", { view: "front" })] },
        { say: "At 7 we have a mixed mouth: the first adult molars and incisors are in, while baby teeth wait their turn.", commands: [c("setAge", { years: 7 }), c("highlight", { teeth: ["16", "26", "36", "46", "31", "41"] })] },
        { say: "By 13 almost every adult tooth is in place; wisdom teeth follow from about 17.", commands: [c("clearHighlights"), c("setAge", { years: 13 }), c("setLayer", { layer: "gums" })] },
        { say: "And this is the adult mouth.", commands: [c("setAge", { years: null })] },
      ],
    },
  },
  {
    keys: ["canine", "eye tooth", "longest root", "13", "23", "33", "43"],
    plan: {
      answer: "Canines have the longest roots in the mouth, which makes them very stable; they guide the jaw in side-to-side movements.",
      steps: [
        { say: "The four canines sit at the corners of the arches.", commands: [c("clearHighlights"), c("setView", { view: "front" }), c("highlight", { teeth: ["13", "23", "33", "43"] })] },
        { say: "See through the gums: the upper canine root is the longest of all teeth, around 17 mm.", commands: [c("setLayer", { layer: "roots" }), c("focusTeeth", { teeth: ["13"] })] },
      ],
    },
  },
];

const fallbackPlan = (question, context = {}) => {
  const q = ` ${normalise(question)} `;
  const hit = CANNED.find((t) => t.keys.some((k) => q.includes(` ${normalise(k)}`) || q.includes(normalise(k))));
  if (hit) return { ...hit.plan, ai: false };
  const tooth = context.teeth?.find((id) => toothById(id)?.dentition === "permanent");
  if (tooth) {
    const t = toothById(tooth);
    return {
      answer: `${toothName(tooth)}: a ${t.kind} in the ${t.label.split(" ").slice(0, 2).join(" ").toLowerCase()} quadrant.`,
      steps: [
        { say: `This is ${toothName(tooth)}.`, commands: [c("clearHighlights"), c("focusTeeth", { teeth: [tooth] }), c("highlight", { teeth: [tooth] })] },
        { say: "Here are its roots through the gums and bone.", commands: [c("setLayer", { layer: "roots" })] },
        { say: "And cut in half to show enamel, dentine and pulp.", commands: [c("section", { tooth })] },
      ],
      ai: false,
    };
  }
  return {
    answer: "I can explain tooth anatomy, roots, numbering, layers and wisdom teeth. Pick a tooth or try one of the suggested questions.",
    steps: [{ say: "Try asking: how many roots does 36 have? Or: how does FDI numbering work?", commands: [] }],
    ai: false,
  };
};

export const tutorPlan = async (question, context = {}) => {
  if (aiEnabled()) {
    try {
      const teeth = (context.teeth || []).filter((id) => toothById(id)).map(toothName);
      const plan = await askJson({
        system: SYSTEM,
        effort: "medium",
        schema: PlanSchema,
        prompt: `Learner's question: ${question}
On screen now: layer ${LAYERS.includes(context.layer) ? context.layer : "gums"}${teeth.length ? `; selected ${teeth.join(", ")}` : ""}.
Known teeth: ${TEETH.filter((t) => t.dentition === "permanent").length} adult teeth. Views: ${VIEWS.join(", ")}.`,
      });
      return { ...clean(plan), ai: true };
    } catch (err) {
      console.warn("[tutor] fell back:", err?.reason || err?.message);
    }
  }
  return fallbackPlan(question, context);
};

export const TUTOR_SUGGESTIONS = [
  "When do baby teeth fall out?",
  "Why does 36 have two roots?",
  "How does FDI tooth numbering work?",
  "What are the layers inside a tooth?",
  "Where are the wisdom teeth?",
  "Which tooth has the longest root?",
];
