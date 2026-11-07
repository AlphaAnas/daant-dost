import { Link } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";

const ComingSoon = ({ eyebrow, title, body, items = [] }) => (
  <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
    <p className="text-sm font-bold uppercase tracking-wider text-brand">{eyebrow} · coming next</p>
    <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">{title}</h1>
    <p className="mt-3 text-lg text-ink-soft">{body}</p>
    <ul className="mt-6 flex flex-wrap gap-2">
      {items.map((i) => (
        <li key={i} className="rounded-xl border border-line bg-white px-3.5 py-2 font-bold text-ink-soft">{i}</li>
      ))}
    </ul>
    <div className="mt-10 rounded-2xl bg-stage p-6 text-white">
      <p className="font-display text-lg">Ready now: AI assessments</p>
      <p className="mt-1 text-white/65">Examine a virtual patient and get marked by an AI examiner.</p>
      <Link to="/assess" className="btn-primary mt-4">Start an assessment <FiArrowRight /></Link>
    </div>
  </section>
);

export default ComingSoon;
