import { Suspense, lazy } from "react";
import { hasWebGL } from "../anatomy/hasWebGL";
import { TOOTH_CONDITIONS } from "../../data/dental";
import { SURFACE_IDS, surfaceName, toothById } from "../../data/teeth";

const ToothSection = lazy(() => import("./three/ToothSection"));

const ToggleChip = ({ on, onClick, children, dot }) => (
  <button
    type="button"
    aria-pressed={on}
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-bold transition-colors ${
      on
        ? "border-brand bg-brand-tint text-brand-dark"
        : "border-line bg-white text-ink-soft hover:border-ink-faint hover:text-ink"
    }`}
  >
    {dot && <span className="h-2 w-2 rounded-full" style={{ background: dot }} />}
    {children}
  </button>
);

// The tooth being charted: which surfaces, what was found, and a section
// through it. Primary teeth have no 3D model, so they skip the section.
const ToothPanel = ({ toothId, row, onSurface, onCondition, className = "" }) => {
  const tooth = toothById(toothId);
  if (!tooth) return null;
  const permanent = tooth.dentition === "permanent";
  return (
    <section
      aria-label={`Tooth ${tooth.id} chart`}
      className={`animate-rise-in rounded-2xl border border-line bg-white p-4 sm:p-5 ${className}`}
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-medium">
          <span className="mr-2 tabular-nums text-brand-dark">{tooth.id}</span>
          {tooth.label}
        </h2>
        <span className="text-xs font-bold text-ink-faint">FDI</span>
      </div>
      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-4">
          <div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink-faint">Surfaces</p>
            <div className="flex flex-wrap gap-1.5">
              {SURFACE_IDS.map((s) => (
                <ToggleChip key={s} on={Boolean(row?.surfaces?.includes(s))} onClick={() => onSurface(tooth.id, s)}>
                  {surfaceName(tooth, s)}
                </ToggleChip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink-faint">Findings</p>
            <div className="flex flex-wrap gap-1.5">
              {TOOTH_CONDITIONS.map((c) => (
                <ToggleChip
                  key={c.id}
                  dot={c.color}
                  on={Boolean(row?.conditions?.includes(c.id))}
                  onClick={() => onCondition(tooth.id, c.id)}
                >
                  {c.label}
                </ToggleChip>
              ))}
            </div>
          </div>
        </div>
        {permanent && hasWebGL() && (
          <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-bone-deep" />}>
            <ToothSection key={tooth.id} toothId={tooth.id} />
          </Suspense>
        )}
      </div>
    </section>
  );
};

export default ToothPanel;
