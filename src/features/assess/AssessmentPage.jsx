import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiArrowRight, FiClock, FiFlag } from "react-icons/fi";
import DentalViewer from "../../components/dental/three/DentalViewer";
import { ACCENTS } from "../../components/dental/three/accents";
import { SceneProvider, createSceneStore, playCommands, useSceneStore } from "../../scene/sceneStore";
import { api } from "../../lib/api";
import { getStudent } from "../../lib/student";
import Avatar from "../../ui/Avatar";
import StageBar from "./StageBar";
import Thread from "./Thread";
import { AnswerComposer, HistoryComposer } from "./Composers";
import ReportView from "./ReportView";
import { SITE_LABEL, firstName, formatClock } from "./labels";

const useClock = (startedAt, finishedAt) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (finishedAt) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [finishedAt]);
  if (!startedAt) return "0:00";
  return formatClock(((finishedAt ? new Date(finishedAt).getTime() : now) - new Date(startedAt).getTime()) / 1000);
};

const Header = ({ view, onFinish, busy }) => {
  const clock = useClock(view.startedAt, view.finishedAt);
  const p = view.case.patient;
  const done = view.status === "done";
  return (
    <div className="border-b border-line bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        <Link to="/assess" className="rounded-lg p-2 text-ink-soft hover:bg-bone" aria-label="Back to cases">
          <FiArrowLeft />
        </Link>
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={p.name} role="patient" size="h-10 w-10" />
          <div className="min-w-0">
            <p className="truncate font-bold">
              {p.name}, {p.age}
            </p>
            <p className="truncate text-sm text-ink-soft">
              {SITE_LABEL[view.case.site]} · {view.mode === "exam" ? "Exam mode" : "Practice mode"}
            </p>
          </div>
        </div>
        <StageBar stages={view.stages} stage={view.stage} done={done} className="order-last min-w-[240px] flex-1 sm:order-none" />
        <div className="ml-auto flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 font-bold tabular-nums text-ink-soft" aria-label="Time">
            <FiClock /> {clock}
          </span>
          {!done && (
            <button type="button" className="btn-quiet px-3 py-2 text-sm" onClick={onFinish} disabled={busy}>
              <FiFlag /> Finish
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Plays the 3D moves the examiner attaches to each message, once.
const useSceneFromTranscript = (view) => {
  const store = useSceneStore();
  const played = useRef(-1);
  useEffect(() => {
    if (!view) return;
    const list = view.transcript;
    if (played.current === -1) {
      // First load: jump straight to where the station is.
      list.forEach((m) => m.commands && store.getState().applyAll(m.commands));
      played.current = list.length;
    } else if (list.length > played.current) {
      const fresh = list.slice(played.current);
      played.current = list.length;
      (async () => {
        for (const m of fresh) if (m.commands) await playCommands(store, m.commands);
      })();
    }
    if (view.report) {
      const s = store.getState();
      s.apply({ type: "clearHighlights" });
      s.apply({ type: "setLayer", layer: "gums" });
      s.apply({ type: "highlight", teeth: view.report.keyTeeth, color: view.report.gotDiagnosis ? ACCENTS.correct : ACCENTS.missed });
      s.apply({ type: "focusTeeth", teeth: view.report.keyTeeth });
    }
  }, [view, store]);
};

const Session = ({ id }) => {
  const navigate = useNavigate();
  const [view, setView] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);
  const [freshFrom, setFreshFrom] = useState(Infinity);
  const [tooth, setTooth] = useState(null);
  const scroller = useRef(null);
  useSceneFromTranscript(view);

  useEffect(() => {
    let live = true;
    api(`/assessments/${id}`).then(
      (v) => live && setView(v),
      (e) => live && setError(e.message),
    );
    return () => {
      live = false;
    };
  }, [id]);

  useEffect(() => setTooth(null), [view?.item?.id]);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [view?.transcript.length, busy]);

  const act = useCallback(
    async (kind, path, body) => {
      setBusy(kind);
      setError("");
      const before = view?.transcript.length ?? 0;
      try {
        const next = await api(`/assessments/${id}/${path}`, { method: "POST", body });
        setFreshFrom(before);
        setView(next);
        if (next.status === "done") window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (e) {
        setError(e.message);
      } finally {
        setBusy(null);
      }
    },
    [id, view],
  );

  const retry = async () => {
    setBusy("retry");
    try {
      const next = await api("/assessments", {
        method: "POST",
        body: { caseId: view.case.id, mode: view.mode, student: getStudent() },
      });
      navigate(`/assess/${next.id}`);
    } catch (e) {
      setError(e.message);
      setBusy(null);
    }
  };

  if (!view) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        {error ? (
          <>
            <p className="font-display text-xl font-semibold">{error}</p>
            <Link to="/assess" className="btn-primary mt-6">Back to cases</Link>
          </>
        ) : (
          <span className="inline-block h-9 w-9 animate-orbit rounded-full border-2 border-line border-t-brand" aria-label="Loading" />
        )}
      </div>
    );
  }

  const patient = view.case.patient;
  const done = view.status === "done";
  const toothMode = view.status === "items" && view.item?.type === "tooth";
  const typing =
    busy === "ask" ? `${firstName(patient.name)} is answering…` : busy === "answer" ? "The examiner is marking…" : busy === "finish" ? "Writing your feedback…" : busy === "examine" ? "Examiner…" : null;

  const viewer = (
    <DentalViewer
      mode={toothMode ? "select" : "focus"}
      teeth={toothMode && tooth ? [tooth] : []}
      onPickTooth={toothMode ? (t) => setTooth(t) : undefined}
      accent={toothMode ? ACCENTS.select : ACCENTS.tutor}
      caption={toothMode ? "Click the tooth you want · drag to rotate · scroll to zoom" : undefined}
      className="h-[42vh] min-h-[300px] lg:h-[calc(100vh-11rem)]"
      fallback={<p className="rounded-2xl border border-dashed border-ink-faint p-5 text-ink-soft">The 3D mouth needs WebGL. Use the tooth search to answer.</p>}
    />
  );

  return (
    <div className="bg-bone">
      <Header view={view} onFinish={() => act("finish", "finish")} busy={Boolean(busy)} />
      <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-[4.5rem] lg:self-start">{viewer}</div>

        {done ? (
          <ReportView view={view} onRetry={retry} retrying={busy === "retry"} />
        ) : (
          <div className="flex min-h-0 flex-col lg:h-[calc(100vh-11rem)]">
            <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto pr-1">
              <Thread transcript={view.transcript} patient={patient} freshFrom={freshFrom} typing={typing} />
            </div>
            {error && (
              <p role="alert" className="mt-2 rounded-xl bg-score-low-tint px-3 py-2 text-sm font-bold text-score-low">
                {error}
              </p>
            )}
            <div className="mt-3 shrink-0">
              {view.status === "history" && (
                <HistoryComposer view={view} busy={Boolean(busy)} onAsk={(q) => act("ask", "ask", { question: q })} onExamine={() => act("examine", "examine")} />
              )}
              {view.status === "items" && view.item && (
                <AnswerComposer view={view} busy={Boolean(busy)} tooth={tooth} onTooth={setTooth} onAnswer={(a) => act("answer", "answer", { answer: a })} />
              )}
              {view.status === "review" && (
                <div className="animate-rise-in rounded-2xl bg-stage p-5 text-white">
                  <p className="font-display text-lg">Station complete</p>
                  <p className="mt-1 text-white/65">See your score, the examiner's feedback and a study plan.</p>
                  <button type="button" className="btn-primary mt-4" onClick={() => act("finish", "finish")} disabled={Boolean(busy)}>
                    {busy === "finish" ? "Writing your feedback…" : "See my results"} <FiArrowRight />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AssessmentPage = () => {
  const { id } = useParams();
  const store = useMemo(() => createSceneStore(), [id]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <SceneProvider key={id} store={store}>
      <Session id={id} />
    </SceneProvider>
  );
};

export default AssessmentPage;
