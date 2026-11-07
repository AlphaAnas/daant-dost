// @vitest-environment node
import { describe, expect, test } from "vitest";
import { caseById, CASES } from "./cases.js";
import {
  answerItem,
  askPatient,
  buildReport,
  endHistory,
  fallbackPatientReply,
  gradeChoice,
  gradeTextFallback,
  startAttempt,
  totalPoints,
  viewOf,
} from "./engine.js";
import { TEETH } from "../src/data/teeth.js";
import { validateCommands } from "../src/shared/sceneCommands.js";

const card = caseById("cold-sensitive-molar");
const item = (id) => card.items.find((i) => i.id === id);

describe("case cards", () => {
  test.each(CASES.map((c) => [c.id, c]))("%s is complete and worth 100 points", (_, c) => {
    expect(totalPoints(c)).toBe(100);
    const ids = new Set(TEETH.map((t) => t.id));
    c.keyTeeth.forEach((t) => expect(ids.has(t)).toBe(true));
    c.history.required.forEach((r) => expect(c.history.topics.some((t) => t.id === r)).toBe(true));
    c.items.forEach((i) => {
      if (i.commands) expect(validateCommands(i.commands).rejected).toBe(0);
      if (i.type === "single" || i.type === "multi") i.answer.forEach((a) => expect(i.options).toContain(a));
      if (i.type === "text") expect(i.keywords.length).toBeGreaterThan(0);
    });
  });
});

describe("marking", () => {
  test("tooth questions give part marks for a neighbour", () => {
    expect(gradeChoice(item("find"), ["36"])).toBe(1);
    expect(gradeChoice(item("find"), ["37"])).toBe(0.5);
    expect(gradeChoice(item("find"), ["11"])).toBe(0);
  });

  test("multi-select loses half a mark per wrong pick", () => {
    expect(gradeChoice(item("tests"), ["Cold test", "Percussion", "Periapical radiograph"])).toBe(1);
    expect(gradeChoice(item("tests"), ["Cold test", "Biopsy"])).toBeCloseTo(1 / 6);
    expect(gradeChoice(item("tests"), ["Biopsy", "OPG"])).toBe(0);
  });

  test("single choice is all or nothing", () => {
    expect(gradeChoice(item("dx"), "Reversible pulpitis")).toBe(1);
    expect(gradeChoice(item("dx"), "Cracked tooth")).toBe(0);
  });

  test("written answers earn the key points they mention", () => {
    const out = gradeTextFallback(item("why"), "Pain stops within seconds and there is no night pain.");
    expect(out.score).toBe(0.5);
  });

  test("the scripted patient answers by topic", () => {
    expect(fallbackPatientReply(card, "Does it wake you at night?").topics).toEqual(["night"]);
    expect(fallbackPatientReply(card, "What's your favourite film?").topics).toEqual([]);
  });
});

describe("a full station", () => {
  test("a perfect run scores 100 and the view hides answers until the end", () => {
    const a = startAttempt(card, { id: "x", student: { id: "s", name: "Ana" } });
    card.history.required.forEach((t) => askPatient(a, t, { reply: "ok", topics: [t] }));
    endHistory(a, card);
    expect(JSON.stringify(viewOf(a, card))).not.toContain("Reversible pulpitis\"]");
    card.items.forEach((i) =>
      answerItem(a, card, i.type === "text" ? i.expected : i.type === "single" ? i.answer[0] : i.answer, {
        score: i.type === "text" ? 1 : gradeChoice(i, i.type === "single" ? i.answer[0] : i.answer),
      }),
    );
    expect(a.status).toBe("review");
    const report = buildReport(a, card);
    expect(report.score).toBe(100);
    expect(report.grade).toBe("Distinction");
    expect(report.gotDiagnosis).toBe(true);
  });

  test("skipping everything scores 0 and lists the missed history", () => {
    const a = startAttempt(card, { id: "y", student: { id: "s", name: "Ana" } });
    endHistory(a, card);
    const report = buildReport(a, card);
    expect(report.score).toBe(0);
    expect(report.history.missed.length).toBe(card.history.required.length);
  });
});
