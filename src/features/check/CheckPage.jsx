import { useEffect, useState } from "react";
import { FiShield } from "react-icons/fi";
import DentalViewer from "../../components/dental/three/DentalViewer";
import { SceneProvider, playCommands, useSceneStore } from "../../scene/sceneStore";
import { api } from "../../lib/api";
import CheckWizard from "./CheckWizard";
import CheckResult from "./CheckResult";
import { stringsFor } from "./strings";

const fresh = (language = "English") => ({ who: "me", age: undefined, language, problem: null, story: "", answers: {} });

const Check = () => {
  const store = useSceneStore();
  const [bank, setBank] = useState(null);
  const [languages, setLanguages] = useState(["English"]);
  const [state, setState] = useState(fresh);
  const [teeth, setTeeth] = useState([]);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [round, setRound] = useState(0);
  const [translating, setTranslating] = useState(false);
  const t = stringsFor(state.language);

  // Questions in the chosen language (the answers the rules read stay English).
  useEffect(() => {
    let live = true;
    setTranslating(state.language !== "English");
    api(`/selfcheck?lang=${encodeURIComponent(state.language)}`).then(
      (b) => {
        if (!live) return;
        setBank(b.problems);
        setLanguages(b.languages);
        setTranslating(false);
      },
      (e) => live && (setError(e.message), setTranslating(false)),
    );
    return () => {
      live = false;
    };
  }, [state.language]);

  // A child's mouth: show their age, with baby teeth.
  const onWho = (who, age) => {
    store.getState().apply({ type: "setAge", years: who === "child" && age !== undefined ? Math.max(1, age) : null });
  };

  const submit = async () => {
    setBusy(true);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      const r = await api("/selfcheck/result", { method: "POST", body: { ...state, teeth } });
      setResult(r);
      playCommands(store, r.commands);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    setResult(null);
    setState((s) => fresh(s.language));
    setTeeth([]);
    setRound((n) => n + 1);
    store.getState().apply({ type: "clearHighlights" });
    store.getState().apply({ type: "setAge", years: null });
    store.getState().apply({ type: "setView", view: "front" });
  };

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:py-8">
      <div className="lg:sticky lg:top-20 lg:self-start">
        <DentalViewer
          mode={result ? "focus" : "select"}
          teeth={result ? [] : teeth}
          onPickTooth={(id) => setTeeth((list) => (list.includes(id) ? list.filter((t) => t !== id) : [...list, id].slice(-4)))}
          caption={result ? t.dragTurn : t.tapTooth}
          className="h-[38vh] min-h-[280px] lg:h-[calc(100vh-8rem)]"
          fallback={null}
        />
        <p className="mt-3 flex items-start gap-2 text-sm text-ink-soft">
          <FiShield className="mt-0.5 shrink-0 text-brand" />
          {t.disclaimer}
        </p>
      </div>
      <div>
        {error && <p role="alert" className="mb-4 rounded-xl bg-score-low-tint px-4 py-3 font-bold text-score-low">{error}</p>}
        {busy && (
          <div className="flex flex-col items-center gap-4 py-24 text-center" aria-live="polite">
            <span className="h-12 w-12 animate-orbit rounded-full border-4 border-line border-t-brand" />
            <p className="font-display text-xl font-semibold">{t.reading}</p>
            <p className="text-ink-soft">{t.readingHelp}</p>
          </div>
        )}
        {!busy && result && <CheckResult result={result} language={state.language} onRestart={restart} />}
        {!busy && !result && bank && (
          <CheckWizard
            key={round}
            bank={bank}
            languages={languages}
            state={state}
            setState={setState}
            teeth={teeth}
            onTeeth={setTeeth}
            onSubmit={submit}
            onWho={onWho}
            translating={translating}
          />
        )}
        {!bank && !error && <div className="h-96 animate-pulse rounded-2xl bg-bone-deep" />}
      </div>
    </div>
  );
};

const CheckPage = () => (
  <SceneProvider>
    <Check />
  </SceneProvider>
);

export default CheckPage;
