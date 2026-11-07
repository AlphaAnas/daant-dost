import { useEffect, useMemo, useState } from "react";
import { FiCheck, FiSearch } from "react-icons/fi";
import { TOOTH_SECTIONS, TEETH, searchTeeth } from "../../data/teeth";

const LIST_ID = "tooth-picker-list";
const optionId = (id) => `tooth-option-${id}`;

// Search over all the teeth, grouped by quadrant, in the same keyboard model
// as BonePicker. With `multi` the list stays open for the next tooth.
const ToothPicker = ({ selected = [], multi, onPick }) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results = useMemo(
    () => searchTeeth(query, query.trim() ? {} : { dentition: "permanent" }),
    [query],
  );
  const groups = useMemo(
    () =>
      TOOTH_SECTIONS.map((s) => ({
        ...s,
        teeth: results.filter((t) => t.section === s.id),
      })).filter((g) => g.teeth.length),
    [results],
  );
  const ordered = useMemo(() => groups.flatMap((g) => g.teeth), [groups]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    if (!open) return;
    const tooth = ordered[active];
    if (tooth) document.getElementById(optionId(tooth.id))?.scrollIntoView({ block: "nearest" });
  }, [active, open, ordered]);

  const pick = (tooth) => {
    onPick(tooth.id);
    setQuery("");
    if (!multi) setOpen(false);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => Math.max(0, Math.min(ordered.length - 1, i + step)));
    } else if (e.key === "Enter" && open) {
      e.preventDefault();
      if (ordered[active]) pick(ordered[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
    return undefined;
  };

  const activeTooth = open ? ordered[active] : null;

  return (
    <div className="relative">
      <label htmlFor="tooth-search" className="mb-1 flex items-baseline justify-between gap-3 text-sm font-bold text-ink-soft">
        <span>Or search for a tooth</span>
        <span className="font-normal text-ink-faint">{TEETH.length} teeth, FDI numbering</span>
      </label>
      <div className="relative">
        <FiSearch aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          id="tooth-search"
          role="combobox"
          aria-expanded={open}
          aria-controls={LIST_ID}
          aria-autocomplete="list"
          aria-activedescendant={activeTooth ? optionId(activeTooth.id) : undefined}
          autoComplete="off"
          className="field pl-10"
          placeholder="e.g. 36, UL6, lower wisdom tooth, canine"
          value={query}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      {open && (
        <div
          // Keeps focus in the input so a click picks before blur closes it.
          onMouseDown={(e) => e.preventDefault()}
          className="absolute inset-x-0 z-30 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-line bg-white shadow-xl"
        >
          <ul id={LIST_ID} role="listbox" aria-label="Teeth">
            {groups.map((g) => (
              <li key={g.id} role="presentation">
                <p className="sticky top-0 bg-white/95 px-4 pb-1 pt-2.5 text-xs font-bold uppercase tracking-wider text-ink-faint backdrop-blur">
                  {g.label}
                </p>
                <ul role="presentation">
                  {g.teeth.map((t) => {
                    const chosen = selected.includes(t.id);
                    return (
                      <li
                        key={t.id}
                        id={optionId(t.id)}
                        role="option"
                        aria-selected={chosen}
                        onClick={() => pick(t)}
                        onMouseMove={() => setActive(ordered.indexOf(t))}
                        className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-2 ${
                          activeTooth?.id === t.id ? "bg-brand-tint" : ""
                        } ${chosen ? "font-bold text-brand-dark" : "text-ink"}`}
                      >
                        <span>
                          <span className="mr-2 font-bold tabular-nums">{t.id}</span>
                          {t.label}
                        </span>
                        {chosen && <FiCheck aria-hidden />}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
          {results.length === 0 && (
            <p className="px-4 py-3 text-ink-soft">No tooth matches “{query.trim()}”.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ToothPicker;
