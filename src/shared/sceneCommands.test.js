import { describe, expect, test } from "vitest";
import { validateCommands } from "./sceneCommands";

describe("validateCommands", () => {
  test("keeps valid commands and counts the rest", () => {
    const out = validateCommands([
      { type: "focusTeeth", teeth: ["36"] },
      { type: "focusTeeth", teeth: ["99"] },
      { type: "setLayer", layer: "lasers" },
      { type: "setAge", years: 7 },
      { type: "highlight", teeth: [36], color: "#ff0000" },
      "nonsense",
    ]);
    expect(out.commands.map((c) => c.type)).toEqual(["focusTeeth", "setAge", "highlight"]);
    expect(out.commands[2].teeth).toEqual(["36"]);
    expect(out.rejected).toBe(3);
  });

  test("anything that is not a list gives nothing", () => {
    expect(validateCommands(undefined)).toEqual({ commands: [], rejected: 0 });
  });
});
