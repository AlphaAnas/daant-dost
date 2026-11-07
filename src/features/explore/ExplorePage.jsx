import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import DentalViewer from "../../components/dental/three/DentalViewer";
import TutorPanel from "./TutorPanel";
import AgeTimeline from "./AgeTimeline";
import Odontogram from "../../components/dental/Odontogram";
import ToothPanel from "../../components/dental/ToothPanel";
import ToothPicker from "../../components/dental/ToothPicker";
import { useToothSelection } from "../../components/dental/toothSelection";
import { SceneProvider, createSceneStore } from "../../scene/sceneStore";
import { SITE_STUDY_NOTES, SITE_TITLES, dentalRegionById, dentalRegionGroup } from "../../data/dental";
import { toothById } from "../../data/teeth";

const Group = ({ title, items, tone }) => (
  <div>
    <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink-faint">{title}</p>
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li
          key={item}
          className={`rounded-lg px-2.5 py-1 text-sm ${
            tone === "test" ? "bg-brand-tint font-bold text-brand-dark" : tone === "dx" ? "border border-line bg-white text-ink" : "bg-bone text-ink-soft"
          }`}
        >
          {item}
        </li>
      ))}
    </ul>
  </div>
);

const StudyNotes = ({ group }) => {
  const notes = SITE_STUDY_NOTES[group];
  if (!notes) return null;
  return (
    <section className="animate-rise-in rounded-2xl border border-line bg-white p-5" aria-label="Study notes">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-medium">{SITE_TITLES[group]}</h2>
        <span className="text-xs font-bold text-ink-faint">Study notes</span>
      </div>
      <div className="grid gap-4">
        <Group title="Key structures" items={notes.structures} />
        <Group title="Conditions to tell apart" items={notes.differentials} tone="dx" />
        <Group title="Tests that separate them" items={notes.tests} tone="test" />
      </div>
    </section>
  );
};

const Narration = ({ text }) =>
  text ? (
    <p key={text} className="pointer-events-none mx-auto max-w-xl animate-rise-in rounded-xl bg-stage/85 px-4 py-3 text-center text-sm font-bold leading-relaxed text-white shadow-xl ring-1 ring-white/10 backdrop-blur">
      {text}
    </p>
  ) : null;

const ExplorePage = () => {
  const site = useToothSelection();
  const [narration, setNarration] = useState(null);
  // ?age=7 opens the mouth at that age, and ?layer=xray in that layer, for links and demos.
  const [params] = useSearchParams();
  const [store] = useState(() => {
    const age = Number(params.get("age"));
    const layer = params.get("layer");
    return createSceneStore({
      ...(params.has("age") && Number.isFinite(age) ? { age: Math.min(25, Math.max(0, age)) } : {}),
      ...(["gums", "bone", "roots", "teeth", "xray"].includes(layer) ? { layer } : {}),
    });
  });
  const group = site.primary && site.primary !== "multiple" ? dentalRegionGroup(site.primary, site.teeth) : null;
  const summary =
    site.teeth.length === 1
      ? `${site.teeth[0]} · ${toothById(site.teeth[0])?.label}`
      : site.all.length > 1
        ? `${site.all.length} sites`
        : dentalRegionById(site.primary)?.label;

  return (
    <SceneProvider store={store}>
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:py-8">
        <div className="lg:sticky lg:top-20 lg:self-start">
          <DentalViewer
            teeth={site.teeth}
            chart={site.chart}
            regions={site.regions}
            onPickTooth={site.pickTooth}
            onPickSurface={site.toggleSurface}
            onPickRegion={site.pickRegion}
            summary={summary}
            className="h-[min(74vh,680px)] min-h-[420px]"
            fallback={<p className="rounded-2xl border border-dashed border-ink-faint p-5 text-ink-soft">The 3D mouth needs WebGL. Use the tooth chart instead.</p>}
          >
            <Narration text={narration} />
            <AgeTimeline />
          </DentalViewer>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold">Explore the mouth</h1>
            <p className="mt-2 text-ink-soft">Click any tooth or site, or ask the AI tutor and watch it show you on the 3D mouth.</p>
          </div>
          <TutorPanel selected={site.teeth} onNarrate={setNarration} />
          <Odontogram teeth={site.teeth} chart={site.chart} active={site.active} onPick={site.pickTooth} />
          <ToothPicker selected={site.teeth} multi={site.multi} onPick={site.pickTooth} />
          {site.active && (
            <ToothPanel
              key={site.active}
              toothId={site.active}
              row={site.chart.find((r) => r.tooth === site.active)}
              onSurface={site.toggleSurface}
              onCondition={site.toggleCondition}
            />
          )}
          {group && <StudyNotes key={group} group={group} />}
        </div>
      </div>
    </SceneProvider>
  );
};

export default ExplorePage;
