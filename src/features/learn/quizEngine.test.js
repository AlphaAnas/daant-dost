import { describe, expect, test } from "vitest";
import { buildRound, isCorrect, palmerOf, universalOf } from "./quizEngine";

const seeded = (seed = 7) => () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

describe("numbering", () => {
  test("Universal numbers run clockwise from the upper right third molar", () => {
    expect([universalOf("18"), universalOf("11"), universalOf("21"), universalOf("28")]).toEqual([1, 8, 9, 16]);
    expect([universalOf("38"), universalOf("31"), universalOf("41"), universalOf("48")]).toEqual([17, 24, 25, 32]);
  });

  test("Palmer notation", () => {
    expect(palmerOf("36")).toBe("LL6");
    expect(palmerOf("13")).toBe("UR3");
  });
});

describe("rounds", () => {
  test.each(["find", "fdi", "systems", "types"])("%s: 10 different teeth, the answer is always an option", (mode) => {
    const round = buildRound(mode, { rand: seeded() });
    expect(round).toHaveLength(10);
    expect(new Set(round.map((q) => q.tooth)).size).toBe(10);
    round.forEach((q) => {
      if (q.options) expect(q.options).toContain(q.answer);
      expect(isCorrect(q, q.answer)).toBe(true);
    });
  });

  test("missed teeth come up more often", () => {
    let hits = 0;
    for (let s = 1; s < 60; s += 1) {
      if (buildRound("find", { size: 5, weights: { 36: 4 }, rand: seeded(s) }).some((q) => q.tooth === "36")) hits += 1;
    }
    expect(hits).toBeGreaterThan(25);
  });
});
