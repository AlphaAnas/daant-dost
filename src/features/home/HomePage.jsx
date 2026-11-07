import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiArrowRight, FiCompass, FiLayers, FiMessageCircle, FiTarget } from "react-icons/fi";
import DentalViewer from "../../components/dental/three/DentalViewer";
import { SceneProvider, createSceneStore } from "../../scene/sceneStore";

const heroStore = () => createSceneStore({ autoRotate: true, open: 0.35 });

const FEATURES = [
  {
    icon: FiMessageCircle,
    title: "AI virtual patients",
    body: "Interview a patient who answers like a real person, examine on the 3D mouth, order tests and commit to a diagnosis.",
    to: "/assess",
    cta: "Start an assessment",
  },
  {
    icon: FiTarget,
    title: "Marked like an OSCE",
    body: "An AI examiner scores history, examination, investigations, diagnosis, management and communication, then coaches you.",
    to: "/assess",
    cta: "See the stations",
  },
  {
    icon: FiLayers,
    title: "Every layer of the mouth",
    body: "Peel back gums and bone, see roots and pulp, open the jaw and cut any tooth in half.",
    to: "/explore",
    cta: "Explore the mouth",
  },
];

const rise = (i = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay: 0.08 * i, ease: [0.2, 0.7, 0.2, 1] },
});

const HomePage = () => (
  <>
    <section className="relative overflow-hidden bg-[radial-gradient(ellipse_at_70%_40%,#27304F_0%,#141B38_45%,#0A1229_100%)] text-white">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-8 px-4 pb-12 pt-10 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:pb-20 lg:pt-16">
        <div className="relative z-10">
          <motion.p {...rise(0)} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-sky ring-1 ring-white/10">
            <span className="h-1.5 w-1.5 rounded-full bg-sky" /> AI-powered dental learning
          </motion.p>
          <motion.h1 {...rise(1)} className="mt-5 font-display text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-6xl">
            Learn dentistry on a <span className="bg-gradient-to-r from-sky to-[#7CD8FF] bg-clip-text text-transparent">living 3D mouth.</span>
          </motion.h1>
          <motion.p {...rise(2)} className="mt-5 max-w-lg text-lg leading-relaxed text-white/70">
            Examine AI virtual patients, get marked by an AI examiner and see every tooth, root and nerve in 3D.
          </motion.p>
          <motion.div {...rise(3)} className="mt-8 flex flex-wrap gap-3">
            <Link to="/assess" className="btn-primary px-6 py-3.5 text-base shadow-lg shadow-brand/30">
              Start an AI assessment <FiArrowRight />
            </Link>
            <Link to="/explore" className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-6 py-3.5 font-bold text-white ring-1 ring-white/15 transition-colors hover:bg-white/15">
              <FiCompass /> Explore the mouth
            </Link>
          </motion.div>
          <motion.dl {...rise(4)} className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-white/10 pt-6">
            {[
              ["6", "patient cases"],
              ["6", "skills marked"],
              ["32", "teeth in 3D"],
            ].map(([n, label]) => (
              <div key={label}>
                <dt className="sr-only">{label}</dt>
                <dd className="font-display text-3xl font-semibold">{n}</dd>
                <dd className="text-sm text-white/55">{label}</dd>
              </div>
            ))}
          </motion.dl>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}
          className="relative h-[360px] sm:h-[460px] lg:h-[540px]"
        >
          <div className="absolute inset-[12%] rounded-full bg-sky/20 blur-3xl" aria-hidden />
          <SceneProvider store={heroStore()}>
            <DentalViewer
              mode="focus"
              controls={false}
              className="!absolute inset-0 !bg-none !ring-0"
              fallback={<div className="flex h-full items-center justify-center text-white/60">3D needs WebGL on this device.</div>}
            />
          </SceneProvider>
        </motion.div>
      </div>
    </section>

    <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
      <h2 className="font-display text-2xl font-semibold sm:text-3xl">Practise like it's the real thing</h2>
      <p className="mt-2 max-w-2xl text-ink-soft">Every case is a fictional patient built with a marking scheme, so you can fail safely and learn fast.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body, to, cta }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
          >
            <Link to={to} className="group flex h-full flex-col rounded-2xl border border-line bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-xl hover:shadow-brand/5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-tint text-brand">
                <Icon size={20} />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
              <p className="mt-2 flex-1 text-ink-soft">{body}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 font-bold text-brand">
                {cta} <FiArrowRight className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  </>
);

export default HomePage;
