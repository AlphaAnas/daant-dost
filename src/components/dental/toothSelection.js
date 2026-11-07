import { useState } from "react";
import { quadrantOf } from "../../data/dental";
import { toothById } from "../../data/teeth";

const toggle = (list, id) =>
  list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
const unique = (list) => [...new Set(list)];

// Every site marked: those picked directly, plus each tooth's quadrant.
export const dentalSites = (teeth, regions) =>
  unique([...regions, ...teeth.map(quadrantOf)]);

/**
 * The teeth and oral sites picked on the mouth, with what is charted on each
 * tooth. With one site a click replaces the selection; with several,
 * a click adds the tooth or site, and a second click removes it. `active` is
 * the tooth the chart panel is working on.
 */
export const useToothSelection = () => {
  const [multi, setMulti] = useState(false);
  const [teeth, setTeeth] = useState([]);
  const [regions, setRegions] = useState([]);
  const [chart, setChart] = useState([]);
  const [active, setActive] = useState(null);

  const editRow = (tooth, change) =>
    setChart((rows) => {
      const row = rows.find((r) => r.tooth === tooth) || { tooth, surfaces: [], conditions: [] };
      const next = change(row);
      const others = rows.filter((r) => r.tooth !== tooth);
      return next.surfaces.length || next.conditions.length ? [...others, next] : others;
    });

  const pickTooth = (id) => {
    if (!toothById(id)) return;
    if (!multi) {
      setTeeth([id]);
      setActive(id);
      setChart((rows) => rows.filter((r) => r.tooth === id));
      setRegions((list) => list.filter((r) => r === quadrantOf(id)));
      return;
    }
    const removing = teeth.includes(id);
    setTeeth((list) => toggle(list, id));
    if (removing) {
      setChart((rows) => rows.filter((r) => r.tooth !== id));
      setActive((a) => (a === id ? teeth.filter((t) => t !== id).at(-1) || null : a));
    } else {
      setActive(id);
    }
  };

  const pickRegion = (id) => {
    if (multi) {
      setRegions((list) => toggle(list, id));
      return;
    }
    setRegions([id]);
    const kept = teeth.filter((t) => quadrantOf(t) === id);
    setTeeth(kept);
    setChart((rows) => rows.filter((r) => kept.includes(r.tooth)));
    setActive(kept.at(-1) || null);
  };

  const toggleSurface = (tooth, surface) => {
    setActive(tooth);
    editRow(tooth, (row) => ({ ...row, surfaces: toggle(row.surfaces, surface) }));
  };

  const toggleCondition = (tooth, condition) =>
    editRow(tooth, (row) => ({ ...row, conditions: toggle(row.conditions, condition) }));

  // Back to one site: keep the last tooth picked, or else the last region.
  const oneSite = () => {
    setMulti(false);
    const last = teeth.at(-1);
    if (last) {
      setTeeth([last]);
      setActive(last);
      setChart((rows) => rows.filter((r) => r.tooth === last));
      setRegions((list) => list.filter((r) => r === quadrantOf(last)));
    } else {
      setRegions((list) => list.slice(-1));
    }
  };

  const remove = (id) => {
    setTeeth((list) => list.filter((t) => t !== id));
    setRegions((list) => list.filter((r) => r !== id));
    setChart((rows) => rows.filter((r) => r.tooth !== id));
    setActive((a) => (a === id ? teeth.filter((t) => t !== id).at(-1) || null : a));
  };

  const all = dentalSites(teeth, regions);
  const primary =
    all.length === 1 ? all[0] : all.length > 1 || multi ? "multiple" : null;

  return {
    multi,
    teeth,
    regions,
    chart,
    active,
    all,
    primary,
    setActive,
    pickTooth,
    pickRegion,
    toggleSurface,
    toggleCondition,
    oneSite,
    severalSites: () => setMulti(true),
    remove,
    clear: () => {
      setTeeth([]);
      setRegions([]);
      setChart([]);
      setActive(null);
    },
  };
};
