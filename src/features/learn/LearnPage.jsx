import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiArrowRight, FiAward, FiCrosshair, FiGrid, FiHash, FiRepeat, FiZap } from "react-icons/fi";
import { QUIZ_MODES } from "./quizEngine";
import { useProgress, weakTeeth } from "./progress";

const ICONS = { find: FiCrosshair, fdi: FiHash, systems: FiRepeat, types: FiGrid };

const Stat = ({ icon: Icon, value, label }) => (
  <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
    <Icon className="text-sky" size={20} />
    <div>
      <p className="font-display text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-sm text-white/60">{label}</p>
    </div>
  </div>
);

const LearnPage = () => {
  const p = useProgress();
  const weak = weakTeeth(p);
  return (
    <div>
      <section className="bg-[radial-gradient(ellipse_at_80%_0%,#27304F_0%,#141B38_50%,#0A1229_100%)] text-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
          <p className="text-sm font-bold uppercase tracking-wider text-sky">Learn</p>
          <h1 className="mt-2 font-display text-3xl font-semibold sm:text-5xl">Quick drills that stick</h1>
          <p className="mt-3 max-w-2xl text-lg text-white/70">Ten questions a round. Teeth you miss come back until you know them.</p>
          <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3">
            <Stat icon={FiZap} value={p.xp} label="XP" />
            <Stat icon={FiAward} value={p.streak} label={p.streak === 1 ? "day streak" : "day streak"} />
            <Stat icon={FiRepeat} value={p.rounds} label="rounds" />
          </div>
        </div>
      </section>
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        {weak.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-score-mid/30 bg-score-mid-tint p-5">
            <div>
              <p className="font-display text-lg font-semibold">Your weak spots</p>
              <p className="mt-1 text-ink-soft">
                Teeth you keep missing: <span className="font-bold text-ink">{weak.join(", ")}</span>
              </p>
            </div>
            <Link to="/learn/find?weak=1" className="btn-primary">
              Practise these <FiArrowRight />
            </Link>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {QUIZ_MODES.map((m, i) => {
            const Icon = ICONS[m.id];
            return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Link to={`/learn/${m.id}`} className="group flex h-full items-start gap-4 rounded-2xl border border-line bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-xl hover:shadow-brand/5">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand">
                    <Icon size={22} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-display text-lg font-semibold">{m.title}</span>
                      {m.uses3d && <span className="rounded-full bg-stage px-2 py-0.5 text-xs font-bold text-white">3D</span>}
                    </span>
                    <span className="mt-1 block text-ink-soft">{m.body}</span>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-brand">
                      {p.best[m.id] !== undefined ? `Best ${p.best[m.id]}/10 · Play again` : "Start"} <FiArrowRight className="transition-transform group-hover:translate-x-1" />
                    </span>
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default LearnPage;
