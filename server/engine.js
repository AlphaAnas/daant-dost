// The assessment engine: stage flow, scoring and the report. Pure and
// deterministic, so it works with no AI at all; server/assessor.js layers the
// AI patient, AI marking of written answers and AI feedback on top.

export const STAGES = [
  { id: "history", label: "History" },
  { id: "examination", label: "Examination" },
  { id: "investigations", label: "Investigations" },
  { id: "diagnosis", label: "Diagnosis" },
  { id: "management", label: "Management" },
];

export const COMPETENCIES = [
  { id: "history", label: "History taking" },
  { id: "examination", label: "Examination" },
  { id: "investigations", label: "Investigations" },
  { id: "diagnosis", label: "Diagnosis and reasoning" },
  { id: "management", label: "Management" },
  { id: "communication", label: "Communication" },
];

export const MAX_HISTORY_QUESTIONS = 12;

const now = () => new Date().toISOString();
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const round = (v) => Math.round(v);

export const normalise = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const mentions = (text, keyword) => ` ${normalise(text)} `.includes(normalise(keyword));

export const totalPoints = (card) =>
  card.history.points + card.items.reduce((sum, i) => sum + i.points, 0);

// What the student may see of a case before and during the assessment.
export const publicCase = (card) => ({
  id: card.id,
  title: card.title,
  site: card.site,
  difficulty: card.difficulty,
  minutes: card.minutes,
  patient: {
    name: card.patient.name,
    age: card.patient.age,
    sex: card.patient.sex,
    complaint: card.patient.complaint,
  },
  questions: card.items.length,
  points: totalPoints(card),
});

export const publicItem = (item) =>
  item && {
    id: item.id,
    stage: item.stage,
    type: item.type,
    question: item.question,
    helper: item.helper,
    options: item.options,
    points: item.points,
  };

// History topics a question touches, by keyword.
export const matchTopics = (card, question) =>
  card.history.topics.filter((t) => t.keywords.some((k) => mentions(question, k))).map((t) => t.id);

export const fallbackPatientReply = (card, question) => {
  const topics = matchTopics(card, question);
  if (!topics.length) {
    return {
      reply: "Sorry, I'm not sure what you mean. It's really just this tooth that's bothering me.",
      topics: [],
    };
  }
  const answers = card.history.topics.filter((t) => topics.includes(t.id)).map((t) => t.answer);
  return { reply: answers.join(" "), topics };
};

// Marks an answer to a choice or tooth question: 1 right, 0 wrong, between
// for part marks.
export const gradeChoice = (item, answer) => {
  const picked = [].concat(answer ?? []).map(String).filter(Boolean);
  if (item.type === "single") return picked.length === 1 && item.answer.includes(picked[0]) ? 1 : 0;
  if (item.type === "tooth") {
    if (picked.some((id) => item.answer.includes(id))) return 1;
    return Math.max(0, ...picked.map((id) => item.partial?.[id] ?? 0));
  }
  if (item.type === "multi") {
    const right = picked.filter((p) => item.answer.includes(p)).length;
    const wrong = picked.length - right;
    return clamp01((right - wrong * 0.5) / item.answer.length);
  }
  return 0;
};

// Without the AI, a written answer earns the share of key ideas it mentions.
export const gradeTextFallback = (item, text) => {
  const hit = item.keywords.filter((group) => group.some((k) => mentions(text, k)));
  const score = item.keywords.length ? hit.length / item.keywords.length : 0;
  return {
    score,
    feedback:
      score >= 0.99
        ? "You covered every key point."
        : `You covered ${hit.length} of ${item.keywords.length} key points.`,
  };
};

export const verdictOf = (score) => (score >= 0.99 ? "correct" : score > 0 ? "partial" : "wrong");

const say = (attempt, role, text, extra = {}) => {
  attempt.transcript.push({ role, text, at: now(), ...extra });
};

export const startAttempt = (card, { id, student, mode = "practice" }) => {
  const attempt = {
    id,
    caseId: card.id,
    student,
    mode,
    status: "history",
    stage: "history",
    itemIndex: 0,
    startedAt: now(),
    finishedAt: null,
    transcript: [],
    history: { asked: 0, covered: [] },
    answers: {},
    report: null,
  };
  const first = card.patient.name.split(" ")[0];
  say(
    attempt,
    "examiner",
    `${card.patient.name}, ${card.patient.age}, has come in today. Take a focused history: ask ${first} anything you like. When you have what you need, move on to the examination.`,
  );
  say(attempt, "patient", card.patient.opening);
  return attempt;
};

export const askPatient = (attempt, question, { reply, topics }) => {
  say(attempt, "student", question);
  say(attempt, "patient", reply, { topics });
  attempt.history.asked += 1;
  attempt.history.covered = [...new Set([...attempt.history.covered, ...topics])];
  return attempt;
};

const currentItem = (attempt, card) => card.items[attempt.itemIndex];

const askItem = (attempt, card) => {
  const item = currentItem(attempt, card);
  if (!item) {
    attempt.status = "review";
    attempt.stage = "management";
    say(attempt, "examiner", "That's the end of the station. Finish the assessment to see your results.");
    return;
  }
  attempt.stage = item.stage;
  say(attempt, "examiner", item.question, { itemId: item.id });
};

export const endHistory = (attempt, card) => {
  if (attempt.status !== "history") return attempt;
  attempt.status = "items";
  const covered = attempt.history.covered.filter((t) => card.history.required.includes(t)).length;
  say(
    attempt,
    "examiner",
    attempt.mode === "practice"
      ? `History done: you covered ${covered} of ${card.history.required.length} key areas. Now the examination.`
      : "Thank you. Let's move on to the examination.",
  );
  askItem(attempt, card);
  return attempt;
};

// Answer text for the transcript and the report.
export const describeAnswer = (item, answer) => {
  const list = [].concat(answer ?? []);
  if (item.type === "tooth") return list.length ? `Tooth ${list.join(", ")}` : "No tooth";
  return list.join(", ");
};

export const answerItem = (attempt, card, answer, { score, feedback }) => {
  const item = currentItem(attempt, card);
  if (!item || attempt.status !== "items") return attempt;
  const verdict = verdictOf(score);
  attempt.answers[item.id] = { answer, score, verdict, feedback: feedback || "", points: item.points * score };
  say(attempt, "student", describeAnswer(item, answer), { itemId: item.id });

  const lines = [];
  if (attempt.mode === "practice") {
    const lead = { correct: "Correct.", partial: "Partly right.", wrong: "Not quite." }[verdict];
    lines.push(item.type === "text" ? `${lead} ${feedback || ""}`.trim() : `${lead} ${item.explain || ""}`.trim());
  }
  if (item.reveal) lines.push(item.reveal);
  const picked = [].concat(answer ?? []);
  const findings = item.findings ? picked.filter((p) => item.findings[p]).map((p) => `${p}: ${item.findings[p]}`) : [];
  say(attempt, "examiner", lines.join("\n\n") || "Noted.", {
    itemId: item.id,
    verdict: attempt.mode === "practice" ? verdict : undefined,
    findings: findings.length ? findings : undefined,
    commands: item.commands,
  });
  attempt.itemIndex += 1;
  askItem(attempt, card);
  return attempt;
};

const gradeBand = (score) =>
  score >= 85 ? "Distinction" : score >= 65 ? "Pass" : score >= 50 ? "Borderline" : "Not yet";

// Scores by competency, item reviews and a plain feedback summary. The AI
// can replace the summary, strengths, gaps and study plan.
export const buildReport = (attempt, card) => {
  const historyShare =
    card.history.required.filter((t) => attempt.history.covered.includes(t)).length / card.history.required.length;
  const buckets = Object.fromEntries(COMPETENCIES.map((c) => [c.id, { got: 0, max: 0 }]));
  buckets.history.got += historyShare * card.history.points;
  buckets.history.max += card.history.points;

  const items = card.items.map((item) => {
    const a = attempt.answers[item.id];
    const got = a ? a.points : 0;
    buckets[item.competency].got += got;
    buckets[item.competency].max += item.points;
    return {
      id: item.id,
      stage: item.stage,
      question: item.question,
      yourAnswer: a ? describeAnswer(item, a.answer) : "Not answered",
      correctAnswer: item.type === "text" ? item.expected : describeAnswer(item, item.answer),
      verdict: a ? a.verdict : "wrong",
      score: a ? a.score : 0,
      points: Math.round(got * 10) / 10,
      max: item.points,
      explain: item.explain || "",
      feedback: a?.feedback || "",
    };
  });

  const competencies = COMPETENCIES.map((c) => ({
    ...c,
    score: buckets[c.id].max ? round((buckets[c.id].got / buckets[c.id].max) * 100) : null,
  })).filter((c) => c.score !== null);

  const got = Object.values(buckets).reduce((s, b) => s + b.got, 0);
  const score = round((got / totalPoints(card)) * 100);
  const topics = card.history.topics;
  const missedTopics = topics.filter((t) => card.history.required.includes(t.id) && !attempt.history.covered.includes(t.id));
  const strong = competencies.filter((c) => c.score >= 80);
  const weak = competencies.filter((c) => c.score < 60);
  const dxItem = items.find((i) => i.id === "dx");

  return {
    score,
    grade: gradeBand(score),
    diagnosis: card.diagnosis,
    gotDiagnosis: dxItem?.verdict === "correct",
    keyTeeth: card.keyTeeth,
    competencies,
    items,
    history: {
      asked: attempt.history.asked,
      covered: topics.filter((t) => attempt.history.covered.includes(t.id)).map((t) => t.label),
      missed: missedTopics.map((t) => t.label),
    },
    summary:
      score >= 85
        ? `Excellent work on ${card.patient.name.split(" ")[0]}'s case: a safe, well-reasoned approach.`
        : score >= 65
          ? `A solid attempt. You reached a sound conclusion with a few gaps to tighten.`
          : `This one was tricky. Review the reasoning below and try the case again.`,
    strengths: strong.length
      ? strong.map((c) => `Strong ${c.label.toLowerCase()} (${c.score}%).`)
      : ["You completed the full station."],
    gaps: [
      ...missedTopics.map((t) => `In the history, ask about: ${t.label.toLowerCase()}.`),
      ...items.filter((i) => i.verdict !== "correct").map((i) => i.explain).filter(Boolean),
    ].slice(0, 5),
    studyPlan: [
      ...weak.map((c) => `Revise ${c.label.toLowerCase()} for ${card.diagnosis.toLowerCase()}.`),
      ...card.teachingPoints,
    ].slice(0, 5),
    teachingPoints: card.teachingPoints,
    durationSec: Math.max(0, Math.round((Date.now() - new Date(attempt.startedAt).getTime()) / 1000)),
    ai: false,
  };
};

// What the browser gets: never the hidden answers before the report.
export const viewOf = (attempt, card) => ({
  id: attempt.id,
  case: publicCase(card),
  mode: attempt.mode,
  status: attempt.status,
  stage: attempt.stage,
  stages: STAGES,
  item: attempt.status === "items" ? publicItem(currentItem(attempt, card)) : null,
  progress: { answered: Object.keys(attempt.answers).length, total: card.items.length },
  history: {
    asked: attempt.history.asked,
    max: MAX_HISTORY_QUESTIONS,
    covered: attempt.mode === "practice" ? attempt.history.covered.length : undefined,
    required: card.history.required.length,
  },
  transcript: attempt.transcript,
  startedAt: attempt.startedAt,
  finishedAt: attempt.finishedAt,
  report: attempt.report,
});
