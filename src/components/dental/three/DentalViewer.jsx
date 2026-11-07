import { Component, Suspense, lazy, useCallback, useState } from "react";
import { FiRefreshCw, FiRotateCw } from "react-icons/fi";
import { hasWebGL } from "../../anatomy/hasWebGL";

const DentalScene = lazy(() => import("./DentalScene"));

const VIEW_BUTTONS = [
  { id: "front", label: "Front", arches: "both" },
  { id: "right", label: "Right", arches: "both" },
  { id: "left", label: "Left", arches: "both" },
  { id: "upper", label: "Upper", arches: "upper" },
  { id: "lower", label: "Lower", arches: "lower" },
];

const LAYERS = [
  { id: "gums", label: "Gums", hint: "Gums, tongue and bone" },
  { id: "bone", label: "Bone", hint: "Jaw bone without the gums" },
  { id: "roots", label: "Roots", hint: "See the roots through the gums and bone" },
  { id: "teeth", label: "Teeth", hint: "Teeth alone" },
  { id: "xray", label: "X-ray", hint: "Radiograph view with pulp chambers" },
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

// The dark stage around the 3D mouth, with its controls. `mode`: "select"
// lets the clinician pick teeth, surfaces and sites; "focus" only shows them,
// tinted with `accent` (an urgency key), as in the report.
const DentalViewer = ({
  teeth = [],
  chart = [],
  regions = [],
  onPickTooth,
  onPickSurface,
  onPickRegion,
  mode = "select",
  accent,
  fallback = null,
  className = "",
  caption,
  summary,
}) => {
  const interactive = mode === "select";
  const [layer, setLayer] = useState("gums");
  const [arches, setArches] = useState("both");
  const [open, setOpen] = useState(0.55);
  const [autoRotate, setAutoRotate] = useState(!interactive);
  const [command, setCommand] = useState(null);
  const [failed, setFailed] = useState(false);
  const onFail = useCallback(() => setFailed(true), []);

  // A site may need part of the mouth out of the way to be seen.
  const onView = useCallback((v) => {
    if (v.arches) setArches(v.arches);
    else setArches("both");
    if (v.layer) setLayer(v.layer);
  }, []);

  if (!hasWebGL() || failed) return fallback;

  const view = ({ id, arches: which }) => {
    setArches(which);
    setCommand({ type: "view", view: id, at: Date.now() });
  };

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
              accent={interactive ? "select" : accent}
              layer={layer}
              arches={arches}
              open={open}
              autoRotate={autoRotate}
              command={command}
              onView={onView}
              onFail={onFail}
            />
          </div>
        </Suspense>
      </SceneBoundary>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 p-3">
        {interactive ? (
          <Panel>
            {VIEW_BUTTONS.map((b) => (
              <ToolButton key={b.id} onClick={() => view(b)} label={`${b.label} view`}>
                {b.label}
              </ToolButton>
            ))}
          </Panel>
        ) : (
          <span />
        )}
        <Panel>
          <ToolButton active={autoRotate} onClick={() => setAutoRotate((r) => !r)} label="Rotate automatically">
            <FiRotateCw /> Spin
          </ToolButton>
          <ToolButton
            onClick={() =>
              interactive
                ? view(VIEW_BUTTONS[0])
                : setCommand({ type: "focus", at: Date.now() })
            }
            label="Reset view"
          >
            <FiRefreshCw />
          </ToolButton>
        </Panel>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 p-3 text-xs">
        {summary && interactive && (
          <p className="flex w-fit items-center gap-2 self-end rounded-lg bg-white/90 px-2.5 py-1.5 font-bold text-ink shadow-lg">
            <span className="h-2 w-2 rounded-full bg-brand" />
            {summary}
          </p>
        )}
        <div className="flex flex-wrap items-end justify-between gap-2">
          <Panel>
            {LAYERS.map((l) => (
              <ToolButton key={l.id} active={layer === l.id} onClick={() => setLayer(l.id)} label={l.hint}>
                {l.label}
              </ToolButton>
            ))}
          </Panel>
          {interactive && (
            <label className="pointer-events-auto flex h-10 items-center gap-2 rounded-xl bg-white/10 px-3 font-bold text-white/80 ring-1 ring-white/10 backdrop-blur-md">
              Jaw
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={open}
                onChange={(e) => setOpen(Number(e.target.value))}
                aria-label="Open the jaw"
                className="h-1 w-24 cursor-pointer accent-sky"
              />
            </label>
          )}
        </div>
        <p className="w-fit rounded-lg bg-black/25 px-2.5 py-1.5 font-bold text-white/70 backdrop-blur">
          {caption ||
            (interactive
              ? "Click a tooth, then its surfaces · drag to rotate · scroll to zoom"
              : "Drag to rotate · scroll to zoom")}
        </p>
      </div>
    </div>
  );
};

export default DentalViewer;
