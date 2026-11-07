import { useState } from "react";
import { conditionById } from "../../data/dental";
import { TEETH, surfaceName, toothById } from "../../data/teeth";

// Teeth as a chart reads them: the patient's right on the left, upper arch on
// top, numbered outwards from the midline in each quadrant.
const rowOf = (dentition, quadrants) => {
  const list = TEETH.filter((t) => t.dentition === dentition);
  const [left, right] = quadrants.map((q) =>
    list.filter((t) => t.section === q).sort((a, b) => a.position - b.position),
  );
  return [left.reverse(), right];
};

const LAYOUT = {
  permanent: {
    upper: rowOf("permanent", ["ur", "ul"]),
    lower: rowOf("permanent", ["lr", "ll"]),
  },
  primary: {
    upper: rowOf("primary", ["ur", "ul"]),
    lower: rowOf("primary", ["lr", "ll"]),
  },
};

const ROOTS = {
  incisor: "M8 14 C8 7 10 2 12 2 C14 2 16 7 16 14 Z",
  canine: "M8 14 C8 6 10.5 0 12 0 C13.5 0 16 6 16 14 Z",
  premolar: "M7 14 C7 8 9 3 12 3 C15 3 17 8 17 14 Z",
  molar: "M5 14 C5 8 6 3 7.5 3 C9 3 10 8 11.5 10 C13 8 14 4 16.5 3 C18 3 19 8 19 14 Z",
};

// The five surfaces as wedges around the occlusal square. Up on the page is
// towards the lips on the upper row, away from them on the lower.
const WEDGES = {
  top: "M3 16 L21 16 L16 21 L8 21 Z",
  bottom: "M3 34 L21 34 L16 29 L8 29 Z",
  left: "M3 16 L8 21 L8 29 L3 34 Z",
  right: "M21 16 L16 21 L16 29 L21 34 Z",
};

const fillFor = (row, surface, picked) => {
  if (!row?.surfaces?.includes(surface)) return "#FFFFFF";
  const finding = row.conditions?.map(conditionById).find((c) => c?.surfaced);
  return finding?.color || (picked ? "#0A74DA" : "#8FC3F2");
};

const ToothGlyph = ({ tooth, row, picked, upper }) => {
  const missing = row?.conditions?.includes("missing");
  const stroke = picked ? "#0A74DA" : "#8590AA";
  // Mesial faces the midline, so it swaps sides between the quadrants.
  const mesialOnRight = tooth.side === "right";
  const outward = upper ? "B" : "L";
  const inward = upper ? "L" : "B";
  return (
    <svg viewBox="0 0 24 36" className="w-full" aria-hidden>
      <g transform={upper ? undefined : "matrix(1 0 0 -1 0 36)"}>
        <path d={ROOTS[tooth.kind]} fill={missing ? "none" : "#F3EAD6"} stroke={stroke} strokeWidth="1" />
      </g>
      <g transform={upper ? undefined : "translate(0 -14)"} strokeWidth="1" stroke={stroke} opacity={missing ? 0.3 : 1}>
        <path d={WEDGES.top} fill={fillFor(row, outward, picked)} />
        <path d={WEDGES.bottom} fill={fillFor(row, inward, picked)} />
        <path d={WEDGES.left} fill={fillFor(row, mesialOnRight ? "D" : "M", picked)} />
        <path d={WEDGES.right} fill={fillFor(row, mesialOnRight ? "M" : "D", picked)} />
        <rect x="8" y="21" width="8" height="8" fill={fillFor(row, "O", picked)} />
      </g>
      {missing && (
        <path d="M3 3 L21 33 M21 3 L3 33" stroke="#E5484D" strokeWidth="1.6" strokeLinecap="round" />
      )}
    </svg>
  );
};

const ToothButton = ({ tooth, row, picked, active, upper, onPick }) => {
  const findings = (row?.conditions || []).map(conditionById).filter(Boolean);
  const surfaces = (row?.surfaces || []).map((s) => surfaceName(tooth, s)).join(", ");
  const label = [
    `Tooth ${tooth.id}, ${tooth.label}`,
    surfaces && `surfaces ${surfaces}`,
    ...findings.map((f) => f.label),
  ]
    .filter(Boolean)
    .join(", ");
  const number = (
    <span className={`block text-center text-[11px] tabular-nums ${picked ? "font-bold text-brand-dark" : "text-ink-soft"}`}>
      {tooth.id}
    </span>
  );
  return (
    <button
      type="button"
      onClick={() => onPick(tooth.id)}
      aria-pressed={picked}
      aria-label={label}
      title={label}
      className={`relative min-w-0 rounded-md px-px py-0.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
        active ? "bg-brand-tint ring-1 ring-brand" : picked ? "bg-brand-tint" : "hover:bg-bone"
      }`}
    >
      {upper && number}
      <ToothGlyph tooth={tooth} row={row} picked={picked} upper={upper} />
      {!upper && number}
      {findings.length > 0 && (
        <span className="absolute right-0.5 top-0.5 flex gap-px">
          {findings.slice(0, 2).map((f) => (
            <span key={f.id} className="h-1.5 w-1.5 rounded-full" style={{ background: f.color }} />
          ))}
        </span>
      )}
    </button>
  );
};

const Arch = ({ quadrants, upper, ...props }) => (
  <div className="grid grid-cols-2 divide-x divide-dashed divide-ink-faint/50">
    {quadrants.map((teeth, i) => (
      <div
        key={i}
        className="grid gap-0.5 px-0.5"
        style={{ gridTemplateColumns: `repeat(${teeth.length}, minmax(0, 1fr))` }}
      >
        {teeth.map((tooth) => (
          <ToothButton
            key={tooth.id}
            tooth={tooth}
            upper={upper}
            row={props.chart.find((r) => r.tooth === tooth.id)}
            picked={props.teeth.includes(tooth.id)}
            active={props.active === tooth.id}
            onPick={props.onPick}
          />
        ))}
      </div>
    ))}
  </div>
);

// The FDI chart, kept in step with the 3D mouth. It also works where WebGL
// does not, and it is the way to reach the primary teeth.
const Odontogram = ({ teeth = [], chart = [], active, onPick, className = "" }) => {
  const anyPrimary = teeth.some((id) => toothById(id)?.dentition === "primary");
  const [dentition, setDentition] = useState(anyPrimary ? "primary" : "permanent");
  const { upper, lower } = LAYOUT[dentition];
  return (
    <section aria-label="Tooth chart" className={`rounded-2xl border border-line bg-white p-3 sm:p-4 ${className}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-medium">Tooth chart</h2>
        <div role="radiogroup" aria-label="Dentition" className="inline-flex rounded-lg border border-line p-0.5 text-sm">
          {[
            ["permanent", "Permanent"],
            ["primary", "Primary"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={dentition === id}
              onClick={() => setDentition(id)}
              className={`rounded-md px-2.5 py-1 font-bold transition-colors ${
                dentition === id ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-between px-1 text-xs font-bold text-ink-faint">
        <span>Patient right</span>
        <span>Patient left</span>
      </div>
      <Arch quadrants={upper} upper teeth={teeth} chart={chart} active={active} onPick={onPick} />
      <div className="my-1 border-t border-dashed border-ink-faint/50" />
      <Arch quadrants={lower} teeth={teeth} chart={chart} active={active} onPick={onPick} />
      {dentition === "primary" && (
        <p className="mt-2 text-sm text-ink-faint">
          The 3D model shows the permanent dentition. Primary teeth are charted here.
        </p>
      )}
    </section>
  );
};

export default Odontogram;
