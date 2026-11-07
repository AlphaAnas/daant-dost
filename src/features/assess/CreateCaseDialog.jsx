import { useEffect, useRef, useState } from "react";
import { FiZap } from "react-icons/fi";
import { api } from "../../lib/api";
import { getStudent } from "../../lib/student";

const IDEAS = [
  "A 50-year-old smoker with bleeding gums and a loose lower front tooth",
  "A 9-year-old who knocked out a front tooth playing football",
  "A 35-year-old with a painless white patch on the side of the tongue",
  "A 28-year-old with jaw clicking and pain when chewing",
];

// A teacher or student describes a patient; the AI writes a full station.
const CreateCaseDialog = ({ open, onClose, onCreated, aiOn }) => {
  const [brief, setBrief] = useState("");
  const [difficulty, setDifficulty] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef(null);
  useEffect(() => {
    if (open) setTimeout(() => input.current?.focus(), 30);
  }, [open]);
  if (!open) return null;

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const card = await api("/cases/generate", { method: "POST", body: { brief, difficulty, student: getStudent() } });
      setBrief("");
      onCreated(card);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 backdrop-blur-sm sm:items-center" onMouseDown={() => !busy && onClose()}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-title"
        onSubmit={create}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-lg animate-rise-in rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h2 id="create-title" className="flex items-center gap-2 font-display text-xl font-semibold">
          <FiZap className="text-brand" /> Write a patient with AI
        </h2>
        <p className="mt-1 text-ink-soft">Describe a patient in one line. Claude writes the history, findings, answers and marking scheme.</p>
        {!aiOn && (
          <p className="mt-3 rounded-xl bg-score-mid-tint px-3 py-2 text-sm font-bold text-score-mid">
            The AI isn't connected on this server. Add an ANTHROPIC_API_KEY to turn this on.
          </p>
        )}
        <label htmlFor="brief" className="mt-4 block font-bold">Patient brief</label>
        <textarea
          id="brief"
          ref={input}
          rows={3}
          maxLength={400}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="e.g. A 50-year-old smoker with bleeding gums and a loose lower front tooth"
          className="field mt-2 resize-none"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {IDEAS.map((i) => (
            <button key={i} type="button" onClick={() => setBrief(i)} className="rounded-lg bg-bone px-2.5 py-1 text-left text-xs text-ink-soft hover:text-ink">
              {i}
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="font-bold">Difficulty</span>
          <div role="radiogroup" aria-label="Difficulty" className="inline-flex rounded-xl border border-line bg-white p-1 text-sm">
            {[1, 2, 3].map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={difficulty === d}
                onClick={() => setDifficulty(d)}
                className={`rounded-lg px-3 py-1.5 font-bold ${difficulty === d ? "bg-ink text-white" : "text-ink-soft"}`}
              >
                {["Core", "Intermediate", "Advanced"][d - 1]}
              </button>
            ))}
          </div>
        </div>
        {error && <p role="alert" className="mt-3 rounded-xl bg-score-low-tint px-3 py-2 text-sm font-bold text-score-low">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-quiet" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy || brief.trim().length < 8 || !aiOn}>
            {busy ? "Writing the case… (about 30 s)" : "Create station"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCaseDialog;
