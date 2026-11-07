import { z } from "zod/v4";
import { aiEnabled, askJson } from "./ai.js";
import { fallbackPatientReply, gradeTextFallback } from "./engine.js";

// The AI side of an assessment: the patient's voice, marking of written
// answers and the personal feedback. Each falls back to the engine's
// deterministic version when the AI is off or fails.

const warn = (what, err) => console.warn(`[assessor] ${what} fell back:`, err?.reason || err?.message);

const PATIENT_SYSTEM = `You play a fictional dental patient in a training station for dental students.
Stay in character: speak like an ordinary person, never like a clinician, in 1 to 3 short sentences.
Only reveal facts from the FACTS list, and only those the student's question actually asks about. Do not volunteer other facts.
If asked something not covered by the facts, answer vaguely and plausibly without inventing new symptoms that would change the diagnosis.
Never name or hint at the diagnosis. If the student is rude or off-topic, react as a real patient would.
Return the ids of every fact you revealed in "topics".`;

export const patientReply = async (card, attempt, question) => {
  if (aiEnabled()) {
    try {
      const facts = card.history.topics.map((t) => `- [${t.id}] ${t.label}: ${t.answer}`).join("\n");
      const recent = attempt.transcript
        .filter((m) => m.role === "student" || m.role === "patient")
        .slice(-8)
        .map((m) => `${m.role === "student" ? "Student" : "You"}: ${m.text}`)
        .join("\n");
      const out = await askJson({
        system: PATIENT_SYSTEM,
        effort: "low",
        schema: z.object({ reply: z.string(), topics: z.array(z.string()) }),
        prompt: `You are ${card.patient.name}, ${card.patient.age}, ${card.patient.sex}. Personality: ${card.patient.personality}.
Why you came: ${card.patient.complaint}

FACTS:
${facts}

Conversation so far:
${recent}

Student now asks: "${question}"`,
      });
      const known = new Set(card.history.topics.map((t) => t.id));
      return { reply: out.reply.trim(), topics: out.topics.filter((t) => known.has(t)), ai: true };
    } catch (err) {
      warn("patient", err);
    }
  }
  return { ...fallbackPatientReply(card, question), ai: false };
};

const MARKER_SYSTEM = `You are a fair, encouraging dental examiner marking a student's short written answer.
Mark against the MODEL ANSWER and KEY POINTS only. Give credit for the same idea in different words, and ignore spelling.
score: 0 to 1 (1 = all key points, sound reasoning; deduct for unsafe or wrong statements).
feedback: one or two sentences to the student: what was good and the most important thing missing. Plain English.`;

export const gradeText = async (card, item, text) => {
  if (aiEnabled() && String(text).trim()) {
    try {
      const out = await askJson({
        system: MARKER_SYSTEM,
        effort: "medium",
        schema: z.object({ score: z.number(), feedback: z.string() }),
        prompt: `Case: ${card.patient.name}, ${card.patient.age}. Correct diagnosis: ${card.diagnosis}.
QUESTION: ${item.question}
MODEL ANSWER: ${item.expected}
KEY POINTS: ${item.keywords.map((g) => g[0]).join("; ")}
STUDENT ANSWER: ${text}`,
      });
      return { score: Math.max(0, Math.min(1, out.score)), feedback: out.feedback.trim(), ai: true };
    } catch (err) {
      warn("marking", err);
    }
  }
  return { ...gradeTextFallback(item, text), ai: false };
};

const COACH_SYSTEM = `You are a supportive dental tutor writing feedback after a student's assessment station.
Be specific to what this student did, refer to their actual answers, and keep it short.
summary: 2 sentences. strengths: 2-3 items. gaps: 2-4 items, most important first. studyPlan: 3 concrete next steps.
Write to the student as "you". Plain English, no headings, no markdown.`;

export const coachReport = async (card, attempt, report) => {
  if (!aiEnabled()) return report;
  try {
    const out = await askJson({
      system: COACH_SYSTEM,
      effort: "medium",
      schema: z.object({
        summary: z.string(),
        strengths: z.array(z.string()),
        gaps: z.array(z.string()),
        studyPlan: z.array(z.string()),
      }),
      prompt: `Case: ${card.title}. Diagnosis: ${card.diagnosis}. Overall: ${report.score}% (${report.grade}).
Competencies: ${report.competencies.map((c) => `${c.label} ${c.score}%`).join(", ")}.
History: asked ${report.history.asked} questions; covered ${report.history.covered.join(", ") || "nothing"}; missed ${report.history.missed.join(", ") || "nothing"}.
Answers:
${report.items.map((i) => `- ${i.question}\n  Student: ${i.yourAnswer}\n  Expected: ${i.correctAnswer}\n  Result: ${i.verdict}`).join("\n")}
Teaching points: ${card.teachingPoints.join(" ")}`,
    });
    return { ...report, ...out, ai: true };
  } catch (err) {
    warn("coach", err);
    return report;
  }
};
