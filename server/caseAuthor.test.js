// @vitest-environment node
import { describe, expect, test } from "vitest";
import { assembleCase } from "./caseAuthor.js";
import { gradeChoice } from "./engine.js";
import { RAW } from "./caseAuthor.test.fixture.js";

const raw = RAW;

describe("assembleCase", () => {
  test("builds a 100-point playable card from the AI's content", () => {
    const card = assembleCase(raw, { author: "Ms T" });
    expect(card.items.map((i) => i.id)).toEqual(["find", "tests", "dx", "why", "plan", "talk"]);
    expect(card.history.required).toEqual(["onset", "smoking", "diabetes"]);
    expect(card.difficulty).toBe(2);
    expect(card.patient.age).toBe(52);
    expect(card.history.topics[0].keywords).toEqual(["when"]);
    expect(gradeChoice(card.items[0], ["42"])).toBe(0.5);
    expect(card.items[1].findings.BPE).toMatch(/4s/);
  });

  test("rejects content that would break marking", () => {
    expect(() => assembleCase({ ...raw, keyTooth: "54" })).toThrow(/key tooth/);
    expect(() => assembleCase({ ...raw, diagnosis: "Something else" })).toThrow(/diagnosis/);
    expect(() => assembleCase({ ...raw, testAnswers: ["Magic"] })).toThrow(/test answers/);
  });
});
