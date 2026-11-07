import { Link } from "react-router-dom";

const NotFound = () => (
  <section className="mx-auto max-w-xl px-4 py-24 text-center">
    <p className="font-display text-6xl font-semibold text-brand">404</p>
    <h1 className="mt-3 font-display text-2xl font-semibold">This page has gone missing</h1>
    <p className="mt-2 text-ink-soft">Like a lost filling. Let's get you back.</p>
    <Link to="/" className="btn-primary mt-6">Go home</Link>
  </section>
);

export default NotFound;
