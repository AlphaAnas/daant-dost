import { describe, expect, test } from "vitest";
import { TEETH } from "../data/teeth";
import { DENTITION_MILESTONES, TOOTH_TIMING, dentitionAtAge, emergedTeeth } from "./chronology";

const at = (years, opts) => new Map(dentitionAtAge(years, opts).map((s) => [s.id, s]));
const primaryIds = TEETH.filter((t) => t.dentition === "primary").map((t) => t.id);

describe("TOOTH_TIMING", () => {
  test("covers all 52 teeth, the same on both sides", () => {
    expect(Object.keys(TOOTH_TIMING)).toHaveLength(52);
    expect(TOOTH_TIMING["16"]).toEqual(TOOTH_TIMING["26"]);
    expect(TOOTH_TIMING["75"]).toEqual(TOOTH_TIMING["85"]);
  });

  test("each tooth forms, erupts and finishes its root in order", () => {
    Object.values(TOOTH_TIMING).forEach((t) => {
      expect(t.starts).toBeLessThan(t.crownDone);
      expect(t.crownDone).toBeLessThan(t.erupts);
      expect(t.erupts).toBeLessThan(t.rootDone);
      if (t.fallsOut !== null) expect(t.rootDone).toBeLessThan(t.fallsOut);
    });
  });
});

describe("dentitionAtAge", () => {
  test("a newborn has no teeth through the gum", () => {
    expect(emergedTeeth(0)).toEqual([]);
    expect(at(0).get("51").present).toBe(true);
    expect(at(0).get("16").present).toBe(true);
    expect(at(0).get("11").phase).toBe("absent");
    expect(at(0).get("18").phase).toBe("absent");
  });

  test("at one year the central incisors are in", () => {
    const shown = emergedTeeth(1);
    ["51", "61", "71", "81"].forEach((id) => expect(shown).toContain(id));
    expect(shown).not.toContain("54");
  });

  test("at three exactly the 20 baby teeth are in", () => {
    expect(emergedTeeth(3).sort()).toEqual([...primaryIds].sort());
  });

  test("at seven the mouth is mixed", () => {
    const s = at(7);
    expect(s.get("71").phase).toBe("exfoliated");
    expect(s.get("71").present).toBe(false);
    ["31", "36", "46"].forEach((id) => expect(s.get(id).phase).toBe("erupted"));
    expect(s.get("11").phase).toBe("developing");
    expect(s.get("52").present).toBe(true);
  });

  test("at 12.25 the baby teeth are gone and the second molars are coming", () => {
    const s = at(12.25);
    primaryIds.forEach((id) => expect(s.get(id).phase).toBe("exfoliated"));
    expect(s.get("37").phase).toBe("erupted");
    expect(s.get("17").phase).toBe("developing");
  });

  test("at 25 all 32 adult teeth are in with finished roots", () => {
    const shown = emergedTeeth(25);
    expect(shown).toHaveLength(32);
    const present = dentitionAtAge(25).filter((x) => x.present);
    present.forEach((x) => expect(x.rootFormed).toBe(1));
    expect(emergedTeeth(25, { thirdMolars: false })).toHaveLength(28);
    expect(at(25, { thirdMolars: false }).get("38").present).toBe(false);
  });

  test("a baby root is half resorbed 1.5 years before it is shed", () => {
    expect(at(5).get("71").resorption).toBeCloseTo(0.5, 5);
    expect(at(5).get("31").resorption).toBe(0);
  });

  test("uses the plan's formulas", () => {
    const s = at(5).get("16"); // starts 0, crown 2.75, erupts 6.5, root 9.5
    expect(s.crownFormed).toBe(1);
    expect(s.rootFormed).toBeCloseTo((5 - 2.75) / (9.5 - 2.75), 6);
    expect(s.eruption).toBeCloseTo(0.8 * ((5 - 2.75) / (6.5 - 2.75)), 6);
    expect(at(6.5).get("16").eruption).toBeCloseTo(0.8, 6);
    expect(at(7.25).get("16").eruption).toBe(1);
  });

  test("clamps the age and rejects nonsense", () => {
    expect(dentitionAtAge(-3)).toEqual(dentitionAtAge(0));
    expect(dentitionAtAge(80)).toEqual(dentitionAtAge(30));
    expect(() => dentitionAtAge(NaN)).toThrow(RangeError);
    expect(() => dentitionAtAge(Infinity)).toThrow(RangeError);
    expect(() => dentitionAtAge("7")).toThrow(RangeError);
  });
});

test("milestones run in order", () => {
  const starts = DENTITION_MILESTONES.map((m) => m.at);
  expect([...starts].sort((a, b) => a - b)).toEqual(starts);
  expect(DENTITION_MILESTONES[0]).toEqual({ at: 0.5, label: "First tooth" });
});
