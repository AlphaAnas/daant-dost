import { createContext, createElement, useContext, useRef } from "react";
import { createStore, useStore } from "zustand";
import { validateCommands } from "../shared/sceneCommands";

// What the 3D mouth shows. One store per viewer; anything that wants to move
// the mouth (toolbar, keyboard, AI) sends it SceneCommands.

export const initialSceneState = {
  layer: "gums",
  arches: "both",
  open: 0.55,
  age: null, // null = adult
  autoRotate: false,
  camera: null, // { kind: "view" | "teeth" | "region", ..., at }
  highlights: {}, // tooth id -> colour
  section: null, // tooth id shown in cross-section
  conditions: [], // [{ tooth, condition, surfaces }]
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
let tick = 0;
const stamp = () => {
  tick += 1;
  return tick;
};

export const HIGHLIGHT = "#13BCFB";

// The state a command changes. Pure: same state and command, same result.
export const applyCommand = (state, c) => {
  switch (c.type) {
    case "focusTeeth":
      return { camera: { kind: "teeth", teeth: c.teeth, at: stamp() } };
    case "focusRegion":
      return { camera: { kind: "region", region: c.region, at: stamp() } };
    case "setView":
      return {
        camera: { kind: "view", view: c.view, at: stamp() },
        arches: c.view === "upper" || c.view === "lower" ? c.view : "both",
      };
    case "setLayer":
      return { layer: c.layer };
    case "setArches":
      return { arches: c.arches };
    case "setJaw":
      return { open: clamp(c.open, 0, 1) };
    case "setAge":
      return { age: c.years === null ? null : clamp(c.years, 0, 25) };
    case "highlight": {
      const next = { ...state.highlights };
      c.teeth.forEach((id) => {
        next[id] = c.color || HIGHLIGHT;
      });
      return { highlights: next };
    }
    case "clearHighlights":
      return { highlights: {} };
    case "section":
      return { section: c.tooth };
    case "showCondition":
      return {
        conditions: [
          ...state.conditions.filter((r) => !(r.tooth === c.tooth && r.condition === c.condition)),
          { tooth: c.tooth, condition: c.condition, surfaces: c.surfaces || [] },
        ],
      };
    case "clearConditions":
      return { conditions: [] };
    case "setSpin":
      return { autoRotate: c.on };
    case "reset":
      return { ...initialSceneState, camera: { kind: "view", view: "front", at: stamp() } };
    default:
      return {};
  }
};

export const createSceneStore = (initial = {}) =>
  createStore((set, get) => ({
    ...initialSceneState,
    ...initial,
    apply: (command) => set((s) => applyCommand(s, command)),
    applyAll: (list) => {
      const { commands, rejected } = validateCommands(list);
      commands.filter((c) => c.type !== "wait").forEach((c) => get().apply(c));
      return { applied: commands.length, rejected };
    },
  }));

const wait = (ms, signal) =>
  new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      resolve();
    });
  });

// Plays commands in order, pausing on `wait`. Stops early when aborted.
export const playCommands = async (store, list, { signal } = {}) => {
  const { commands } = validateCommands(list);
  for (const c of commands) {
    if (signal?.aborted) return;
    if (c.type === "wait") await wait(c.ms, signal);
    else store.getState().apply(c);
  }
};

const SceneContext = createContext(null);

export const SceneProvider = ({ store, children }) => {
  const ref = useRef(store);
  if (!ref.current) ref.current = createSceneStore();
  return createElement(SceneContext.Provider, { value: ref.current }, children);
};

// The store of the nearest SceneProvider.
export const useSceneStore = () => {
  const store = useContext(SceneContext);
  if (!store) throw new Error("useSceneStore needs a SceneProvider");
  return store;
};

export const useScene = (selector) => useStore(useSceneStore(), selector);

// The nearest SceneProvider's store, or one of the caller's own when there is
// none, so a viewer works on its own as well as under a page that drives it.
export const useViewerStore = () => {
  const shared = useContext(SceneContext);
  const own = useRef(null);
  if (!shared && !own.current) own.current = createSceneStore();
  return shared || own.current;
};
