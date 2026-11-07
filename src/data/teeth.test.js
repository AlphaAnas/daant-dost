import { describe, expect, test } from "vitest";
import { TEETH, searchTeeth, surfaceLetter, surfaceName, toothById, regionOfTooth } from "./teeth";
import { DENTAL_REGIONS, DENTAL_STARTERS, DENTAL_INSIGHTS, chartRowLabel, dentalRegionById, dentalRegionGroup, dentalSiteLabel } from "./dental";

const ids = (query, options) => searchTeeth(query, options).map((t) => t.id);

describe("tooth catalogue", () => {
  test("has the 32 permanent and 20 primary teeth", () => {
    expect(TEETH.filter((t) => t.dentition === "permanent")).toHaveLength(32);
    expect(TEETH.filter((t) => t.dentition === "primary")).toHaveLength(20);
    expect(new Set(TEETH.map((t) => t.id)).size).toBe(52);
  });

  test("every tooth belongs to a known quadrant", () => {
    TEETH.forEach((t) => expect(dentalRegionById(regionOfTooth(t))).toBeDefined());
  });

  test("names surfaces for the tooth they are on", () => {
    expect(surfaceName(toothById("21"), "L")).toBe("Palatal");
    expect(surfaceName(toothById("41"), "L")).toBe("Lingual");
    expect(surfaceLetter(toothById("11"), "O")).toBe("I");
    expect(surfaceLetter(toothById("46"), "O")).toBe("O");
  });
});

describe("searchTeeth", () => {
  test("finds by FDI number, Palmer shorthand and plain words", () => {
    expect(ids("36")).toEqual(["36"]);
    expect(ids("UL6")).toEqual(["26"]);
    expect(ids("lower wisdom").sort()).toEqual(["38", "48"]);
    expect(ids("upper left canine")).toEqual(["23", "63"]);
  });

  test("limits to a quadrant or dentition", () => {
    expect(ids("molar", { region: "quadrant_ll", dentition: "permanent" })).toEqual(["36", "37", "38"]);
    expect(searchTeeth("", { dentition: "permanent" })).toHaveLength(32);
  });

  test("finds nothing for nonsense", () => {
    expect(ids("femur")).toEqual([]);
  });
});

describe("dental reference data", () => {
  test("every site group has its starters and reference", () => {
    new Set(DENTAL_REGIONS.map((r) => r.group)).forEach((group) => {
      expect(DENTAL_STARTERS[group]?.length).toBeGreaterThan(0);
      expect(DENTAL_INSIGHTS[group]).toBeDefined();
    });
  });

  test("third molars get their own group", () => {
    expect(dentalRegionGroup("quadrant_ll", ["38"])).toBe("third_molar");
    expect(dentalRegionGroup("quadrant_ll", ["36"])).toBe("teeth");
    expect(dentalRegionGroup("tmj_left")).toBe("tmj");
  });

  test("labels a case by its teeth, or else its sites", () => {
    expect(dentalSiteLabel({ teeth: ["36", "37"], regions: ["quadrant_ll"] })).toBe("Tooth 36, Tooth 37");
    expect(dentalSiteLabel({ regions: ["tongue"] })).toBe("Tongue");
    expect(dentalSiteLabel({ bodyRegion: "multiple" })).toBe("Multiple sites");
  });

  test("reads a chart row as a clinician writes it", () => {
    expect(chartRowLabel({ tooth: "36", surfaces: ["M", "O", "D"], conditions: ["caries"] })).toBe("Tooth 36 (MOD): caries");
    expect(chartRowLabel({ tooth: "11", surfaces: ["O"], conditions: [] })).toBe("Tooth 11 (I)");
  });
});
