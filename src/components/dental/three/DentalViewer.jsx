import { Component, Suspense, lazy, useCallback, useState } from "react";
import { FiRefreshCw, FiRotateCw, FiX } from "react-icons/fi";
import { useStore } from "zustand";
import { hasWebGL } from "../../anatomy/hasWebGL";
import { useViewerStore } from "../../../scene/sceneStore";
import { toothName } from "../../../data/teeth";
import { ACCENTS } from "./accents";

const DentalScene = lazy(() => import("./DentalScene"));
const ToothSection = lazy(() => import("./ToothSection"));

const VIEW_BUTTONS = [
  { id: "front", label: "Front" },
  { id: "right", label: "Right" },
  { id: "left", label: "Left" },
  { id: "upper", label: "Upper" },
  { id: "lower", label: "Lower" },
];

export const LAYER_BUTTONS = [
  { id: "gums", label: "Gums", hint: "Gums, tongue and bone", key: "1" },
  { id: "bone", label: "Bone", hint: "Jaw bone without the gums", key: "2" },
  { id: "roots", label: "Roots", hint: "See the roots through the gums and bone", key: "3" },
  { id: "teeth", label: "Teeth", hint: "Teeth alone", key: "4" },
  { id: "xray", label: "X-ray", hint: "Radiograph view with pulp chambers", key: "5" },
];

class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const Loading = () => (
  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/70">
    <span className="h-9 w-9 animate-orbit rounded-full border-2 border-white/15 border-t-sky" />
    <span className="text-sm font-bold tracking-wide">Loading 3D mouth</span>
  </div>
);

const ToolButton = ({ active, onClick, children, label }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    aria-label={label}
    title={label}
    className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition-colors ${
      active ? "bg-white text-ink" : "text-white/75 hover:bg-white/10 hover:text-white"
    }`}
  >
    {children}
  </button>
);

const Panel = ({ children, className = "" }) => (
  <div className={`pointer-events-auto flex rounded-xl bg-white/10 p-1 ring-1 ring-white/10 backdrop-blur-md ${className}`}>
    {children}
  </div>
);

// The cut-through view of one tooth, floating over the stage.
const SectionCard = ({ tooth, onClose }) => (
  <div className="pointer-events-auto absolute right-3 top-14 z-10 w-[min(18rem,calc(100%-1.5rem))] animate-rise-in overflow-hidden rounded-2xl bg-stage/80 ring-1 ring-white/15 backdrop-blur-md">
    <div className="flex items-center justify-between px-3 py-2 text-xs font-bold text-white/80">
      <span>Section · {toothName(tooth)}</span>
      <button type="button" onClick={onClose} aria-label="Close section" className="rounded p-1 hover:bg-white/10">
        <FiX />
      </button>
    </div>
    <Suspense fallback={<div className="h-72 animate-pulse bg-white/5" />}>
      <ToothSection key={tooth} toothId={tooth} />
    </Suspense>
  </div>
);

// The dark stage around the 3D mouth, with its controls. Layer, jaw, camera
// and highlights live in the scene store, so the AI and the page can drive
// them with SceneCommands. `mode`: "select" lets the user pick teeth,
// surfaces and sites; "focus" only shows them.
const DentalViewer = ({
  teeth = [],
  chart = [],
  regions = [],
  onPickTooth,
  onPickSurface,
  onPickRegion,
  mode = "select",
  accent = ACCENTS.select,
  fallback = null,
  className = "",
  caption,
  summary,
  controls = true,
  children,
}) => {
  const interactive = mode === "select";
  const store = useViewerStore();
  const s = useStore(store);
  const [failed, setFailed] = useState(false);
  const onFail = useCallback(() => setFailed(true), []);

  // A site may need part of the mouth out of the way to be seen.
  const onView = useCallback(
    (v) => {
      store.getState().apply({ type: "setArches", arches: v.arches || "both" });
      if (v.layer) store.getState().apply({ type: "setLayer", layer: v.layer });
    },
    [store],
  );

  if (!hasWebGL() || failed) return fallback;

  const apply = (c) => store.getState().apply(c);
  const highlighted = Object.keys(s.highlights);

  return (
    <div
      className={`relative isolate overflow-hidden rounded-2xl bg-[radial-gradient(ellipse_at_50%_38%,#27304F_0%,#141B38_55%,#0A1229_100%)] ring-1 ring-ink/10 print:hidden ${className}`}
    >
      <SceneBoundary fallback={fallback}>
        <Suspense fallback={<Loading />}>
          <div className="absolute inset-0">
            <DentalScene
              teeth={teeth}
              chart={chart}
              regions={regions}
              onPickTooth={onPickTooth}
              onPickSurface={onPickSurface}
              onPickRegion={onPickRegion}
              interactive={interactive}
              color={accent}
              layer={s.layer}
              arches={s.arches}
              open={s.open}
              autoRotate={s.autoRotate}
              command={s.camera}
              highlights={s.highlights}
              conditions={s.conditions}
              onView={onView}
              onFail={onFail}
            />
          </div>
        </Suspense>
      </SceneBoundary>

      {s.section && <SectionCard tooth={s.section} onClose={() => apply({ type: "section", tooth: null })} />}

      {controls && (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 p-3">
          <Panel>
            {VIEW_BUTTONS.map((b) => (
              <ToolButton key={b.id} onClick={() => apply({ type: "setView", view: b.id })} label={`${b.label} view`}>
                {b.label}
              </ToolButton>
            ))}
          </Panel>
          <Panel>
            <ToolButton active={s.autoRotate} onClick={() => apply({ type: "setSpin", on: !s.autoRotate })} label="Rotate automatically">
              <FiRotateCw /> Spin
            </ToolButton>
            <ToolButton onClick={() => apply({ type: "reset" })} label="Reset view">
              <FiRefreshCw />
            </ToolButton>
          </Panel>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 p-3 text-xs">
        {summary && (
          <p className="flex w-fit items-center gap-2 self-end rounded-lg bg-white/90 px-2.5 py-1.5 font-bold text-ink shadow-lg">
            <span className="h-2 w-2 rounded-full bg-brand" />
            {summary}
          </p>
        )}
        {children}
        {controls && (
          <div className="flex flex-wrap items-end justify-between gap-2">
            <Panel>
              {LAYER_BUTTONS.map((l) => (
                <ToolButton key={l.id} active={s.layer === l.id} onClick={() => apply({ type: "setLayer", layer: l.id })} label={l.hint}>
                  {l.label}
                </ToolButton>
              ))}
            </Panel>
            <label className="pointer-events-auto flex h-10 items-center gap-2 rounded-xl bg-white/10 px-3 font-bold text-white/80 ring-1 ring-white/10 backdrop-blur-md">
              Jaw
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={s.open}
                onChange={(e) => apply({ type: "setJaw", open: Number(e.target.value) })}
                aria-label="Open the jaw"
                className="h-1 w-24 cursor-pointer accent-sky"
              />
            </label>
          </div>
        )}
        {controls && (
          <p className="w-fit rounded-lg bg-black/25 px-2.5 py-1.5 font-bold text-white/70 backdrop-blur">
            {caption ||
              (interactive
                ? "Click a tooth, then its surfaces · drag to rotate · scroll to zoom"
                : highlighted.length
                  ? `Showing ${highlighted.join(", ")} · drag to rotate`
                  : "Drag to rotate · scroll to zoom")}
          </p>
        )}
      </div>
    </div>
  );
};

export default DentalViewer;
