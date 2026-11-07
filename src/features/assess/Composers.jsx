import { useEffect, useRef, useState } from "react";
import { FiArrowRight, FiCheck, FiHelpCircle, FiSend, FiX } from "react-icons/fi";
import ToothPicker from "../../components/dental/ToothPicker";
import { toothName } from "../../data/teeth";
import { firstName } from "./labels";

const HISTORY_GUIDE = [
  ["Site", "Where is it? Which tooth?"],
  ["Onset", "When did it start?"],
  ["Character", "What is the pain like?"],
  ["Triggers", "What makes it better or worse?"],
  ["Timing", "How long does it last? Night pain?"],
  ["Associated", "Swelling, taste, fever, biting?"],
  ["Background", "Dental and medical history, medicines, allergies, habits"],
];

const Meter = ({ value, max, label }) => (
  <div className="min-w-0 flex-1">
    <div className="flex justify-between text-xs font-bold text-ink-soft">
      <span>{label}</span>
      <span className="tabular-nums">
        {value}/{max}
      </span>
    </div>
    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-line">
      <span className="block h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${(value / max) * 100}%` }} />
    </span>
  </div>
);

// Taking the history: free questions to the patient.
export const HistoryComposer = ({ view, busy, onAsk, onExamine }) => {
  const [text, setText] = useState("");
  const [hint, setHint] = useState(false);
  const input = useRef(null);
  useEffect(() => {
    if (!busy) input.current?.focus();
  }, [busy]);
  const { asked, max, covered, required } = view.history;
  const out = asked >= max;
  const send = () => {
    if (!text.trim() || busy || out) return;
    onAsk(text.trim());
    setText("");
  };
  return (
    <div className="space-y-3">
      {hint && (
        <div className="animate-rise-in rounded-xl border border-line bg-white p-3 text-sm">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-bold">A focused pain history</p>
            <button type="button" onClick={() => setHint(false)} aria-label="Close guide" className="rounded p-1 text-ink-faint hover:bg-bone">
              <FiX />
            </button>
          </div>
          <dl className="grid gap-1 sm:grid-cols-2">
            {HISTORY_GUIDE.map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="w-24 shrink-0 font-bold text-brand-dark">{k}</dt>
                <dd className="text-ink-soft">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      <div className="flex items-end gap-2 rounded-2xl border border-line bg-white p-2 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
        <label htmlFor="ask" className="sr-only">Ask the patient</label>
        <textarea
          id="ask"
          ref={input}
          rows={1}
          value={text}
          disabled={out}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={out ? "That's all your questions for this station" : `Ask ${firstName(view.case.patient.name)} a question…`}
          className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 placeholder:text-ink-faint focus:outline-none"
        />
        <button
          type="button"
          onClick={send}
          disabled={!text.trim() || busy || out}
          aria-label="Ask"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-white transition-colors hover:bg-brand-dark disabled:bg-line disabled:text-ink-faint"
        >
          <FiSend size={18} />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Meter value={asked} max={max} label="Questions asked" />
        {covered !== undefined && <Meter value={covered} max={required} label="Key areas covered" />}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {view.mode === "practice" ? (
          <button type="button" onClick={() => setHint((h) => !h)} className="inline-flex items-center gap-1.5 text-sm font-bold text-brand hover:underline">
            <FiHelpCircle /> History guide
          </button>
        ) : (
          <span className="text-sm text-ink-faint">Exam mode: no hints</span>
        )}
        <button type="button" onClick={onExamine} disabled={busy} className={asked ? "btn-primary" : "btn-quiet"}>
          Move on to examination <FiArrowRight />
        </button>
      </div>
    </div>
  );
};

const STAGE_NAME = {
  examination: "Examination",
  investigations: "Investigations",
  diagnosis: "Diagnosis",
  management: "Management",
};

// Answering the examiner's current question.
export const AnswerComposer = ({ view, busy, tooth, onTooth, onAnswer }) => {
  const item = view.item;
  const [single, setSingle] = useState(null);
  const [multi, setMulti] = useState([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState(false);
  useEffect(() => {
    setSingle(null);
    setMulti([]);
    setText("");
    setSearch(false);
  }, [item.id]);

  const answer =
    item.type === "single" ? single : item.type === "multi" ? multi : item.type === "tooth" ? (tooth ? [tooth] : []) : text.trim();
  const ready = Array.isArray(answer) ? answer.length > 0 : Boolean(answer);
  const submit = () => ready && !busy && onAnswer(answer);

  return (
    <div className="animate-rise-in rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider">
        <span className="text-brand">{STAGE_NAME[item.stage]}</span>
        <span className="text-ink-faint">
          Question {view.progress.answered + 1} of {view.progress.total} · {item.points} marks
        </span>
      </div>
      <p className="mt-2 font-display text-lg font-medium leading-snug">{item.question}</p>
      {item.helper && <p className="mt-1 text-sm text-ink-soft">{item.helper}</p>}

      <div className="mt-4">
        {item.type === "single" && (
          <div className="grid gap-2">
            {item.options.map((o) => (
              <button
                key={o}
                type="button"
                role="radio"
                aria-checked={single === o}
                onClick={() => setSingle(o)}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left font-bold transition-colors ${
                  single === o ? "border-brand bg-brand-tint text-ink" : "border-line bg-white text-ink hover:border-ink-faint"
                }`}
              >
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${single === o ? "border-brand" : "border-ink-faint"}`}>
                  {single === o && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
                </span>
                {o}
              </button>
            ))}
          </div>
        )}

        {item.type === "multi" && (
          <div className="flex flex-wrap gap-2">
            {item.options.map((o) => {
              const on = multi.includes(o);
              return (
                <button
                  key={o}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => setMulti((m) => (on ? m.filter((x) => x !== o) : [...m, o]))}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                    on ? "border-brand bg-brand-tint" : "border-line bg-white hover:border-ink-faint"
                  }`}
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${on ? "border-brand bg-brand text-white" : "border-ink-faint"}`}>
                    {on && <FiCheck size={14} strokeWidth={3} />}
                  </span>
                  {o}
                </button>
              );
            })}
          </div>
        )}

        {item.type === "text" && (
          <>
            <label htmlFor="answer-text" className="sr-only">Your answer</label>
            <textarea
              id="answer-text"
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
              }}
              placeholder="Write your answer…"
              className="field resize-y"
            />
            <p className="mt-1.5 text-xs text-ink-faint">Marked by the AI examiner against the key points. Ctrl+Enter to send.</p>
          </>
        )}

        {item.type === "tooth" && (
          <div>
            <div
              className={`flex min-h-[52px] items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3 ${
                tooth ? "border-brand bg-brand-tint" : "border-line bg-bone"
              }`}
            >
              {tooth ? (
                <>
                  <span className="rounded-lg bg-brand px-2 py-1 font-display font-semibold tabular-nums text-white">{tooth}</span>
                  <span className="font-bold">{toothName(tooth).replace(/^\d+ /, "")}</span>
                  <button type="button" onClick={() => onTooth(null)} className="ml-auto rounded p-1 text-ink-faint hover:bg-white" aria-label="Clear tooth">
                    <FiX />
                  </button>
                </>
              ) : (
                <span className="text-ink-soft">
                  <span className="hidden lg:inline">Click a tooth on the 3D mouth.</span>
                  <span className="lg:hidden">Tap a tooth on the 3D mouth above.</span>
                </span>
              )}
            </div>
            <button type="button" onClick={() => setSearch((s) => !s)} className="mt-2 text-sm font-bold text-brand hover:underline">
              {search ? "Hide tooth search" : "Or search for a tooth"}
            </button>
            {search && (
              <div className="mt-2">
                <ToothPicker selected={tooth ? [tooth] : []} multi={false} onPick={(id) => onTooth(id)} />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-end">
        <button type="button" className="btn-primary" disabled={!ready || busy} onClick={submit}>
          {busy ? "Marking…" : "Submit answer"} <FiArrowRight />
        </button>
      </div>
    </div>
  );
};
