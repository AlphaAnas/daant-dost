import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiArrowRight, FiCheck, FiRefreshCw, FiX, FiZap } from "react-icons/fi";
import DentalViewer from "../../components/dental/three/DentalViewer";
import { ACCENTS } from "../../components/dental/three/accents";
import Odontogram from "../../components/dental/Odontogram";
import { SceneProvider, useSceneStore } from "../../scene/sceneStore";
import { toothName } from "../../data/teeth";
import { QUIZ_MODES, XP_PER_CORRECT, buildRound, isCorrect } from "./quizEngine";
import { getProgress, recordRound } from "./progress";

const Results = ({ results, mode, onAgain }) => {
  const score = results.filter((r) => r.correct).length;
  const missed = results.filter((r) => !r.correct);
  return (
    <div className="mx-auto max-w-xl animate-rise-in text-center">
      <p className="text-sm font-bold uppercase tracking-wider text-brand">{mode.title}</p>
      <p className="mt-3 font-display text-7xl font-semibold tabular-nums">
        {score}
        <span className="text-3xl text-ink-faint">/{results.length}</span>
      </p>
      <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-tint px-3 py-1 font-bold text-brand-dark">
        <FiZap /> +{score * XP_PER_CORRECT} XP
      </p>
      <p className="mt-4 text-ink-soft">
        {score === results.length ? "Perfect round!" : score >= 7 ? "Great work. A few to tidy up:" : "Keep going. These will come back until they stick:"}
      </p>
      {missed.length > 0 && (
        <ul className="mt-4 grid gap-2 text-left">
          {missed.map((r) => (
            <li key={r.q.id} className="rounded-xl border border-line bg-white px-4 py-3">
              <p className="font-bold">{r.q.prompt}</p>
              <p className="text-sm text-ink-soft">
                Answer: <span className="font-bold text-score-good">{r.q.answer}</span> · {toothName(r.q.tooth)}
              </p>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" className="btn-primary" onClick={onAgain}>
          <FiRefreshCw /> Another round
        </button>
        <Link to="/learn" className="btn-quiet">All drills</Link>
      </div>
    </div>
  );
};

const Quiz = ({ mode, weakOnly }) => {
  const store = useSceneStore();
  const [seed, setSeed] = useState(0);
  const round = useMemo(() => {
    const misses = getProgress().misses;
    const weights = weakOnly ? Object.fromEntries(Object.entries(misses).map(([k, v]) => [k, v + 6])) : misses;
    return buildRound(mode.id, { weights });
  }, [mode.id, weakOnly, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const [index, setIndex] = useState(0);
  const [pick, setPick] = useState(null);
  const [results, setResults] = useState([]);
  const q = round[index];
  const done = results.length === round.length;

  useEffect(() => {
    store.getState().apply({ type: "clearHighlights" });
    store.getState().apply({ type: "setView", view: "front" });
  }, [index, seed, store]);

  const answer = (value) => {
    if (pick !== null || done) return;
    const correct = isCorrect(q, value);
    setPick(value);
    setResults((r) => [...r, { q, tooth: q.tooth, correct }]);
    if (mode.uses3d) {
      store.getState().apply({ type: "highlight", teeth: [q.tooth], color: ACCENTS.correct });
      if (!correct && value) store.getState().apply({ type: "highlight", teeth: [value], color: ACCENTS.wrong });
    }
  };

  const next = () => {
    if (index + 1 === round.length) {
      const final = results;
      recordRound(mode.id, final.map(({ tooth, correct }) => ({ tooth, correct })), final.filter((r) => r.correct).length * XP_PER_CORRECT);
    } else {
      setIndex((i) => i + 1);
    }
    setPick(null);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Enter" && pick !== null) next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (done && pick === null) {
    return (
      <Results
        results={results}
        mode={mode}
        onAgain={() => {
          setSeed((s) => s + 1);
          setIndex(0);
          setResults([]);
        }}
      />
    );
  }

  const correct = pick !== null && isCorrect(q, pick);
  const card = (
    <div className="rounded-2xl border border-line bg-white p-6">
      <div className="flex items-center justify-between text-sm font-bold text-ink-faint">
        <span>
          Question {index + 1} of {round.length}
        </span>
        <span className="tabular-nums text-brand">{results.filter((r) => r.correct).length * XP_PER_CORRECT} XP</span>
      </div>
      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-line">
        <span className="block h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${(results.length / round.length) * 100}%` }} />
      </span>
      <AnimatePresence mode="wait">
        <motion.div key={q.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
          <p className="mt-6 font-display text-2xl font-semibold leading-snug sm:text-3xl">{q.prompt}</p>
          {q.sub && <p className="mt-1 text-lg text-ink-soft">{q.sub}</p>}
          {q.kind === "choice" && (
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {q.options.map((o) => {
                const state = pick === null ? "" : o === q.answer ? "right" : o === pick ? "wrong" : "dim";
                return (
                  <button
                    key={o}
                    type="button"
                    disabled={pick !== null}
                    onClick={() => answer(o)}
                    className={`flex items-center justify-between rounded-xl border-2 px-4 py-3.5 text-left text-lg font-bold transition-all ${
                      state === "right"
                        ? "border-score-good bg-score-good-tint text-score-good"
                        : state === "wrong"
                          ? "border-score-low bg-score-low-tint text-score-low"
                          : state === "dim"
                            ? "border-line text-ink-faint"
                            : "border-line hover:-translate-y-0.5 hover:border-brand hover:bg-brand-tint"
                    }`}
                  >
                    {o}
                    {state === "right" && <FiCheck />}
                    {state === "wrong" && <FiX />}
                  </button>
                );
              })}
            </div>
          )}
          {q.kind === "tooth" && pick === null && <p className="mt-6 rounded-xl bg-bone px-4 py-3 text-ink-soft">Click it on the 3D mouth or on the chart.</p>}
        </motion.div>
      </AnimatePresence>
      {pick !== null && (
        <div className={`mt-6 flex animate-rise-in flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 ${correct ? "bg-score-good-tint" : "bg-score-low-tint"}`}>
          <p className={`font-bold ${correct ? "text-score-good" : "text-score-low"}`}>
            {correct ? "Correct!" : `Not quite: it's ${q.answer}`}
            <span className="block text-sm font-normal text-ink-soft">{toothName(q.tooth)}</span>
          </p>
          <button type="button" className="btn-primary" onClick={next} autoFocus>
            {index + 1 === round.length ? "See results" : "Next"} <FiArrowRight />
          </button>
        </div>
      )}
    </div>
  );

  if (!mode.uses3d) return <div className="mx-auto max-w-2xl">{card}</div>;
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <DentalViewer
        mode={pick === null ? "select" : "focus"}
        onPickTooth={(id) => answer(id)}
        className="h-[min(70vh,620px)] min-h-[380px]"
        caption="Click the tooth · drag to rotate"
        fallback={null}
      />
      <div className="flex flex-col gap-4">
        {card}
        <Odontogram teeth={pick ? [pick] : []} chart={[]} active={null} onPick={(id) => answer(id)} />
      </div>
    </div>
  );
};

const QuizPage = () => {
  const { mode: id } = useParams();
  const [params] = useSearchParams();
  const mode = QUIZ_MODES.find((m) => m.id === id);
  if (!mode) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="font-display text-xl font-semibold">That drill doesn't exist.</p>
        <Link to="/learn" className="btn-primary mt-6">All drills</Link>
      </div>
    );
  }
  return (
    <SceneProvider key={id}>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <div className="mb-5 flex items-center gap-3">
          <Link to="/learn" className="text-sm font-bold text-brand hover:underline">← All drills</Link>
          <span className="text-ink-faint">/</span>
          <h1 className="font-display text-xl font-semibold">{mode.title}</h1>
          {params.get("weak") && <span className="rounded-full bg-score-mid-tint px-2.5 py-0.5 text-xs font-bold text-score-mid">Weak spots</span>}
        </div>
        <Quiz mode={mode} weakOnly={Boolean(params.get("weak"))} />
      </div>
    </SceneProvider>
  );
};

export default QuizPage;
