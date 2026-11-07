import { FiX } from "react-icons/fi";
import CaseForm from "../CaseForm";
import DentalViewer from "./three/DentalViewer";
import Odontogram from "./Odontogram";
import ToothPanel from "./ToothPanel";
import ToothPicker from "./ToothPicker";
import { useToothSelection } from "./toothSelection";
import {
  DENTAL_INSIGHTS,
  DENTAL_REGIONS,
  DENTAL_STARTERS,
  chartRowLabel,
  dentalRegionById,
  dentalRegionGroup,
} from "../../data/dental";
import { toothById } from "../../data/teeth";

const Chip = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-ink py-1.5 pl-3.5 pr-1.5 font-bold text-white">
    <span className="h-2 w-2 rounded-full bg-sky" />
    {label}
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Remove ${label}`}
      className="rounded-full p-1 text-white/70 hover:bg-white/15 hover:text-white"
    >
      <FiX size={14} />
    </button>
  </span>
);

// Sites that are not teeth, for those with nothing to click on the model.
const OtherSites = ({ site }) => (
  <div>
    <p className="mb-1.5 text-sm font-bold text-ink-soft">Other sites</p>
    <div className="flex flex-wrap gap-1.5">
      {DENTAL_REGIONS.filter((r) => r.kind !== "quadrant").map((r) => {
        const on = site.regions.includes(r.id);
        return (
          <button
            key={r.id}
            type="button"
            aria-pressed={on}
            onClick={() => site.pickRegion(r.id)}
            className={`rounded-lg border px-2.5 py-1.5 text-sm font-bold transition-colors ${
              on ? "border-brand bg-brand-tint text-brand-dark" : "border-line bg-white text-ink-soft hover:border-ink-faint hover:text-ink"
            }`}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  </div>
);

const toothChipLabel = (site, id) => {
  const row = site.chart.find((r) => r.tooth === id);
  return row ? chartRowLabel(row) : `Tooth ${id} · ${toothById(id)?.label}`;
};

// What has been marked, with the switch between one site and several.
const SiteSummary = ({ site }) => {
  const empty = !site.teeth.length && !site.regions.length;
  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span id="site-mode" className="font-bold">
          Site
          {site.teeth.length > 1 && (
            <span className="ml-2 text-sm font-normal text-ink-soft">
              {site.teeth.length} teeth
            </span>
          )}
        </span>
        <div
          role="radiogroup"
          aria-labelledby="site-mode"
          className="inline-flex rounded-xl border border-line bg-white p-1 text-sm"
        >
          {[
            [false, "One site", site.oneSite],
            [true, "Multiple sites", site.severalSites],
          ].map(([multi, label, choose]) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={site.multi === multi}
              onClick={() => site.multi !== multi && choose()}
              className={`rounded-lg px-3 py-1.5 font-bold transition-colors ${
                site.multi === multi ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {site.teeth.map((id) => (
          <Chip key={id} label={toothChipLabel(site, id)} onRemove={() => site.remove(id)} />
        ))}
        {site.regions.map((id) => (
          <Chip key={id} label={dentalRegionById(id)?.label} onRemove={() => site.remove(id)} />
        ))}
        {empty && (
          <span className="rounded-full border border-dashed border-ink-faint px-4 py-2 text-ink-soft">
            {site.multi
              ? "Click each affected tooth or site on the 3D mouth"
              : "Mark the tooth or site on the 3D mouth"}
          </span>
        )}
      </div>
    </div>
  );
};

const Group = ({ title, items, tone }) => (
  <div>
    <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink-faint">{title}</p>
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li
          key={item}
          className={`rounded-lg px-2.5 py-1 text-sm ${
            tone === "test"
              ? "bg-brand-tint font-bold text-brand-dark"
              : tone === "consider"
                ? "border border-line bg-white text-ink"
                : "bg-bone text-ink-soft"
          }`}
        >
          {item}
        </li>
      ))}
    </ul>
  </div>
);

// Quick reference for the site marked on the model.
const DentalInsight = ({ group, title, className = "" }) => {
  const insight = DENTAL_INSIGHTS[group];
  if (!insight) return null;
  return (
    <section
      className={`animate-rise-in rounded-2xl border border-line bg-white p-4 sm:p-5 ${className}`}
      aria-label={`${title} reference`}
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-medium">{title}</h2>
        <span className="text-xs font-bold text-ink-faint">Site reference</span>
      </div>
      <div className="grid gap-4">
        <Group title="Key structures" items={insight.structures} />
        <Group title="Consider" items={insight.consider} tone="consider" />
        <Group title="Discriminating tests" items={insight.tests} tone="test" />
      </div>
    </section>
  );
};

const INSIGHT_TITLE = {
  teeth: "Tooth and pulp",
  third_molar: "Third molar",
  gingiva: "Gums and periodontium",
  mucosa: "Oral mucosa",
  jaw: "Jaw bones",
  tmj: "Temporomandibular joint",
};

const DentalCase = ({ onStart, busy, draft }) => {
  const site = useToothSelection(draft);
  const group = site.primary === "multiple" ? "multiple" : dentalRegionGroup(site.primary, site.teeth);
  const starters = group ? [...(DENTAL_STARTERS[group] || []), ...(group === "teeth" ? DENTAL_STARTERS.trauma : [])] : [];
  const summary = site.teeth.length === 1
    ? `Tooth ${site.teeth[0]} · ${toothById(site.teeth[0])?.label}`
    : site.all.length > 1
      ? `${site.all.length} sites selected`
      : dentalRegionById(site.primary)?.label;

  return (
    <CaseForm
      onStart={onStart}
      busy={busy}
      draft={draft}
      payload={site.payload}
      starters={starters}
      intro="Enter the patient basics, mark the tooth or site and describe the presentation. Paste a full history if you have one: the assistant only asks about the gaps."
      placeholder="e.g. Lingering pain to cold UL6 for 3 days, wakes at night, TTP. Large MOD amalgam. Cold test exaggerated and lingers."
      summary={<SiteSummary site={site} />}
      panel={
        <>
          <DentalViewer
            teeth={site.teeth}
            chart={site.chart}
            regions={site.regions}
            onPickTooth={site.pickTooth}
            onPickSurface={site.toggleSurface}
            onPickRegion={site.pickRegion}
            summary={summary}
            caption={site.multi ? "Click teeth or sites to add them · click again to remove" : undefined}
            className="h-[min(72vh,640px)] min-h-[440px]"
            fallback={
              <p className="rounded-2xl border border-dashed border-ink-faint p-5 text-ink-soft">
                The 3D mouth needs WebGL, which this device does not offer. Use the tooth chart below.
              </p>
            }
          />
          <Odontogram
            teeth={site.teeth}
            chart={site.chart}
            active={site.active}
            onPick={site.pickTooth}
            className="mt-4"
          />
          <div className="mt-4">
            <ToothPicker selected={site.teeth} multi={site.multi} onPick={site.pickTooth} />
          </div>
          <div className="mt-4">
            <OtherSites site={site} />
          </div>
          {site.active && (
            <ToothPanel
              key={site.active}
              toothId={site.active}
              row={site.chart.find((r) => r.tooth === site.active)}
              onSurface={site.toggleSurface}
              onCondition={site.toggleCondition}
              className="mt-4"
            />
          )}
          {group && group !== "multiple" && (
            <DentalInsight key={group} group={group} title={INSIGHT_TITLE[group]} className="mt-4" />
          )}
        </>
      }
    />
  );
};

export default DentalCase;
