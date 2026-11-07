import { useEffect, useState } from "react";
import { FiAlertTriangle, FiArrowLeft, FiArrowRight, FiCheck, FiCircle, FiDroplet, FiMove, FiPlus, FiScissors, FiX, FiZap } from "react-icons/fi";
import { CHILD_AREAS, MOUTH_AREAS, plainTooth } from "../../shared/plainTooth";

const ICONS = { zap: FiZap, alert: FiAlertTriangle, droplet: FiDroplet, scissors: FiScissors, circle: FiCircle, move: FiMove, plus: FiPlus };

const Step = ({ eyebrow, title, help, children }) => (
  <div className="animate-rise-in">
    {eyebrow && <p className="text-xs font-bold uppercase tracking-wider text-brand">{eyebrow}</p>}
    <h2 className="mt-1 font-display text-2xl font-semibold leading-snug sm:text-3xl">{title}</h2>
    {help && <p className="mt-2 text-ink-soft">{help}</p>}
    <div className="mt-6">{children}</div>
  </div>
);

const Big = ({ on, onClick, children, className = "" }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    className={`flex w-full items-center gap-3 rounded-2xl border-2 px-5 py-4 text-left text-lg font-bold transition-all ${
      on ? "border-brand bg-brand-tint" : "border-line bg-white hover:-translate-y-0.5 hover:border-brand/50"
    } ${className}`}
  >
    {children}
  </button>
);

const Nav = ({ onBack, onNext, nextLabel = "Next", disabled }) => (
  <div className="mt-8 flex items-center justify-between gap-3">
    {onBack ? (
      <button type="button" onClick={onBack} className="btn-quiet">
        <FiArrowLeft /> Back
      </button>
    ) : (
      <span />
    )}
    {onNext && (
      <button type="button" onClick={onNext} disabled={disabled} className="btn-primary px-6">
        {nextLabel} <FiArrowRight />
      </button>
    )}
  </div>
);

const Question = ({ q, value, onChange }) => {
  if (q.type === "scale") {
    const v = value ?? 5;
    return (
      <div>
        <div className="flex items-end justify-between">
          <span className="font-display text-6xl font-semibold tabular-nums" style={{ color: v >= 8 ? "#C21E3A" : v >= 5 ? "#9A5B00" : "#12805C" }}>
            {v}
          </span>
          <span className="text-ink-soft">out of {q.max}</span>
        </div>
        <input
          type="range"
          min={q.min}
          max={q.max}
          value={v}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={q.text}
          className="mt-4 w-full cursor-pointer accent-brand"
        />
        <div className="mt-1 flex justify-between text-sm text-ink-soft">
          <span>{q.labels[0]}</span>
          <span>{q.labels[1]}</span>
        </div>
      </div>
    );
  }
  if (q.type === "multi") {
    const list = [].concat(value ?? []);
    return (
      <div className="grid gap-2">
        {q.options.map((o) => {
          const on = list.includes(o);
          return (
            <Big key={o} on={on} onClick={() => onChange(on ? list.filter((x) => x !== o) : [...list, o])}>
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${on ? "border-brand bg-brand text-white" : "border-ink-faint"}`}>
                {on && <FiCheck size={15} strokeWidth={3} />}
              </span>
              <span className="text-base sm:text-lg">{o}</span>
            </Big>
          );
        })}
        <p className="text-sm text-ink-faint">Choose all that apply.</p>
      </div>
    );
  }
  return (
    <div className="grid gap-2">
      {q.options.map((o) => (
        <Big key={o} on={value === o} onClick={() => onChange(o)}>
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${value === o ? "border-brand" : "border-ink-faint"}`}>
            {value === o && <span className="h-3 w-3 rounded-full bg-brand" />}
          </span>
          <span className="text-base sm:text-lg">{o}</span>
        </Big>
      ))}
    </div>
  );
};

// The self-check, one simple step at a time. `teeth` and `onTeeth` are shared
// with the 3D mouth so tapping a tooth there marks where it hurts.
const CheckWizard = ({ bank, languages, state, setState, teeth, onTeeth, onSubmit, onWho }) => {
  const [step, setStep] = useState("who");
  const [qi, setQi] = useState(0);
  const problem = bank.find((p) => p.id === state.problem);
  const areas = state.who === "child" && Number(state.age) < 12 ? CHILD_AREAS : MOUTH_AREAS;

  useEffect(() => onWho?.(state.who, state.age), [state.who, state.age]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch) => setState((s) => ({ ...s, ...patch }));
  const answer = (id, v) => setState((s) => ({ ...s, answers: { ...s.answers, [id]: v } }));
  const total = 4 + (problem?.questions.length || 5);
  const done = { who: 0, what: 1, where: 2, story: 3, q: 4 + qi }[step];

  return (
    <div>
      <div className="mb-6">
        <div className="flex justify-between text-xs font-bold text-ink-faint">
          <span>Your self-check</span>
          <span>{Math.round((done / total) * 100)}%</span>
        </div>
        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-line">
          <span className="block h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${(done / total) * 100}%` }} />
        </span>
      </div>

      {step === "who" && (
        <Step eyebrow="Step 1" title="Who is this check for?" help="No sign-up. Your answers stay on this device and are only used to give you advice.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Big on={state.who === "me"} onClick={() => set({ who: "me" })}>
              Me
            </Big>
            <Big on={state.who === "child"} onClick={() => set({ who: "child" })}>
              My child
            </Big>
          </div>
          {state.who === "child" && (
            <label className="mt-4 flex items-center gap-3 font-bold">
              Their age
              <input
                type="number"
                min={0}
                max={17}
                value={state.age ?? ""}
                onChange={(e) => set({ age: e.target.value === "" ? undefined : Math.max(0, Math.min(17, Number(e.target.value))) })}
                className="field w-24 py-2"
                placeholder="Years"
              />
            </label>
          )}
          <label className="mt-6 flex flex-wrap items-center gap-3 font-bold">
            Explain the results in
            <select value={state.language} onChange={(e) => set({ language: e.target.value })} className="field w-auto py-2">
              {languages.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
          <Nav onNext={() => setStep("what")} disabled={!state.who || (state.who === "child" && state.age === undefined)} />
        </Step>
      )}

      {step === "what" && (
        <Step eyebrow="Step 2" title="What's the problem?" help="Pick the one that fits best. You don't need to know any dental words.">
          <div className="grid gap-2 sm:grid-cols-2">
            {bank.map((p) => {
              const Icon = ICONS[p.icon] || FiZap;
              const on = state.problem === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    set({ problem: p.id, answers: {} });
                    setQi(0);
                  }}
                  className={`flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
                    on ? "border-brand bg-brand-tint" : "border-line bg-white hover:-translate-y-0.5 hover:border-brand/50"
                  }`}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${on ? "bg-brand text-white" : "bg-bone text-brand"}`}>
                    <Icon />
                  </span>
                  <span>
                    <span className="block font-bold">{p.label}</span>
                    <span className="text-sm text-ink-soft">{p.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <Nav onBack={() => setStep("who")} onNext={() => setStep("where")} disabled={!state.problem} />
        </Step>
      )}

      {step === "where" && (
        <Step eyebrow="Step 3" title="Where is it?" help="Tap the tooth on the 3D mouth, or pick an area below. Left and right mean your left and right.">
          {teeth.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {teeth.map((id) => (
                <span key={id} className="inline-flex items-center gap-2 rounded-full bg-ink py-1.5 pl-3.5 pr-1.5 font-bold text-white">
                  {plainTooth(id)}
                  <button type="button" onClick={() => onTeeth(teeth.filter((t) => t !== id))} className="rounded-full p-1 hover:bg-white/15" aria-label="Remove">
                    <FiX size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {areas.map((a) => {
              const on = a.teeth.every((t) => teeth.includes(t));
              return (
                <Big key={a.id} on={on} onClick={() => onTeeth(on ? teeth.filter((t) => !a.teeth.includes(t)) : [...new Set([...teeth, ...a.teeth])].slice(-4))}>
                  <span className="text-base">{a.label}</span>
                </Big>
              );
            })}
            <Big on={false} onClick={() => { onTeeth([]); setStep("story"); }}>
              <span className="text-base text-ink-soft">I'm not sure / the whole mouth</span>
            </Big>
          </div>
          <Nav onBack={() => setStep("what")} onNext={() => setStep("story")} nextLabel={teeth.length ? "Next" : "Skip"} />
        </Step>
      )}

      {step === "story" && (
        <Step eyebrow="Step 4" title="Tell us in your own words" help="Optional, but it helps. For example: “It started 3 days ago after eating ice cream and now it throbs.”">
          <label htmlFor="story" className="sr-only">Describe the problem</label>
          <textarea
            id="story"
            rows={4}
            maxLength={1500}
            value={state.story}
            onChange={(e) => set({ story: e.target.value })}
            placeholder="What's happening, since when, what makes it better or worse…"
            className="field resize-y text-lg"
          />
          <Nav onBack={() => setStep("where")} onNext={() => setStep("q")} nextLabel={state.story.trim() ? "Next" : "Skip"} />
        </Step>
      )}

      {step === "q" && problem && (
        <Step key={problem.questions[qi].id} eyebrow={`Question ${qi + 1} of ${problem.questions.length}`} title={problem.questions[qi].text}>
          <Question q={problem.questions[qi]} value={state.answers[problem.questions[qi].id]} onChange={(v) => answer(problem.questions[qi].id, v)} />
          <Nav
            onBack={() => (qi === 0 ? setStep("story") : setQi(qi - 1))}
            onNext={() => {
              const q = problem.questions[qi];
              if (q.type === "scale" && state.answers[q.id] === undefined) answer(q.id, 5);
              if (qi + 1 < problem.questions.length) setQi(qi + 1);
              else onSubmit();
            }}
            nextLabel={qi + 1 < problem.questions.length ? (state.answers[problem.questions[qi].id] === undefined && problem.questions[qi].type !== "scale" ? "Skip" : "Next") : "See my results"}
          />
        </Step>
      )}
    </div>
  );
};

export default CheckWizard;
