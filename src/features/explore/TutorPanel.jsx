import { useEffect, useRef, useState } from "react";
import { FiCornerDownLeft, FiPlay, FiSquare, FiStar, FiZap } from "react-icons/fi";
import { api } from "../../lib/api";
import { playCommands, useSceneStore } from "../../scene/sceneStore";
import Reveal from "../assess/Reveal";

const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const pause = (ms, signal) =>
  new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      resolve();
    });
  });

// Ask a question; the AI answers and walks the 3D mouth through it.
const TutorPanel = ({ selected = [], onNarrate }) => {
  const store = useSceneStore();
  const [suggestions, setSuggestions] = useState([]);
  const [aiOn, setAiOn] = useState(null);
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState("");
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(-1);
  const [error, setError] = useState("");
  const run = useRef(null);

  useEffect(() => {
    api("/tutor/suggestions").then(setSuggestions, () => {});
    api("/health").then((h) => setAiOn(h.ai), () => setAiOn(false));
    return () => run.current?.abort();
  }, []);

  const stop = () => {
    run.current?.abort();
    setStep(-1);
    onNarrate?.(null);
  };

  const play = async (p) => {
    run.current?.abort();
    const ctl = new AbortController();
    run.current = ctl;
    for (let i = 0; i < p.steps.length; i += 1) {
      if (ctl.signal.aborted) return;
      setStep(i);
      onNarrate?.(p.steps[i].say);
      await playCommands(store, p.steps[i].commands, { signal: ctl.signal });
      await pause(reduced() ? 1500 : Math.max(2600, p.steps[i].say.split(" ").length * 300), ctl.signal);
    }
    if (!ctl.signal.aborted) {
      setStep(-1);
      onNarrate?.(null);
    }
  };

  const ask = async (q) => {
    const text = (q ?? question).trim();
    if (!text || busy) return;
    stop();
    setBusy(true);
    setError("");
    setAsked(text);
    setPlan(null);
    setQuestion("");
    try {
      const p = await api("/tutor", { method: "POST", body: { question: text, context: { teeth: selected, layer: store.getState().layer } } });
      setPlan(p);
      play(p);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white" aria-label="AI tutor">
      <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-brand to-sky px-5 py-3 text-white">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <FiZap /> Ask the AI tutor
        </h2>
        {aiOn !== null && (
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold">{aiOn ? "Claude" : "Offline answers"}</span>
        )}
      </div>
      <div className="p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask();
          }}
          className="flex items-center gap-2 rounded-xl border border-line bg-white p-1.5 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20"
        >
          <label htmlFor="tutor-q" className="sr-only">Your question</label>
          <input
            id="tutor-q"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={selected.length ? `Ask about ${selected.join(", ")}…` : "Ask anything about the mouth…"}
            className="min-w-0 flex-1 bg-transparent px-2.5 py-2 placeholder:text-ink-faint focus:outline-none"
          />
          <button type="submit" disabled={!question.trim() || busy} className="btn-primary px-3 py-2" aria-label="Ask">
            <FiCornerDownLeft />
          </button>
        </form>

        {!plan && !busy && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => ask(s)} className="rounded-lg border border-line bg-bone px-2.5 py-1.5 text-left text-sm text-ink-soft transition-colors hover:border-brand hover:text-ink">
                {s}
              </button>
            ))}
          </div>
        )}

        {busy && (
          <p className="mt-4 flex items-center gap-2 text-sm font-bold text-ink-soft">
            <span className="h-4 w-4 animate-orbit rounded-full border-2 border-line border-t-brand" /> Thinking about “{asked}”
          </p>
        )}
        {error && <p role="alert" className="mt-3 rounded-xl bg-score-low-tint px-3 py-2 text-sm font-bold text-score-low">{error}</p>}

        {plan && (
          <div className="mt-4 animate-rise-in">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-faint">{asked}</p>
            <p className="mt-1.5 leading-relaxed">
              <Reveal key={asked} text={plan.answer} active />
            </p>
            {plan.steps.length > 0 && (
              <ol className="mt-4 grid gap-1.5">
                {plan.steps.map((s, i) => (
                  <li
                    key={i}
                    className={`flex gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                      step === i ? "bg-brand-tint text-ink" : "text-ink-soft"
                    }`}
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${step === i ? "bg-brand text-white" : "bg-bone"}`}>{i + 1}</span>
                    {s.say}
                  </li>
                ))}
              </ol>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {step >= 0 ? (
                <button type="button" className="btn-quiet px-3 py-2 text-sm" onClick={stop}>
                  <FiSquare /> Stop
                </button>
              ) : (
                <button type="button" className="btn-quiet px-3 py-2 text-sm" onClick={() => play(plan)}>
                  <FiPlay /> Replay on the 3D mouth
                </button>
              )}
              <button type="button" className="px-2 py-2 text-sm font-bold text-brand hover:underline" onClick={() => setPlan(null)}>
                Ask something else
              </button>
              {plan.ai && (
                <span className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-ink-faint">
                  <FiStar /> AI-generated, check with your textbook
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default TutorPanel;
