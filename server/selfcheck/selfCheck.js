import { z } from "zod/v4";
import { aiEnabled, askJson } from "../ai.js";
import { toothById } from "../../src/data/teeth.js";
import { validateCommands } from "../../src/shared/sceneCommands.js";
import { plainTooth } from "../../src/shared/plainTooth.js";
import { PROBLEM_BY_ID, PROBLEMS, URGENCY } from "./bank.js";
import { triage } from "./triage.js";

// The patient's self-check result: the rules decide how urgent it is; the AI
// (Qwen) explains it kindly, in the patient's language, without jargon.

const URGENCY_COLOR = { emergency: "#FF3D5E", today: "#FF7A2F", soon: "#FFB020", routine: "#2BD19A" };

export const publicBank = () =>
  PROBLEMS.map(({ id, label, hint, icon, questions }) => ({ id, label, hint, icon, questions }));

const SYSTEM = `You are a kind, calm dental nurse helping a member of the public who knows no dental words.
They did a self-check. You are given what they told you and a SAFETY RESULT worked out by rules: the urgency and the possible causes. You must:
- Never change or soften the urgency; you may only repeat it in your own words.
- Only talk about the possible causes listed; never add others and never say for certain what they have. Say "it could be", "often".
- Use very plain, warm words, short sentences, no jargon. When you must use a dental word, explain it in brackets.
- Write in the requested language.
summary: 2-3 sentences that reflect back what they told you and what it most likely means.
causeNotes: one short personal sentence per listed cause (same order) linking it to what they said.
reassurance: one sentence to reduce worry, honest and not falsely comforting.
words: 2-5 dental words they may hear from the dentist with plain meanings.
This is information, not a diagnosis; they should see a dentist.`;

const Out = z.object({
  summary: z.string(),
  causeNotes: z.array(z.string()),
  reassurance: z.string(),
  words: z.array(z.object({ word: z.string(), meaning: z.string() })),
});

const describeAnswers = (problem, answers) =>
  problem.questions
    .filter((q) => answers[q.id] !== undefined && answers[q.id] !== "")
    .map((q) => `- ${q.text} ${[].concat(answers[q.id]).join(", ")}`)
    .join("\n");

export const selfCheckResult = async ({ problem: problemId, answers = {}, story = "", teeth = [], who = "me", age, language = "English" }) => {
  const problem = PROBLEM_BY_ID[problemId];
  if (!problem) return null;
  const base = triage(problemId, answers, story);
  const validTeeth = [].concat(teeth).map(String).filter((id) => toothById(id)).slice(0, 4);
  const color = URGENCY_COLOR[base.urgency.level];
  const commands = validTeeth.length
    ? validateCommands([
        { type: "clearHighlights" },
        { type: "setLayer", layer: "gums" },
        { type: "focusTeeth", teeth: validTeeth },
        { type: "highlight", teeth: validTeeth, color },
      ]).commands
    : [];
  const result = {
    ...base,
    color,
    teeth: validTeeth.map((id) => ({ id, plain: plainTooth(id) })),
    commands,
    summary: `You told us about ${problem.label.toLowerCase()}${validTeeth.length ? ` around your ${plainTooth(validTeeth[0])}` : ""}. Based on your answers, here is what it could be and what to do next.`,
    reassurance: "Most dental problems are very treatable, especially when they're seen early.",
    words: base.causes.map((c) => ({ word: c.term, meaning: c.name })),
    language: "English",
    ai: false,
  };
  if (!aiEnabled()) return result;
  try {
    const out = await askJson({
      system: SYSTEM,
      effort: "medium",
      schema: Out,
      prompt: `Language: ${language}
Who: ${who === "child" ? `their child${age ? `, aged ${age}` : ""}` : "themselves"}
Problem: ${problem.label}
Where: ${validTeeth.map(plainTooth).join("; ") || "not marked"}
In their own words: ${story || "(nothing extra)"}
Their answers:
${describeAnswers(problem, answers)}

SAFETY RESULT (do not change): urgency "${base.urgency.title}"${base.redFlags.length ? `; warning signs: ${base.redFlags.join(", ")}` : ""}.
Possible causes, in order:
${base.causes.map((c, i) => `${i + 1}. ${c.name} (${c.term}, ${c.likelihood}): ${c.explain}`).join("\n")}`,
    });
    return {
      ...result,
      summary: out.summary,
      reassurance: out.reassurance,
      causes: result.causes.map((c, i) => ({ ...c, note: out.causeNotes[i] || "" })),
      words: out.words.slice(0, 5),
      language,
      ai: true,
    };
  } catch (err) {
    console.warn("[selfcheck] fell back:", err?.reason || err?.message);
    return result;
  }
};

const ASK_SYSTEM = `You are a kind dental nurse answering a member of the public's follow-up question after their self-check.
Answer in very plain words, 2-5 short sentences, in the requested language. Explain any dental word in brackets.
Never diagnose, never contradict or lower the urgency you are given, and never recommend prescription medicines or doses beyond "follow the packet".
If the question describes breathing or swallowing trouble, spreading swelling or heavy bleeding, tell them to get emergency help now.`;

export const selfCheckAnswer = async ({ question, context = {}, language = "English" }) => {
  const urgency = URGENCY[context.urgency] || null;
  const fallback = {
    answer: `Good question to ask your dentist. ${urgency ? urgency.action : "If you're worried, call your dentist for advice."}`,
    ai: false,
  };
  if (!aiEnabled()) return fallback;
  try {
    const out = await askJson({
      system: ASK_SYSTEM,
      effort: "low",
      schema: z.object({ answer: z.string() }),
      prompt: `Language: ${language}
Their self-check: ${context.problem || "unknown"}; urgency "${urgency?.title || "unknown"}"; possible causes: ${(context.causes || []).join(", ") || "unknown"}.
Their question: ${question}`,
    });
    return { answer: out.answer, ai: true };
  } catch (err) {
    console.warn("[selfcheck ask] fell back:", err?.reason || err?.message);
    return fallback;
  }
};
