import { describe, expect, test } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { dentalSites, useToothSelection } from "./toothSelection";

const setup = () => renderHook(() => useToothSelection());
const run = (hook, fn) => act(() => fn(hook.result.current));

describe("useToothSelection", () => {
  test("with one site a click replaces the tooth and its chart", () => {
    const hook = setup();
    run(hook, (s) => s.pickTooth("36"));
    run(hook, (s) => s.toggleSurface("36", "O"));
    expect(hook.result.current.primary).toBe("quadrant_ll");
    run(hook, (s) => s.pickTooth("11"));
    const s = hook.result.current;
    expect(s.teeth).toEqual(["11"]);
    expect(s.chart).toEqual([]);
    expect(s.active).toBe("11");
    expect(s.primary).toBe("quadrant_ur");
  });

  test("with several sites a click adds, and a second click removes", () => {
    const hook = setup();
    run(hook, (s) => s.severalSites());
    run(hook, (s) => s.pickTooth("36"));
    run(hook, (s) => s.pickTooth("11"));
    expect(hook.result.current.teeth).toEqual(["36", "11"]);
    expect(hook.result.current.primary).toBe("multiple");
    run(hook, (s) => s.toggleCondition("36", "caries"));
    run(hook, (s) => s.pickTooth("36"));
    expect(hook.result.current.teeth).toEqual(["11"]);
    expect(hook.result.current.chart).toEqual([]);
    expect(hook.result.current.active).toBe("11");
  });

  test("a soft-tissue site replaces a tooth outside it, and keeps one inside a quadrant", () => {
    const hook = setup();
    run(hook, (s) => s.pickTooth("36"));
    run(hook, (s) => s.pickRegion("quadrant_ll"));
    expect(hook.result.current.teeth).toEqual(["36"]);
    run(hook, (s) => s.pickRegion("tongue"));
    expect(hook.result.current).toMatchObject({ teeth: [], regions: ["tongue"], primary: "tongue", active: null });
  });

  test("a chart row with nothing left on it disappears", () => {
    const hook = setup();
    run(hook, (s) => s.pickTooth("36"));
    run(hook, (s) => s.toggleSurface("36", "O"));
    run(hook, (s) => s.toggleCondition("36", "caries"));
    expect(hook.result.current.chart).toEqual([{ tooth: "36", surfaces: ["O"], conditions: ["caries"] }]);
    run(hook, (s) => s.toggleSurface("36", "O"));
    run(hook, (s) => s.toggleCondition("36", "caries"));
    expect(hook.result.current.chart).toEqual([]);
  });

  test("back to one site keeps the last tooth", () => {
    const hook = setup();
    run(hook, (s) => s.severalSites());
    run(hook, (s) => s.pickTooth("36"));
    run(hook, (s) => s.pickTooth("11"));
    run(hook, (s) => s.oneSite());
    expect(hook.result.current).toMatchObject({ multi: false, teeth: ["11"], active: "11" });
  });

  test("dentalSites adds each tooth's quadrant once", () => {
    expect(dentalSites(["36", "37"], ["tongue"])).toEqual(["tongue", "quadrant_ll"]);
  });
});
