import { useEffect, useMemo, useRef, useState } from "react";
import { FiPause, FiPlay } from "react-icons/fi";
import { useStore } from "zustand";
import { useSceneStore } from "../../scene/sceneStore";
import { DENTITION_MILESTONES, EMERGED, dentitionAtAge } from "../../shared/chronology";

// Drag the mouth from birth to 25 years. Reads and writes `age` in the scene
// store of the nearest SceneProvider; mount it inside DentalViewer.

const MAX = 25;
const SPEED = 2; // years per second while playing
const REDUCED_STEP = 1; // years per jump when motion is reduced
const REDUCED_TICK = 600; // ms between jumps
const START_AGE = 7;
const MAX_LISTED = 6;

const pct = (years) => `${(years / MAX) * 100}%`;

export const formatAge = (years) => {
  const v = Math.round(years * 10) / 10;
  const text = Number.isInteger(v) ? String(v) : v.toFixed(1);
  return `${text} ${v === 1 ? "year" : "years"}`;
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

// "24 teeth · 12 baby · 12 adult · erupting: 11, 21"
export const countTeeth = (years) => {
  const rows = dentitionAtAge(years).filter((r) => r.phase === "erupted");
  const baby = rows.filter((r) => r.dentition === "primary").length;
  const erupting = rows
    .filter((r) => r.eruption >= EMERGED && r.eruption < 1)
    .map((r) => r.id)
    .sort((a, b) => Number(a) - Number(b));
  return { total: rows.length, baby, adult: rows.length - baby, erupting };
};

const counterText = ({ total, baby, adult, erupting }) => {
  const parts = [`${total} ${total === 1 ? "tooth" : "teeth"}`, `${baby} baby`, `${adult} adult`];
  if (erupting.length) {
    const shown = erupting.slice(0, MAX_LISTED).join(", ");
    const more = erupting.length > MAX_LISTED ? ` +${erupting.length - MAX_LISTED}` : "";
    parts.push(`erupting: ${shown}${more}`);
  }
  return parts.join(" · ");
};

// The milestone that best describes an age: the latest point passed, or the
// span the age is in.
const stageAt = (years) => {
  const span = DENTITION_MILESTONES.filter((m) => m.to !== undefined && years >= m.at && years <= m.to).at(-1);
  if (span) return span.label;
  return DENTITION_MILESTONES.filter((m) => m.to === undefined && years >= m.at).at(-1)?.label || "Before the first tooth";
};

const Segment = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`h-8 rounded-lg px-3 text-xs font-bold transition-colors ${
      active ? "bg-white text-ink" : "text-white/75 hover:bg-white/10 hover:text-white"
    }`}
  >
    {children}
  </button>
);

const Milestone = ({ milestone, onJump }) => {
  const { at, to, label } = milestone;
  const range = to === undefined ? `${formatAge(at)}` : `${at}-${to} years`;
  return (
    <button
      type="button"
      onClick={() => onJump(at)}
      aria-label={`${label}, ${range}`}
      title={`${label} · ${range}`}
      className="group absolute top-1/2 flex h-5 -translate-y-1/2 items-center justify-center focus:outline-none"
      style={to === undefined ? { left: pct(at), width: 20, marginLeft: -10 } : { left: pct(at), width: pct(to - at) }}
    >
      {to === undefined ? (
        <span className="h-2.5 w-2.5 rounded-full bg-sky ring-2 ring-stage transition-transform group-hover:scale-125 group-focus-visible:scale-125" />
      ) : (
        <span className="h-1.5 w-full rounded-full bg-sky/35 transition-colors group-hover:bg-sky/60" />
      )}
      <span className="pointer-events-none absolute bottom-full mb-1.5 hidden whitespace-nowrap rounded-md bg-ink/90 px-2 py-1 text-[11px] font-bold text-white shadow-lg ring-1 ring-white/15 group-hover:block group-focus-visible:block">
        {label} · {range}
      </span>
    </button>
  );
};

const AgeTimeline = ({ className = "" }) => {
  const store = useSceneStore();
  const age = useStore(store, (s) => s.age);
  const [playing, setPlaying] = useState(false);
  const last = useRef(START_AGE);
  const on = age !== null;
  if (on) last.current = age;

  const setAge = (years) => store.getState().apply({ type: "setAge", years });

  // Play: 2 years a second up to 25, or one-year jumps when motion is reduced.
  useEffect(() => {
    if (!playing) return undefined;
    const advance = (dy) => {
      const now = store.getState().age ?? 0;
      const next = Math.min(MAX, now + dy);
      setAge(next);
      if (next >= MAX) setPlaying(false);
    };
    if (prefersReducedMotion()) {
      const t = setInterval(() => advance(REDUCED_STEP), REDUCED_TICK);
      return () => clearInterval(t);
    }
    let frame;
    let then = performance.now();
    const step = (now) => {
      const dt = Math.min(0.1, (now - then) / 1000);
      then = now;
      advance(dt * SPEED);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing, store]); // eslint-disable-line react-hooks/exhaustive-deps

  // Something else (the AI, a reset) leaving the timeline stops playback.
  useEffect(() => {
    if (!on) setPlaying(false);
  }, [on]);

  const counts = useMemo(() => (on ? countTeeth(age) : null), [on, age]);

  const play = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (!on || age >= MAX) setAge(0);
    setPlaying(true);
  };

  return (
    <div
      className={`pointer-events-auto w-full max-w-3xl self-center rounded-xl bg-white/10 p-2 text-white ring-1 ring-white/10 backdrop-blur-md ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg bg-black/20 p-0.5" role="group" aria-label="Age of the mouth">
          <Segment active={!on} onClick={() => setAge(null)}>
            Adult
          </Segment>
          <Segment active={on} onClick={() => !on && setAge(last.current)}>
            Age timeline
          </Segment>
        </div>
        <button
          type="button"
          onClick={play}
          aria-label={playing ? "Pause the timeline" : "Play the timeline"}
          title={playing ? "Pause" : "Play from birth to 25"}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky text-ink transition-colors hover:bg-white"
        >
          {playing ? <FiPause /> : <FiPlay className="translate-x-px" />}
        </button>
        {on && (
          <>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold tabular-nums text-ink" aria-live="off">
              {formatAge(age)}
            </span>
            <span className="text-xs font-bold text-white/60">{stageAt(age)}</span>
            <span className="ml-auto text-xs font-bold tabular-nums text-white/85" aria-live="off">
              {counterText(counts)}
            </span>
          </>
        )}
        {!on && <span className="text-xs font-bold text-white/60">Full adult set · drag the timeline to see a child&rsquo;s mouth</span>}
      </div>

      <div className="relative mx-2 mb-3 mt-2">
        {/* Milestones sit just above the slider, on the same scale. */}
        <div className="relative mx-2 h-5">
          {DENTITION_MILESTONES.map((m) => (
            <Milestone key={m.label} milestone={m} onJump={setAge} />
          ))}
        </div>
        <input
          type="range"
          min={0}
          max={MAX}
          step={0.1}
          value={on ? age : last.current}
          onChange={(e) => {
            setPlaying(false);
            setAge(Number(e.target.value));
          }}
          aria-label="Age in years"
          aria-valuetext={on ? formatAge(age) : "Adult"}
          className={`block h-1 w-full cursor-pointer accent-sky ${on ? "" : "opacity-50"}`}
        />
        <div className="pointer-events-none absolute inset-x-0 top-full mt-1 flex justify-between text-[10px] font-bold tabular-nums text-white/45">
          {[0, 5, 10, 15, 20, 25].map((y) => (
            <span key={y}>{y}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AgeTimeline;
