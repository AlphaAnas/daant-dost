import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiAlertCircle, FiCheck, FiCheckCircle, FiChevronDown, FiClock, FiPrinter, FiRefreshCw, FiStar, FiX, FiXCircle } from "react-icons/fi";
import ScoreRing from "./ScoreRing";
import { GRADE_STYLE, VERDICT, formatClock, scoreColor } from "./labels";

const Card = ({ title, children, className = "" }) => (
  <section className={`rounded-2xl border border-line bg-white p-5 sm:p-6 ${className}`}>
    {title && <h2 className="mb-4 font-display text-lg font-semibold">{title}</h2>}
    {children}
  </section>
);

const Confetti = () => {
  const bits = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        x: Math.random() * 100,
        delay: Math.random() * 0.4,
        rot: Math.random() * 360,
        color: ["#13BCFB", "#0A74DA", "#2BD19A", "#FFB020", "#FF7A2F"][i % 5],
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {bits.map((b, i) => (
        <motion.span
          key={i}
          className="absolute top-0 h-2.5 w-1.5 rounded-sm"
          style={{ left: `${b.x}%`, background: b.color }}
          initial={{ y: -20, rotate: b.rot, opacity: 1 }}
          animate={{ y: 420, rotate: b.rot + 540, opacity: 0 }}
          transition={{ duration: 2.2, delay: b.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
};

const ItemReview = ({ item, index }) => {
  const [open, setOpen] = useState(item.verdict !== "correct");
  const v = VERDICT[item.verdict];
  const Icon = item.verdict === "correct" ? FiCheckCircle : item.verdict === "partial" ? FiAlertCircle : FiXCircle;
  return (
    <li className="rounded-xl border border-line">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-start gap-3 px-4 py-3 text-left">
        <Icon className="mt-0.5 shrink-0" style={{ color: v.color }} size={18} />
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold uppercase tracking-wider text-ink-faint">
            {index + 1} · {item.stage}
          </span>
          <span className="font-bold">{item.question}</span>
        </span>
        <span className="shrink-0 font-display font-semibold tabular-nums">
          {item.points}/{item.max}
        </span>
        <FiChevronDown className={`mt-1 shrink-0 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="grid gap-3 border-t border-line px-4 py-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-ink-faint">Your answer</p>
            <p className="mt-1 whitespace-pre-wrap">{item.yourAnswer}</p>
            {item.feedback && <p className="mt-2 text-ink-soft">{item.feedback}</p>}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-ink-faint">Model answer</p>
            <p className="mt-1 font-bold text-score-good">{item.correctAnswer}</p>
            {item.explain && <p className="mt-2 text-ink-soft">{item.explain}</p>}
          </div>
        </div>
      )}
    </li>
  );
};

const ReportView = ({ view, onRetry, retrying }) => {
  const r = view.report;
  const great = r.grade === "Distinction";
  return (
    <div className="grid gap-5">
      <section className="relative overflow-hidden rounded-2xl bg-white p-6 ring-1 ring-line sm:p-8">
        {great && <Confetti />}
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <ScoreRing score={r.score} />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className={`rounded-full px-3 py-1 text-sm font-bold ${GRADE_STYLE[r.grade]}`}>{r.grade}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-bone px-3 py-1 text-sm font-bold text-ink-soft">
                <FiClock /> {formatClock(r.durationSec)}
              </span>
              <span className="rounded-full bg-bone px-3 py-1 text-sm font-bold text-ink-soft">{view.mode === "exam" ? "Exam" : "Practice"} mode</span>
              {r.ai && (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-tint px-3 py-1 text-sm font-bold text-brand-dark">
                  <FiStar /> AI feedback
                </span>
              )}
            </div>
            <h1 className="mt-3 font-display text-2xl font-semibold sm:text-3xl">{view.case.title}</h1>
            <p className="mt-2 text-ink-soft">{r.summary}</p>
            <p className={`mt-3 inline-flex items-center gap-2 rounded-xl px-3 py-2 font-bold ${r.gotDiagnosis ? "bg-score-good-tint text-score-good" : "bg-score-low-tint text-score-low"}`}>
              {r.gotDiagnosis ? <FiCheck /> : <FiX />} Diagnosis: {r.diagnosis}
            </p>
          </div>
        </div>
      </section>

      <Card title="Skills">
        <ul className="grid gap-3">
          {r.competencies.map((c, i) => (
            <li key={c.id}>
              <div className="flex justify-between text-sm font-bold">
                <span>{c.label}</span>
                <span className="tabular-nums" style={{ color: scoreColor(c.score) }}>
                  {c.score}%
                </span>
              </div>
              <span className="mt-1.5 block h-2.5 overflow-hidden rounded-full bg-bone-deep">
                <motion.span
                  className="block h-full rounded-full"
                  style={{ background: scoreColor(c.score) }}
                  initial={{ width: 0 }}
                  animate={{ width: `${c.score}%` }}
                  transition={{ duration: 0.9, delay: 0.2 + i * 0.08, ease: [0.2, 0.7, 0.2, 1] }}
                />
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card title="What went well">
          <ul className="grid gap-2">
            {r.strengths.map((s) => (
              <li key={s} className="flex gap-2.5">
                <FiCheckCircle className="mt-1 shrink-0 text-score-good" /> {s}
              </li>
            ))}
          </ul>
        </Card>
        <Card title="To work on">
          <ul className="grid gap-2">
            {r.gaps.length ? (
              r.gaps.map((s) => (
                <li key={s} className="flex gap-2.5">
                  <FiAlertCircle className="mt-1 shrink-0 text-score-mid" /> {s}
                </li>
              ))
            ) : (
              <li className="text-ink-soft">Nothing major. Try exam mode next.</li>
            )}
          </ul>
        </Card>
      </div>

      <Card title="History taking">
        <p className="text-sm text-ink-soft">You asked {r.history.asked} questions.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {r.history.covered.map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5 rounded-lg bg-score-good-tint px-2.5 py-1 text-sm font-bold text-score-good">
              <FiCheck /> {t}
            </span>
          ))}
          {r.history.missed.map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5 rounded-lg bg-score-mid-tint px-2.5 py-1 text-sm font-bold text-score-mid">
              <FiX /> {t}
            </span>
          ))}
        </div>
      </Card>

      <Card title="Your study plan">
        <ol className="grid gap-2">
          {r.studyPlan.map((s, i) => (
            <li key={s} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      </Card>

      <Card title="Question by question">
        <ul className="grid gap-2">
          {r.items.map((item, i) => (
            <ItemReview key={item.id} item={item} index={i} />
          ))}
        </ul>
      </Card>

      <Card title="Take-home points" className="bg-stage text-white ring-0">
        <ul className="grid gap-2">
          {r.teachingPoints.map((t) => (
            <li key={t} className="flex gap-2.5 text-white/85">
              <FiStar className="mt-1 shrink-0 text-sky" /> {t}
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex flex-wrap gap-3 print:hidden">
        <button type="button" className="btn-primary" onClick={onRetry} disabled={retrying}>
          <FiRefreshCw /> Try this case again
        </button>
        <Link to="/assess" className="btn-quiet">Choose another case</Link>
        <button type="button" className="btn-quiet" onClick={() => window.print()}>
          <FiPrinter /> Print
        </button>
      </div>
    </div>
  );
};

export default ReportView;
