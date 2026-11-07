import { describe, expect, test } from "vitest";
import { applyCommand, createSceneStore, initialSceneState, playCommands } from "./sceneStore";

describe("scene store", () => {
  test("clamps the jaw and the age; null age means adult", () => {
    expect(applyCommand(initialSceneState, { type: "setJaw", open: 4 })).toEqual({ open: 1 });
    expect(applyCommand(initialSceneState, { type: "setAge", years: 42 }).age).toBe(25);
    expect(applyCommand(initialSceneState, { type: "setAge", years: null }).age).toBeNull();
  });

  test("highlights merge per tooth and clear", () => {
    const store = createSceneStore();
    store.getState().apply({ type: "highlight", teeth: ["36"] });
    store.getState().apply({ type: "highlight", teeth: ["46"], color: "#ff0000" });
    expect(store.getState().highlights).toEqual({ 36: "#13BCFB", 46: "#ff0000" });
    store.getState().apply({ type: "clearHighlights" });
    expect(store.getState().highlights).toEqual({});
  });

  test("each focus is a new camera move", () => {
    const a = applyCommand(initialSceneState, { type: "focusTeeth", teeth: ["36"] }).camera.at;
    const b = applyCommand(initialSceneState, { type: "focusTeeth", teeth: ["36"] }).camera.at;
    expect(b).toBeGreaterThan(a);
  });

  test("applyAll runs the valid commands and reports the rest", () => {
    const store = createSceneStore();
    expect(store.getState().applyAll([{ type: "setLayer", layer: "xray" }, { type: "nope" }])).toEqual({ applied: 1, rejected: 1 });
    expect(store.getState().layer).toBe("xray");
  });

  test("playCommands waits between steps", async () => {
    const store = createSceneStore();
    await playCommands(store, [{ type: "setLayer", layer: "bone" }, { type: "wait", ms: 5 }, { type: "section", tooth: "36" }]);
    expect(store.getState()).toMatchObject({ layer: "bone", section: "36" });
  });
});
